"""
Inference-time model definitions and preprocessing, ported directly from the
training notebooks (panorama-pdac-02, -03, -08, -09). These architectures and
constants must stay byte-for-byte identical to what the checkpoints were
trained with -- do not "clean up" a shape or a spacing value without checking
the corresponding notebook first, or the checkpoint's state_dict simply won't
load (or worse, will load with silently wrong assumptions).
"""

import numpy as np
import nibabel as nib
import torch
import torch.nn as nn
import torch.nn.functional as F
from scipy.ndimage import zoom, label

# ---------------------------------------------------------------------------
# Constants -- must match panorama-pdac-01 / -08 exactly (ct_cache preprocessing)
# ---------------------------------------------------------------------------
VOXEL_SPACING = (1.5, 1.5, 4.0)
VOLUME_SHAPE = (160, 160, 64)
HU_WINDOW = (-100, 300)

# Cascade crop geometry -- from Module 8h (corrected, no x-truncation)
CROP_MM = [236.0, 140.0, 160.0]
CROP_VOXELS_FULL = [int(round(CROP_MM[i] / VOXEL_SPACING[i])) for i in range(3)]
RADIUS_MM = 40.0
MARGIN_VOXELS = 10

# Clinical feature order -- MUST match build_clinical_features() column order
# exactly, or the classifier silently reads the wrong feature into the wrong
# slot. This list is fixed by the training notebooks; do not reorder.
CLINICAL_FEATURE_COLS = [
    'age_norm', 'age_missing',
    'sex_M', 'sex_F', 'sex_missing',
    'scanner_SIEMENS', 'scanner_TOSHIBA', 'scanner_Philips', 'scanner_GE', 'scanner_Canon',
    'scanner_missing',
]

# Youden's-index-optimal threshold for the production (DRO) classifier,
# computed on the held-out val split in Module 11 -- NOT the naive 0.5 cutoff.
DRO_YOUDEN_THRESHOLD = 0.697


# ---------------------------------------------------------------------------
# Preprocessing -- must match preprocess_ct from panorama-pdac-01 (v2, 160x160x64)
# ---------------------------------------------------------------------------
def preprocess_ct_volume(nii_path, target_spacing=VOXEL_SPACING, hu_window=HU_WINDOW, target_shape=VOLUME_SHAPE):
    """Raw uploaded CT (.nii/.nii.gz) -> normalized, resampled full-volume array.
    Identical logic to the cached ct_cache pipeline, applied on the fly here
    since a freshly-uploaded scan was never in that cache."""
    img = nib.load(nii_path)
    data = img.get_fdata().astype(np.float32)
    spacing = img.header.get_zooms()[:3]

    data = np.clip(data, hu_window[0], hu_window[1])
    data = (data - hu_window[0]) / (hu_window[1] - hu_window[0])

    zoom_factors = [spacing[i] / target_spacing[i] for i in range(3)]
    data = zoom(data, zoom_factors, order=1)

    out = np.zeros(target_shape, dtype=np.float32)
    src_shape = data.shape
    slicers = []
    for i in range(3):
        if src_shape[i] >= target_shape[i]:
            start = (src_shape[i] - target_shape[i]) // 2
            slicers.append(slice(start, start + target_shape[i]))
        else:
            slicers.append(slice(0, src_shape[i]))
    cropped = data[slicers[0], slicers[1], slicers[2]]
    out[:cropped.shape[0], :cropped.shape[1], :cropped.shape[2]] = cropped
    return out


def downsample_2x(vol):
    """Full-volume -> localizer input. (160,160,64) -> (80,80,32)."""
    d, h, w = vol.shape
    return vol.reshape(d // 2, 2, h // 2, 2, w // 2, 2).mean(axis=(1, 3, 5)).astype(np.float32)


# ---------------------------------------------------------------------------
# Localizer -- from panorama-pdac-08, Module 8d
# ---------------------------------------------------------------------------
class LightLocalizer(nn.Module):
    def __init__(self):
        super().__init__()
        def block(cin, cout):
            return nn.Sequential(nn.Conv3d(cin, cout, 3, stride=2, padding=1),
                                  nn.BatchNorm3d(cout), nn.ReLU(inplace=True))
        self.features = nn.Sequential(block(1, 16), block(16, 32), block(32, 64), block(64, 128))
        self.pool = nn.AdaptiveAvgPool3d(1)
        self.head = nn.Sequential(nn.Linear(128, 32), nn.ReLU(inplace=True), nn.Linear(32, 3), nn.Sigmoid())

    def forward(self, x):
        return self.head(self.pool(self.features(x)).flatten(1))


def denormalize_centroid(centroid_norm, shape):
    return [centroid_norm[i] * shape[i] for i in range(3)]


def crop_around_centroid(vol, centroid_vox, crop_voxels):
    out_shape = vol.shape
    slices = []
    for i in range(3):
        half = crop_voxels[i] // 2
        start = int(round(centroid_vox[i] - half))
        end = start + crop_voxels[i]
        if start < 0:
            end -= start
            start = 0
        if end > out_shape[i]:
            start -= (end - out_shape[i])
            end = out_shape[i]
        start = max(0, start)
        slices.append(slice(start, end))
    return vol[tuple(slices)], slices


def resize_to_96(vol, is_mask=False):
    t = torch.from_numpy(vol).float().unsqueeze(0).unsqueeze(0)
    mode = 'nearest' if is_mask else 'trilinear'
    kwargs = {} if is_mask else {'align_corners': False}
    return F.interpolate(t, size=(96, 96, 96), mode=mode, **kwargs).squeeze(0).squeeze(0).numpy()


def resize_mask_to_shape(mask_96, target_shape):
    t = torch.from_numpy(mask_96.astype(np.float32)).unsqueeze(0).unsqueeze(0)
    return F.interpolate(t, size=target_shape, mode='nearest').squeeze(0).squeeze(0).numpy().astype(np.uint8)


def union_within_radius_bbox(mask_native, offset, ref_centroid_full, voxel_spacing=VOXEL_SPACING, radius_mm=RADIUS_MM):
    labeled, n = label(mask_native)
    if n == 0:
        return None
    kept = []
    for cid in range(1, n + 1):
        coords = np.argwhere(labeled == cid)
        c_full = coords.mean(axis=0) + np.array([s.start for s in offset])
        dist_mm = np.linalg.norm((c_full - np.array(ref_centroid_full)) * np.array(voxel_spacing))
        if dist_mm <= radius_mm:
            kept.append(coords + np.array([s.start for s in offset]))
    if not kept:
        return None
    all_coords = np.concatenate(kept, axis=0)
    return all_coords.min(axis=0), all_coords.max(axis=0)


def run_cascade(vol_full, localizer, seg_model, device):
    """Full-volume CT -> (96,96,96) crop for the classifier, + the fine mask
    (for Grad-CAM / visualization) + the crop's slice bounds in the full volume."""
    vol_small = downsample_2x(vol_full)
    with torch.no_grad():
        x = torch.from_numpy(vol_small).unsqueeze(0).unsqueeze(0).to(device)
        centroid_norm = localizer(x).squeeze(0).cpu().numpy()
    centroid_vox = denormalize_centroid(centroid_norm, vol_full.shape)

    coarse_crop, coarse_slices = crop_around_centroid(vol_full, centroid_vox, CROP_VOXELS_FULL)
    coarse_96 = resize_to_96(coarse_crop, is_mask=False)
    with torch.no_grad():
        coarse_logits = seg_model(torch.from_numpy(coarse_96).unsqueeze(0).unsqueeze(0).to(device))
        coarse_pred_96 = torch.argmax(coarse_logits, dim=1)[0].cpu().numpy()
    coarse_pred_native = resize_mask_to_shape(coarse_pred_96, coarse_crop.shape)

    result = union_within_radius_bbox(coarse_pred_native, coarse_slices, centroid_vox)
    if result is None:
        # No confident coarse detection near the localizer's estimate -- fall back
        # to the coarse crop itself rather than failing the whole request.
        fine_crop = coarse_crop
        fine_slices = coarse_slices
    else:
        mins, maxs = result
        mins = np.maximum(np.array(mins) - MARGIN_VOXELS, 0)
        maxs = np.minimum(np.array(maxs) + MARGIN_VOXELS, vol_full.shape)
        fine_slices = tuple(slice(int(mins[i]), int(maxs[i])) for i in range(3))
        fine_crop = vol_full[fine_slices]

    fine_96 = resize_to_96(fine_crop, is_mask=False)
    with torch.no_grad():
        fine_logits = seg_model(torch.from_numpy(fine_96).unsqueeze(0).unsqueeze(0).to(device))
        fine_pred_96 = torch.argmax(fine_logits, dim=1)[0].cpu().numpy()

    return fine_96, fine_pred_96, fine_slices


# ---------------------------------------------------------------------------
# Fusion classifier -- from panorama-pdac-03 / -09 (feature-level fusion)
# ---------------------------------------------------------------------------
class CTEncoder(nn.Module):
    def __init__(self):
        super().__init__()
        self.net = nn.Sequential(
            nn.Conv3d(1, 16, 3, padding=1), nn.BatchNorm3d(16), nn.ReLU(inplace=True), nn.MaxPool3d(2),
            nn.Conv3d(16, 32, 3, padding=1), nn.BatchNorm3d(32), nn.ReLU(inplace=True), nn.MaxPool3d(2),
            nn.Conv3d(32, 64, 3, padding=1), nn.BatchNorm3d(64), nn.ReLU(inplace=True), nn.MaxPool3d(2),
            nn.Conv3d(64, 128, 3, padding=1), nn.BatchNorm3d(128), nn.ReLU(inplace=True), nn.MaxPool3d(2),
        )
        self.global_pool = nn.AdaptiveAvgPool3d(1)
        self.proj = nn.Linear(128, 128)

    def forward(self, x):
        x = self.net(x)
        x = self.global_pool(x).flatten(1)
        return self.proj(x)


class ClinicalEncoder(nn.Module):
    def __init__(self, in_dim=11):
        super().__init__()
        self.net = nn.Sequential(nn.Linear(in_dim, 64), nn.ReLU(inplace=True), nn.Dropout(0.2), nn.Linear(64, 32))

    def forward(self, x):
        return self.net(x)


class FeatureLevelFusionClassifier(nn.Module):
    def __init__(self, clinical_in_dim=11):
        super().__init__()
        self.ct_encoder = CTEncoder()
        self.clinical_encoder = ClinicalEncoder(clinical_in_dim)
        self.head = nn.Sequential(nn.Linear(160, 64), nn.ReLU(inplace=True), nn.Dropout(0.3), nn.Linear(64, 1))

    def forward(self, ct, clinical):
        ct_feat = self.ct_encoder(ct)
        clin_feat = self.clinical_encoder(clinical)
        fused = torch.cat([ct_feat, clin_feat], dim=1)
        return self.head(fused).squeeze(1)


def build_clinical_vector(age, sex, scanner):
    """Builds the 11-dim clinical feature vector in the EXACT column order
    CLINICAL_FEATURE_COLS expects, matching build_clinical_features() from
    every training notebook. `age` in years, `sex` 'M'/'F'/None, `scanner`
    one of the 5 known values or anything else (treated as unknown)."""
    vec = {c: 0.0 for c in CLINICAL_FEATURE_COLS}

    if age is None:
        vec['age_missing'] = 1.0
        vec['age_norm'] = 0.55  # training median fallback -- matches fillna(median) at train time
    else:
        vec['age_norm'] = float(age) / 100.0

    if sex == 'M':
        vec['sex_M'] = 1.0
    elif sex == 'F':
        vec['sex_F'] = 1.0
    else:
        vec['sex_missing'] = 1.0

    scanner_map = {
        'SIEMENS': 'scanner_SIEMENS',
        'TOSHIBA': 'scanner_TOSHIBA',
        'Philips': 'scanner_Philips',
        'GE MEDICAL SYSTEMS': 'scanner_GE',
        'Canon Medical Systems': 'scanner_Canon',
    }
    key = scanner_map.get(scanner)
    if key:
        vec[key] = 1.0
    else:
        vec['scanner_missing'] = 1.0

    return np.array([vec[c] for c in CLINICAL_FEATURE_COLS], dtype=np.float32)


# ---------------------------------------------------------------------------
# Grad-CAM -- from panorama-pdac-10, Module 10c
# ---------------------------------------------------------------------------
class GradCAM3D:
    def __init__(self, model, target_layer):
        self.model = model
        self.activations = None
        self.gradients = None
        target_layer.register_forward_hook(self._save_activation)
        target_layer.register_full_backward_hook(self._save_gradient)

    def _save_activation(self, module, input, output):
        self.activations = output.detach()

    def _save_gradient(self, module, grad_input, grad_output):
        self.gradients = grad_output[0].detach()

    def generate(self, ct, clinical):
        self.model.zero_grad()
        logit = self.model(ct, clinical)
        logit.backward()
        weights = self.gradients.mean(dim=(2, 3, 4), keepdim=True)
        cam = (weights * self.activations).sum(dim=1, keepdim=True)
        cam = F.relu(cam)
        cam = F.interpolate(cam, size=ct.shape[2:], mode='trilinear', align_corners=False)
        cam = cam.squeeze().cpu().numpy()
        cam = (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)
        return cam, torch.sigmoid(logit).item()