"""
AgroNex — Leaf Disease Detection REST API (Production)
Run dev:    python ml_service.py
Run prod:   gunicorn ml_service:app -w 1 --timeout 120
Endpoints:  POST /predict  (multipart/form-data, field: 'image')
            GET  /health
            GET  /classes
"""

import os
import io
import gc
import base64
import logging
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import cv2
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import albumentations as A
from albumentations.pytorch import ToTensorV2
import timm
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.cm as colormap

# ── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger(__name__)

# ── Config from env ────────────────────────────────────────────────────────────
BASE_DIR       = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH     = os.environ.get("MODEL_PATH", os.path.join(BASE_DIR, "best_model.pth"))
TTA_STEPS      = int(os.environ.get("TTA_STEPS", "3"))          # 3 for prod, 5 for accuracy
MAX_IMG_BYTES  = int(os.environ.get("MAX_IMG_MB", "10")) * 1024 * 1024
ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*")          # set to Vercel URL in prod

# ── Memory optimisation for Render free tier (512 MB RAM) ─────────────────────
DEVICE = "cpu"
torch.set_num_threads(1)
# NOTE: grad tracking is DISABLED globally for inference.
# GradCAM will locally re-enable it with `torch.enable_grad()`.
torch.set_grad_enabled(False)

# ── Model definition ───────────────────────────────────────────────────────────
class LeafDiseaseModel(nn.Module):
    def __init__(self, num_classes, backbone="tf_efficientnetv2_s", dropout=0.3):
        super().__init__()
        self.backbone = timm.create_model(backbone, pretrained=False, num_classes=0)
        feat = int(getattr(self.backbone, "num_features", 0))
        self.head = nn.Sequential(
            nn.Linear(feat, 512), nn.BatchNorm1d(512), nn.SiLU(), nn.Dropout(dropout),
            nn.Linear(512, 256),  nn.BatchNorm1d(256), nn.SiLU(), nn.Dropout(dropout / 2),
            nn.Linear(256, num_classes),
        )

    def forward(self, x):
        return self.head(self.backbone(x))


# ── GradCAM ────────────────────────────────────────────────────────────────────
class GradCAM:
    """Gradient-weighted Class Activation Mapping."""

    def __init__(self, model: nn.Module, target_layer: nn.Module):
        self.model = model
        self._acts: torch.Tensor | None = None
        self._grads: torch.Tensor | None = None
        target_layer.register_forward_hook(self._save_acts)
        target_layer.register_full_backward_hook(self._save_grads)

    def _save_acts(self, _m, _i, output):
        self._acts = output.detach()

    def _save_grads(self, _m, _gi, grad_output):
        self._grads = grad_output[0].detach()

    def __call__(self, tensor: torch.Tensor):
        """
        Must be called inside `torch.enable_grad()` context.
        Returns (cam_array, predicted_class_index).
        """
        self.model.eval()
        t = tensor.unsqueeze(0).requires_grad_(True)
        logits = self.model(t)
        cls = logits.argmax(1).item()
        self.model.zero_grad()
        logits[0, cls].backward()

        if self._grads is None or self._acts is None:
            raise RuntimeError("GradCAM hooks failed to capture data")

        w = self._grads.mean(dim=[2, 3], keepdim=True)
        cam = F.relu((w * self._acts).sum(1, keepdim=True))
        cam = F.interpolate(cam, tensor.shape[-2:], mode="bilinear", align_corners=False)
        cam = cam.squeeze().cpu().numpy()
        cam = (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)
        return cam, cls


# ── Load model ─────────────────────────────────────────────────────────────────
if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(
        f"Model not found at '{MODEL_PATH}'. "
        "Place best_model.pth in the ml_backend directory."
    )

log.info("Loading model from %s ...", MODEL_PATH)
ckpt     = torch.load(MODEL_PATH, map_location=DEVICE, weights_only=False)
classes  = ckpt["classes"]
cfg      = ckpt.get("cfg", {})
backbone = cfg.get("BACKBONE", "tf_efficientnetv2_s")
dropout  = cfg.get("DROPOUT", 0.3)
img_size = cfg.get("IMAGE_SIZE", 300)

model = LeafDiseaseModel(len(classes), backbone, dropout)
model.load_state_dict(ckpt["model_state"])
model.to(DEVICE).eval()
del ckpt  # free checkpoint memory
gc.collect()
log.info("Model ready: %d classes | device: %s | TTA steps: %d", len(classes), DEVICE.upper(), TTA_STEPS)

# GradCAM — attach to the last block of the backbone
try:
    target_layer = list(model.backbone.modules())[-2]
except Exception:
    target_layer = list(model.backbone.modules())[-3]
gcam = GradCAM(model, target_layer)

# ── Transforms ─────────────────────────────────────────────────────────────────
val_tf = A.Compose([
    A.Resize(img_size, img_size),
    A.Normalize(mean=(0.485, 0.456, 0.406), std=(0.229, 0.224, 0.225)),
    ToTensorV2(),
])
tta_tf = A.Compose([
    A.Resize(img_size, img_size),
    A.HorizontalFlip(p=0.5),
    A.RandomBrightnessContrast(brightness_limit=0.1, contrast_limit=0.1, p=0.5),
    A.Normalize(mean=(0.485, 0.456, 0.406), std=(0.229, 0.224, 0.225)),
    ToTensorV2(),
])

# ── Disease info lookup ────────────────────────────────────────────────────────
DISEASE_INFO: dict[str, dict] = {
    "rice__Bacterial_leaf_blight": {
        "details": "Caused by Xanthomonas oryzae pv. oryzae. Creates water-soaked lesions that turn yellow then white along leaf margins, severely reducing photosynthesis.",
        "preventive": "Use resistant varieties, avoid excessive nitrogen, maintain proper spacing, drain fields periodically, apply copper-based bactericides.",
        "severity": "critical",
    },
    "rice__Brown_spot": {
        "details": "Caused by Bipolaris oryzae. Forms brown oval lesions on leaves and grains, reducing plant vigor and grain quality significantly.",
        "preventive": "Apply balanced NPK fertilization, avoid water stress, use certified seeds, treat seeds with fungicides before planting.",
        "severity": "warning",
    },
    "rice__Leaf_smut": {
        "details": "Caused by Entyloma oryzae. Produces small, angular, black spots on leaf blades that may merge causing leaf death.",
        "preventive": "Rotate crops, use disease-free seeds, apply systemic fungicides, maintain field hygiene.",
        "severity": "warning",
    },
    "cotton__Bacterial_blight": {
        "details": "Caused by Xanthomonas citri pv. malvacearum. Creates angular water-soaked lesions that turn brown, causing defoliation and boll rot.",
        "preventive": "Plant resistant varieties, treat seeds with acid or chemicals, avoid overhead irrigation, apply copper-based bactericides.",
        "severity": "critical",
    },
    "cotton__curl_virus": {
        "details": "Cotton Leaf Curl Virus transmitted by whiteflies. Causes upward or downward leaf curling, thickening of veins, stunting growth.",
        "preventive": "Plant resistant varieties, control whitefly populations with systemic insecticides, remove affected plants, use reflective mulches.",
        "severity": "critical",
    },
    "cotton__fussarium_wilt": {
        "details": "Caused by Fusarium oxysporum. Causes yellowing and wilting, internal discoloration of stem vascular tissue.",
        "preventive": "Use resistant varieties, practice crop rotation (3+ years), treat seeds with biocontrol agents, improve soil drainage.",
        "severity": "critical",
    },
    "sugarcane__Bacterial_blight": {
        "details": "Caused by Acidovorax avenae. Produces water-soaked streaks that turn red-brown with yellow margins, reducing photosynthesis.",
        "preventive": "Use disease-free planting material, practice crop sanitation, apply copper-based bactericides, avoid mechanical injury.",
        "severity": "warning",
    },
    "sugarcane__Red_rot": {
        "details": "Caused by Colletotrichum falcatum. Internal reddening of stalk tissues with white patches, causing stalk rot and yield loss.",
        "preventive": "Plant disease-free resistant varieties, treat setts with fungicide, avoid waterlogging, practice crop rotation.",
        "severity": "critical",
    },
    "sugarcane__Yellow_leaf": {
        "details": "Caused by Sugarcane Yellow Leaf Virus (SCYLV) transmitted by aphids. Yellowing of midribs and leaf blades from tips.",
        "preventive": "Plant virus-free certified material, control aphid vectors, rogue infected plants, practice field sanitation.",
        "severity": "warning",
    },
}

HEALTHY_INFO = {
    "details": "No disease symptoms detected. Your crop appears healthy.",
    "preventive": "Continue current good agricultural practices. Monitor regularly for early signs of disease.",
    "severity": "healthy",
}

_DISEASE_INFO_LOWER = {k.lower(): v for k, v in DISEASE_INFO.items()}

def get_disease_info(label: str) -> dict:
    if "healthy" in label.lower():
        return HEALTHY_INFO
    return (
        DISEASE_INFO.get(label)
        or _DISEASE_INFO_LOWER.get(label.lower())
        or {
            "details": "A crop disease has been detected. Consult an agricultural expert.",
            "preventive": "Follow good agricultural practices and consult your local extension officer.",
            "severity": "warning",
        }
    )


def _fig_to_b64(fig) -> str:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight", dpi=72)   # lower DPI = smaller payload
    buf.seek(0)
    data = base64.b64encode(buf.read()).decode("utf-8")
    plt.close(fig)
    return data


# ── Flask app ──────────────────────────────────────────────────────────────────
app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_IMG_BYTES  # reject oversized uploads early

CORS(
    app,
    origins=ALLOWED_ORIGIN,
    methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "classes": len(classes), "device": DEVICE})


@app.route("/classes", methods=["GET"])
def get_classes():
    return jsonify({"classes": classes})


@app.route("/predict", methods=["POST"])
def predict():
    if "image" not in request.files:
        return jsonify({"error": "No image file provided"}), 400

    file = request.files["image"]
    if not file or file.filename == "":
        return jsonify({"error": "Empty file"}), 400

    # Validate MIME type
    if not file.content_type.startswith("image/"):
        return jsonify({"error": "File must be an image"}), 400

    try:
        img_bytes = file.read()
        pil_image = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        img_rgb   = np.array(pil_image)

        # ── TTA inference ──────────────────────────────────────────────────────
        all_probs = []
        for _ in range(TTA_STEPS):
            t = tta_tf(image=img_rgb)["image"].unsqueeze(0).to(DEVICE).float()
            # grad tracking is globally off; no_grad is redundant but kept for clarity
            with torch.no_grad():
                logits = model(t)
            all_probs.append(F.softmax(logits, dim=1).cpu().numpy()[0])
        avg_probs = np.mean(all_probs, axis=0)

        # ── Top predictions ────────────────────────────────────────────────────
        top5_idx   = avg_probs.argsort()[::-1][:5]
        pred_idx   = top5_idx[0]
        pred_label = classes[pred_idx]
        confidence = float(avg_probs[pred_idx])

        if "__" in pred_label:
            crop, raw_disease = pred_label.split("__", 1)
            disease = raw_disease.replace("_", " ")
        else:
            crop    = "unknown"
            disease = pred_label.replace("_", " ")

        top5 = [
            {
                "label":   classes[i],
                "score":   float(avg_probs[i]),
                "crop":    classes[i].split("__")[0] if "__" in classes[i] else "unknown",
                "disease": classes[i].split("__")[1].replace("_", " ") if "__" in classes[i] else classes[i],
            }
            for i in top5_idx
        ]

        # ── GradCAM ────────────────────────────────────────────────────────────
        gradcam_b64 = None
        try:
            t_val = val_tf(image=img_rgb)["image"].to(DEVICE).float()
            # Re-enable grad tracking ONLY for GradCAM
            with torch.enable_grad():
                cam, _ = gcam(t_val)

            heatmap_rgb = (colormap.get_cmap("jet")(cam)[:, :, :3] * 255).astype(np.uint8)
            img_resized = cv2.resize(img_rgb, (img_size, img_size))
            overlay     = (img_resized * 0.5 + heatmap_rgb * 0.5).astype(np.uint8)

            fig, axes = plt.subplots(1, 3, figsize=(9, 3))   # smaller figure
            for ax, im, title in zip(
                axes,
                [img_resized, heatmap_rgb, overlay],
                ["Original", "GradCAM", "Overlay"],
            ):
                ax.imshow(im)
                ax.set_title(title, fontweight="bold", fontsize=9)
                ax.axis("off")
            plt.suptitle("Model attention map", fontsize=9, style="italic")
            plt.tight_layout()
            gradcam_b64 = _fig_to_b64(fig)
        except Exception as gcam_err:
            log.warning("GradCAM failed (non-fatal): %s", gcam_err)

        # ── Cleanup ────────────────────────────────────────────────────────────
        del img_rgb, img_bytes, all_probs, pil_image
        gc.collect()

        info = get_disease_info(pred_label)

        return jsonify({
            "label":      pred_label,
            "score":      confidence,
            "crop":       crop,
            "disease":    disease,
            "confidence": confidence,
            "severity":   info["severity"],
            "details":    info["details"],
            "preventive": info["preventive"],
            "top5":       top5,
            "gradcam":    gradcam_b64,
            "device":     DEVICE,
        })

    except Exception as exc:
        log.error("Prediction error: %s", exc, exc_info=True)
        gc.collect()
        return jsonify({"error": "Prediction failed. Please try a different image."}), 500


# ── 413 handler for oversized uploads ─────────────────────────────────────────
@app.errorhandler(413)
def request_entity_too_large(_err):
    return jsonify({"error": f"Image too large. Maximum size is {MAX_IMG_BYTES // (1024*1024)} MB."}), 413


if __name__ == "__main__":
    log.info("Starting ML service on http://0.0.0.0:8000")
    app.run(host="0.0.0.0", port=8000, debug=False)
