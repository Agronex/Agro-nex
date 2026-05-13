"""
AgroNex — Leaf Disease Detection REST API
Run: python ml_service.py
Requires: pip install -r requirements.txt
Serves: POST /predict  (multipart/form-data with 'image' field)
        GET  /health
        GET  /classes
"""

import os
import io
import json
import base64
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

# ── Paths ──────────────────────────────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "best_model.pth")

# ── Model definition (must match training) ─────────────────────────────────────
class LeafDiseaseModel(nn.Module):
    def __init__(self, num_classes, backbone="tf_efficientnetv2_s", dropout=0.3):
        super().__init__()
        self.backbone = timm.create_model(backbone, pretrained=False, num_classes=0)
        feat = self.backbone.num_features
        self.head = nn.Sequential(
            nn.Linear(feat, 512), nn.BatchNorm1d(512), nn.SiLU(), nn.Dropout(dropout),
            nn.Linear(512, 256),  nn.BatchNorm1d(256), nn.SiLU(), nn.Dropout(dropout / 2),
            nn.Linear(256, num_classes),
        )

    def forward(self, x):
        return self.head(self.backbone(x))


# ── GradCAM ────────────────────────────────────────────────────────────────────
class GradCAM:
    def __init__(self, model, target_layer):
        self.grads = self.acts = None
        target_layer.register_forward_hook(lambda m, i, o: setattr(self, "acts", o.detach()))
        target_layer.register_full_backward_hook(lambda m, gi, go: setattr(self, "grads", go[0].detach()))
        self.model = model

    def __call__(self, tensor):
        self.model.eval()
        t = tensor.unsqueeze(0).requires_grad_(True)
        logits = self.model(t)
        cls = logits.argmax(1).item()
        self.model.zero_grad()
        logits[0, cls].backward()
        w = self.grads.mean(dim=[2, 3], keepdim=True)
        cam = F.relu((w * self.acts).sum(1, keepdim=True))
        cam = F.interpolate(cam, tensor.shape[-2:], mode="bilinear", align_corners=False)
        cam = cam.squeeze().cpu().numpy()
        cam = (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)
        return cam, cls


# ── Load model ─────────────────────────────────────────────────────────────────
import gc
DEVICE = "cpu"  # Force CPU since Render free tier has no GPU
print(f"[ML Service] Using device: {DEVICE}")

# Memory optimization for Render's 512MB limit
torch.set_num_threads(1)
torch.set_grad_enabled(False)

if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(
        f"'{MODEL_PATH}' not found. Place best_model.pth in ML_model/ directory."
    )

print(f"[ML Service] Loading model from {MODEL_PATH}...")
ckpt      = torch.load(MODEL_PATH, map_location=DEVICE, weights_only=False)
classes   = ckpt["classes"]
cfg_dict  = ckpt.get("cfg", {})
backbone  = cfg_dict.get("BACKBONE", "tf_efficientnetv2_s")
dropout   = cfg_dict.get("DROPOUT", 0.3)
img_size  = cfg_dict.get("IMAGE_SIZE", 300)

model = LeafDiseaseModel(len(classes), backbone, dropout)
model.load_state_dict(ckpt["model_state"])
model.to(DEVICE).eval()
print(f"[ML Service] Model loaded: {len(classes)} classes")

# GradCAM target layer
try:
    target_layer = model.backbone.blocks[-1][-1]
except Exception:
    target_layer = list(model.backbone.modules())[-3]
gcam = GradCAM(model, target_layer)

# ── Transforms ─────────────────────────────────────────────────────────────────
val_tf = A.Compose([
    A.Resize(img_size, img_size),
    A.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ToTensorV2(),
])
tta_tf = A.Compose([
    A.Resize(img_size, img_size),
    A.HorizontalFlip(p=0.5),
    A.RandomBrightnessContrast(brightness_limit=0.1, contrast_limit=0.1, p=0.5),
    A.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ToTensorV2(),
])

# ── Disease info lookup ─────────────────────────────────────────────────────────
DISEASE_INFO = {
    # Rice diseases
    "rice__Bacterial_leaf_blight": {
        "details": "Caused by Xanthomonas oryzae pv. oryzae. Creates water-soaked lesions that turn yellow then white along leaf margins, severely reducing photosynthesis.",
        "preventive": "Use resistant varieties, avoid excessive nitrogen, maintain proper spacing, drain fields periodically, apply copper-based bactericides.",
        "severity": "critical"
    },
    "rice__Brown_spot": {
        "details": "Caused by Bipolaris oryzae. Forms brown oval lesions on leaves and grains, reducing plant vigor and grain quality significantly.",
        "preventive": "Apply balanced NPK fertilization, avoid water stress, use certified seeds, treat seeds with fungicides before planting.",
        "severity": "warning"
    },
    "rice__Leaf_smut": {
        "details": "Caused by Entyloma oryzae. Produces small, angular, black spots on leaf blades that may merge causing leaf death.",
        "preventive": "Rotate crops, use disease-free seeds, apply systemic fungicides, maintain field hygiene.",
        "severity": "warning"
    },
    # Cotton diseases
    "cotton__Bacterial_blight": {
        "details": "Caused by Xanthomonas citri pv. malvacearum. Creates angular water-soaked lesions on leaves that turn brown, causing defoliation and boll rot.",
        "preventive": "Plant resistant varieties, treat seeds with acid or chemicals, avoid overhead irrigation, apply copper-based bactericides.",
        "severity": "critical"
    },
    "cotton__curl_virus": {
        "details": "Cotton Leaf Curl Virus transmitted by whiteflies. Causes upward or downward leaf curling, thickening of veins, and enations on undersurface, stunting growth.",
        "preventive": "Plant resistant varieties, control whitefly populations with systemic insecticides, remove and destroy affected plants, use reflective mulches.",
        "severity": "critical"
    },
    "cotton__fussarium_wilt": {
        "details": "Caused by Fusarium oxysporum f.sp. vasinfectum. Causes yellowing and wilting of leaves, internal discoloration of stem vascular tissue.",
        "preventive": "Use resistant varieties, practice crop rotation (3+ years), treat seeds with biocontrol agents, improve soil drainage, avoid waterlogging.",
        "severity": "critical"
    },
    # Sugarcane diseases
    "sugarcane__Bacterial_blight": {
        "details": "Caused by Acidovorax avenae. Produces water-soaked streaks on leaves that turn red-brown with yellow margins, reducing photosynthesis.",
        "preventive": "Use disease-free planting material, practice crop sanitation, apply copper-based bactericides, avoid mechanical injury.",
        "severity": "warning"
    },
    "sugarcane__Red_rot": {
        "details": "Caused by Colletotrichum falcatum. Internal reddening of stalk tissues with white patches, causing stalk rot, yield loss and poor juice quality.",
        "preventive": "Plant disease-free resistant varieties, treat setts with fungicide before planting, avoid waterlogging, practice crop rotation.",
        "severity": "critical"
    },
    "sugarcane__Yellow_leaf": {
        "details": "Caused by Sugarcane Yellow Leaf Virus (SCYLV) transmitted by aphids. Yellowing of midribs and leaf blades starting from leaf tips.",
        "preventive": "Plant virus-free certified planting material, control aphid vectors, roguing of infected plants, practice field sanitation.",
        "severity": "warning"
    },
}

HEALTHY_INFO = {
    "details": "No disease symptoms detected. Your crop appears healthy.",
    "preventive": "Continue current good agricultural practices. Monitor regularly for early signs of disease.",
    "severity": "healthy"
}

def get_disease_info(label: str) -> dict:
    """Get disease information for a given label."""
    if "healthy" in label.lower():
        return HEALTHY_INFO
    # Try exact match first
    if label in DISEASE_INFO:
        return DISEASE_INFO[label]
    # Try case-insensitive partial match
    label_lower = label.lower()
    for key, val in DISEASE_INFO.items():
        if key.lower() == label_lower:
            return val
    return {
        "details": "A crop disease has been detected. Please consult an agricultural expert.",
        "preventive": "Follow good agricultural practices, consult your local agricultural extension officer.",
        "severity": "warning"
    }


def fig_to_base64(fig) -> str:
    """Convert matplotlib figure to base64 PNG string."""
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight", dpi=100)
    buf.seek(0)
    img_b64 = base64.b64encode(buf.read()).decode("utf-8")
    plt.close(fig)
    return img_b64


# ── Flask App ───────────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)  # Allow requests from React dev server


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
    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    try:
        # Read image
        img_bytes = file.read()
        pil_image = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        img_rgb = np.array(pil_image)

        # TTA inference (5 steps)
        tta_steps = 5
        all_probs = []
        for _ in range(tta_steps):
            t = tta_tf(image=img_rgb)["image"].unsqueeze(0).to(DEVICE).float()
            with torch.no_grad():
                logits = model(t)
            all_probs.append(F.softmax(logits, dim=1).cpu().numpy()[0])
        avg_probs = np.mean(all_probs, axis=0)

        # Top-5 predictions
        top5_idx   = avg_probs.argsort()[::-1][:5]
        pred_idx   = top5_idx[0]
        pred_label = classes[pred_idx]
        confidence = float(avg_probs[pred_idx])

        # Parse crop and disease from label (format: crop__Disease_Name)
        if "__" in pred_label:
            crop    = pred_label.split("__")[0]
            disease = pred_label.split("__")[1].replace("_", " ")
        else:
            crop    = "unknown"
            disease = pred_label.replace("_", " ")

        # Top-5 formatted
        top5 = [
            {
                "label": classes[i],
                "score": float(avg_probs[i]),
                "crop": classes[i].split("__")[0] if "__" in classes[i] else "unknown",
                "disease": classes[i].split("__")[1].replace("_", " ") if "__" in classes[i] else classes[i],
            }
            for i in top5_idx
        ]

        # GradCAM heatmap
        gradcam_b64 = None
        try:
            t_val = val_tf(image=img_rgb)["image"].to(DEVICE).float()
            cam, _ = gcam(t_val)
            heatmap_rgb = colormap.get_cmap("jet")(cam)[:, :, :3]
            heatmap_rgb = (heatmap_rgb * 255).astype(np.uint8)
            img_resized = cv2.resize(img_rgb, (img_size, img_size))
            overlay = (img_resized * 0.5 + heatmap_rgb * 0.5).astype(np.uint8)

            fig, axes = plt.subplots(1, 3, figsize=(12, 4))
            for ax, im, title in zip(
                axes,
                [img_resized, heatmap_rgb, overlay],
                ["Original", "GradCAM", "Overlay"]
            ):
                ax.imshow(im)
                ax.set_title(title, fontweight="bold", fontsize=11)
                ax.axis("off")
            plt.suptitle("Attention Map — Regions the model focused on", fontsize=10, style="italic")
            plt.tight_layout()
            gradcam_b64 = fig_to_base64(fig)
        except Exception as e:
            print(f"[GradCAM] Warning: {e}")

        # Disease info
        info = get_disease_info(pred_label)

        response = {
            "label":     pred_label,
            "score":     confidence,
            "crop":      crop,
            "disease":   disease,
            "confidence": confidence,
            "severity":  info["severity"],
            "details":   info["details"],
            "preventive": info["preventive"],
            "top5":      top5,
            "gradcam":   gradcam_b64,
            "device":    DEVICE,
        }

        return jsonify(response)

    except Exception as e:
        print(f"[ML Service] Prediction error: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    print(f"[ML Service] Starting on http://localhost:8000")
    print(f"[ML Service] Model: {len(classes)} classes | Device: {DEVICE.upper()}")
    app.run(host="0.0.0.0", port=8000, debug=False)
