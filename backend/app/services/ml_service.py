import os
import uuid
from io import BytesIO

import numpy as np
import torch
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from app.models.inference import (
    LightLocalizer, FeatureLevelFusionClassifier, GradCAM3D,
    preprocess_ct_volume, run_cascade, build_clinical_vector,
    DRO_YOUDEN_THRESHOLD,
)

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "ml_models")
LOCALIZER_CKPT = os.path.join(MODEL_DIR, "localizer_checkpoint.pth")
SEG_CKPT = os.path.join(MODEL_DIR, "swinunetr_finetuned_best.pth")
FUSION_CKPT = os.path.join(MODEL_DIR, "fusion_dro_checkpoint.pth")
SHAP_BACKGROUND_PATH = os.path.join(MODEL_DIR, "shap_background.npy")

UPLOADS_ROOT = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "uploads")
GRADCAM_OUTPUT_DIR = os.path.join(UPLOADS_ROOT, "gradcam")
SEGMENTATION_OUTPUT_DIR = os.path.join(UPLOADS_ROOT, "segmentation")
CT_SLICES_OUTPUT_DIR = os.path.join(UPLOADS_ROOT, "ct_slices")
for d in (GRADCAM_OUTPUT_DIR, SEGMENTATION_OUTPUT_DIR, CT_SLICES_OUTPUT_DIR):
    os.makedirs(d, exist_ok=True)

CLINICAL_FEATURE_COLS = [
    'age_norm', 'age_missing', 'sex_M', 'sex_F', 'sex_missing',
    'scanner_SIEMENS', 'scanner_TOSHIBA', 'scanner_Philips',
    'scanner_GE', 'scanner_Canon', 'scanner_missing'
]

# Human-readable labels for the raw feature names — module-level, shared by the narrative function
SHAP_FEATURE_LABELS = {
    "age_norm": "the patient's age", "age_missing": "missing age data",
    "sex_M": "the patient being male", "sex_F": "the patient being female",
    "sex_missing": "missing sex data",
    "scanner_SIEMENS": "the scan being taken on a Siemens scanner",
    "scanner_TOSHIBA": "the scan being taken on a Toshiba scanner",
    "scanner_Philips": "the scan being taken on a Philips scanner",
    "scanner_GE": "the scan being taken on a GE scanner",
    "scanner_Canon": "the scan being taken on a Canon scanner",
    "scanner_missing": "missing scanner information",
}


def generate_shap_narrative(shap_values):
    """
    Converts raw SHAP feature contributions into a plain-English explanation
    a clinician can read directly, instead of a table of variable names.
    Standalone function (not a class method) since it needs no model state.
    """
    if not shap_values:
        return "Clinical feature explanation is not available for this case."

    total_abs_shift = sum(abs(v["value"]) for v in shap_values)
    ranked = sorted(shap_values, key=lambda v: abs(v["value"]), reverse=True)
    top = [v for v in ranked if abs(v["value"]) >= 0.005][:2]

    if total_abs_shift < 0.02:
        lead = (
            "This prediction was driven almost entirely by the CT scan itself — "
            "the patient's age, sex, and scanner had very little effect on the result."
        )
    elif total_abs_shift < 0.08:
        lead = (
            "This prediction was mainly driven by the CT scan, with a small additional "
            "influence from the patient's clinical details."
        )
    else:
        lead = (
            "Clinical details played a meaningful role in this prediction, alongside the CT scan — "
            "worth reviewing the imaging findings carefully rather than relying on the score alone."
        )

    if not top:
        detail = "No individual clinical factor stood out as a notable influence."
    else:
        parts = []
        for item in top:
            label = SHAP_FEATURE_LABELS.get(item["feature"], item["feature"])
            direction = "raised" if item["value"] > 0 else "lowered"
            parts.append(f"{label} slightly {direction} the predicted risk")
        detail = " and ".join(parts).capitalize() + "."

    return f"{lead} {detail}"


class MLService:
    """
    Loads all three trained models once at startup and runs the full,
    genuinely-automated pipeline on a fresh upload:
        raw CT -> preprocess -> localizer -> cascade crop (fine-tuned SwinUNETR)
        -> clinical feature vector -> fusion classifier -> Youden threshold
        -> Grad-CAM overlay + segmentation overlay + CT slices + per-case SHAP
    """

    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.ready = False
        self.load_error = None
        self.shap_background = None
        try:
            self._load_models()
            self.ready = True
        except Exception as e:
            self.load_error = str(e)
            print(f"[ml_service] MODELS NOT LOADED -- predictions will fail until fixed: {e}")

        if os.path.exists(SHAP_BACKGROUND_PATH):
            self.shap_background = np.load(SHAP_BACKGROUND_PATH)
            print(f"[ml_service] SHAP background loaded: {self.shap_background.shape}")
        else:
            print(f"[ml_service] No SHAP background found at {SHAP_BACKGROUND_PATH} -- "
                  f"per-case SHAP panel will be skipped until it's added.")

    def _load_models(self):
        self.localizer = LightLocalizer().to(self.device)
        loc_ckpt = torch.load(LOCALIZER_CKPT, map_location=self.device, weights_only=False)
        self.localizer.load_state_dict(loc_ckpt["model_state"])
        self.localizer.eval()

        from monai.networks.nets import SwinUNETR
        self.seg_model = SwinUNETR(in_channels=1, out_channels=2, feature_size=24).to(self.device)
        seg_ckpt = torch.load(SEG_CKPT, map_location=self.device, weights_only=False)
        self.seg_model.load_state_dict(seg_ckpt["model_state"])
        self.seg_model.eval()

        self.fusion_model = FeatureLevelFusionClassifier(clinical_in_dim=11).to(self.device)
        fusion_ckpt = torch.load(FUSION_CKPT, map_location=self.device, weights_only=False)
        self.fusion_model.load_state_dict(fusion_ckpt["model_state"])
        self.fusion_model.eval()

        self.gradcam = GradCAM3D(self.fusion_model, self.fusion_model.ct_encoder.net[12])

        print(f"[ml_service] All models loaded on {self.device}. "
              f"Localizer epoch={loc_ckpt.get('epoch')}, "
              f"seg val_loss={seg_ckpt.get('best_val_loss', seg_ckpt.get('val_loss'))}, "
              f"fusion overall_auc={fusion_ckpt.get('overall_auc', fusion_ckpt.get('val_auc'))}, "
              f"fusion worst_group_auc={fusion_ckpt.get('worst_group_auc')}, "
              f"fusion epoch={fusion_ckpt.get('epoch')}")

    def predict(self, ct_filepath: str, age, sex: str, scanner: str):
        if not self.ready:
            raise RuntimeError(
                f"Models are not loaded -- cannot run inference. "
                f"Check {MODEL_DIR} contains the three checkpoint files. "
                f"Load error: {self.load_error}"
            )
        if ct_filepath.lower().endswith(".dcm"):
            raise ValueError(
                "DICOM (.dcm) upload is accepted by the API but not yet supported by the "
                "inference pipeline, which was trained exclusively on NIfTI volumes. "
                "Convert to .nii.gz before upload, or ask about adding DICOM support."
            )

        vol_full = preprocess_ct_volume(ct_filepath)
        fine_96, fine_mask_96, fine_slices = run_cascade(vol_full, self.localizer, self.seg_model, self.device)
        clinical_vec = build_clinical_vector(age, sex, scanner)

        ct_t = torch.from_numpy(fine_96).unsqueeze(0).unsqueeze(0).to(self.device)
        clin_t = torch.from_numpy(clinical_vec).unsqueeze(0).to(self.device)

        cam, prediction = self.gradcam.generate(ct_t, clin_t)

        gradcam_path = self._save_gradcam_overlay(fine_96, cam)
        segmentation_path = self._save_segmentation_overlay(fine_96, fine_mask_96)
        ct_slices_info = self._save_ct_slices(fine_96)
        shap_values = self._compute_shap_for_case(ct_t, clinical_vec)
        shap_explanation = generate_shap_narrative(shap_values)

        diff = abs(prediction - DRO_YOUDEN_THRESHOLD)
        confidence_label = "borderline" if diff < 0.05 else ("moderate" if diff < 0.15 else "high")
        referral_pathway_hint = "tissue-confirmed" if prediction >= DRO_YOUDEN_THRESHOLD else "radiology"

        return {
            "prediction": float(prediction),
            "gradcam_path": gradcam_path,
            "segmentation_path": segmentation_path,
            "ct_slices": ct_slices_info,
            "shap_values": shap_values,
            "shap_explanation": shap_explanation,
            "confidence_label": confidence_label,
            "threshold": DRO_YOUDEN_THRESHOLD,
            "referral_pathway_hint": referral_pathway_hint,
        }

    def _save_gradcam_overlay(self, ct_96, cam):
        mid_z = ct_96.shape[2] // 2
        fig, ax = plt.subplots(figsize=(4, 4))
        ax.imshow(ct_96[:, :, mid_z], cmap="gray")
        ax.imshow(cam[:, :, mid_z], cmap="jet", alpha=0.4)
        ax.axis("off")
        buf = BytesIO()
        plt.savefig(buf, format="png", bbox_inches="tight", pad_inches=0, dpi=110)
        plt.close(fig)
        buf.seek(0)
        filename = f"{uuid.uuid4().hex[:12]}.png"
        out_path = os.path.join(GRADCAM_OUTPUT_DIR, filename)
        with open(out_path, "wb") as f:
            f.write(buf.getvalue())
        return os.path.join("uploads", "gradcam", filename)

    def _save_segmentation_overlay(self, ct_96, mask_96):
        mid_z = ct_96.shape[2] // 2
        fig, ax = plt.subplots(figsize=(4, 4))
        ax.imshow(ct_96[:, :, mid_z], cmap="gray")
        try:
            ax.contour(mask_96[:, :, mid_z] > 0.5, colors="lime", linewidths=1.5)
        except Exception:
            pass  # empty/degenerate mask on this slice -- still show the CT
        ax.axis("off")
        buf = BytesIO()
        plt.savefig(buf, format="png", bbox_inches="tight", pad_inches=0, dpi=110)
        plt.close(fig)
        buf.seek(0)
        filename = f"{uuid.uuid4().hex[:12]}.png"
        out_path = os.path.join(SEGMENTATION_OUTPUT_DIR, filename)
        with open(out_path, "wb") as f:
            f.write(buf.getvalue())
        return os.path.join("uploads", "segmentation", filename)

    def _save_ct_slices(self, ct_96):
        case_id = uuid.uuid4().hex[:12]
        out_dir = os.path.join(CT_SLICES_OUTPUT_DIR, case_id)
        os.makedirs(out_dir, exist_ok=True)
        n_slices = ct_96.shape[2]
        for z in range(n_slices):
            fig, ax = plt.subplots(figsize=(4, 4))
            ax.imshow(ct_96[:, :, z], cmap="gray")
            ax.axis("off")
            plt.savefig(os.path.join(out_dir, f"slice_{z}.png"),
                        bbox_inches="tight", pad_inches=0, dpi=110)
            plt.close(fig)
        return {
            "base_path": os.path.join("uploads", "ct_slices", case_id),
            "n_slices": n_slices,
            "mid_slice": n_slices // 2,
        }

    def _compute_shap_for_case(self, ct_t, clinical_vec):
        if self.shap_background is None:
            return None
        try:
            import shap

            with torch.no_grad():
                ct_feat_fixed = self.fusion_model.ct_encoder(ct_t)  # (1, 128) -- computed once

            def predict_fn(clinical_batch):
                batch_size = clinical_batch.shape[0]
                clin_t = torch.from_numpy(clinical_batch).float().to(self.device)
                with torch.no_grad():
                    clin_feat = self.fusion_model.clinical_encoder(clin_t)
                    ct_feat_rep = ct_feat_fixed.repeat(batch_size, 1)
                    fused = torch.cat([ct_feat_rep, clin_feat], dim=1)
                    logits = self.fusion_model.head(fused).squeeze(-1)
                    probs = torch.sigmoid(logits)
                return probs.cpu().numpy()

            explainer = shap.KernelExplainer(predict_fn, self.shap_background)
            sv = explainer.shap_values(clinical_vec.reshape(1, -1), nsamples=50, silent=True)[0]
            return [{"feature": f, "value": float(v)} for f, v in zip(CLINICAL_FEATURE_COLS, sv)]
        except Exception as e:
            print(f"[ml_service] SHAP computation failed (non-fatal): {e}")
            return None


ml_service = MLService()