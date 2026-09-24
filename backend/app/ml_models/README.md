
# Model checkpoints go here

This folder is not committed with weights (too large for git) — copy these
three files here before starting the backend. Filenames must match exactly,
or `ml_service.py` won't find them.

| File                             | Source (Kaggle dataset)                                                               | Notebook |
| -------------------------------- | ------------------------------------------------------------------------------------- | -------- |
| `localizer_checkpoint.pth`     | `panorama-cascade-pipeline-ckpt` or `panorama-cascade-critical-ckpt`              | 08       |
| `swinunetr_finetuned_best.pth` | same as above                                                                         | 08       |
| `fusion_dro_checkpoint.pth`    | **rename** whichever DRO checkpoint you saved in Module 9/12 to this exact name | 09 / 12  |

If the app starts but every upload fails with "Models are not loaded," check
the server startup log for `[ml_service] MODELS NOT LOADED` — it prints the
exact underlying error (missing file, key mismatch, etc.).

## Before trusting this in production: run the crop-scale validation

The fusion classifier was trained on crops from the *old* pipeline
(`autocrop_cache`, itself built from ground-truth-cropped `ct_mask_cache`).
The cascade wired into `ml_service.py` produces crops from a *different*
pipeline (localizer + fine-tuned SwinUNETR, Module 8's fix). Nobody has yet
confirmed these two crop styles look similar enough to the classifier that
its offline AUC (0.877 / 0.813) still holds when fed a cascade crop instead
of an autocrop_cache crop.

Run `scripts/validate_crop_scale_match.py` (in a Kaggle/Colab session with
both caches and all three checkpoints attached) on a handful of held-out
cases before considering this pipeline production-ready. See that script's
docstring for what a pass/fail result looks like.
