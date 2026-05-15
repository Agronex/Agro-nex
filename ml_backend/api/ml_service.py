import io
import gc
import base64
import logging
import threading
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import cv2
import albumentations as A
from albumentations.pytorch import ToTensorV2
from PIL import Image
import timm
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.cm as colormap

from api.config import Config

log = logging.getLogger(__name__)

# Enforce CPU constraints globally
torch.set_num_threads(1)
torch.set_grad_enabled(False)

# Thread lock to prevent GradCAM hook collisions during concurrent requests
_inference_lock = threading.Lock()

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

class GradCAM:
    def __init__(self, model: nn.Module, target_layer: nn.Module):
        self.model = model
        self._acts = None
        self._grads = None
        target_layer.register_forward_hook(self._save_acts)
        target_layer.register_full_backward_hook(self._save_grads)

    def _save_acts(self, _m, _i, output):
        self._acts = output.detach()

    def _save_grads(self, _m, _gi, grad_output):
        self._grads = grad_output[0].detach()

    def __call__(self, tensor: torch.Tensor):
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
        
        # Safe normalization to avoid division by zero
        denominator = cam.max() - cam.min() + 1e-8
        cam = (cam - cam.min()) / denominator
        return cam, cls

class MLService:
    def __init__(self):
        self.model = None
        self.classes = []
        self.gcam = None
        self.val_tf = None
        self.tta_tf = None
        self.img_size = 300

    def load_model(self):
        log.info(f"Loading model from {Config.MODEL_PATH}")
        ckpt = torch.load(Config.MODEL_PATH, map_location=Config.DEVICE, weights_only=False)
        self.classes = ckpt["classes"]
        cfg = ckpt.get("cfg", {})
        
        backbone = cfg.get("BACKBONE", "tf_efficientnetv2_s")
        dropout = cfg.get("DROPOUT", 0.3)
        self.img_size = cfg.get("IMAGE_SIZE", 300)

        self.model = LeafDiseaseModel(len(self.classes), backbone, dropout)
        self.model.load_state_dict(ckpt["model_state"])
        self.model.to(Config.DEVICE).eval()
        
        del ckpt
        gc.collect()

        # Attach GradCAM to the last Convolutional layer
        target_layer = None
        for m in reversed(list(self.model.backbone.modules())):
            if isinstance(m, nn.Conv2d):
                target_layer = m
                break
        
        if target_layer is None:
            log.warning("Could not find a Conv2d layer for GradCAM.")
        else:
            self.gcam = GradCAM(self.model, target_layer)
        # Initialize Transforms
        self._init_transforms()
        log.info(f"Model ready: {len(self.classes)} classes | Device: {Config.DEVICE}")

    def _init_transforms(self):
        self.val_tf = A.Compose([
            A.Resize(self.img_size, self.img_size),
            A.Normalize(mean=(0.485, 0.456, 0.406), std=(0.229, 0.224, 0.225)),
            ToTensorV2(),
        ])
        self.tta_tf = A.Compose([
            A.Resize(self.img_size, self.img_size),
            A.HorizontalFlip(p=0.5),
            A.RandomBrightnessContrast(brightness_limit=0.1, contrast_limit=0.1, p=0.5),
            A.Normalize(mean=(0.485, 0.456, 0.406), std=(0.229, 0.224, 0.225)),
            ToTensorV2(),
        ])

    def predict(self, pil_image: Image.Image):
        """Thread-safe prediction pipeline."""
        with _inference_lock:
            img_rgb = np.array(pil_image)
            
            # TTA Inference
            all_probs = []
            for _ in range(Config.TTA_STEPS):
                t = self.tta_tf(image=img_rgb)["image"].unsqueeze(0).to(Config.DEVICE).float()
                with torch.no_grad():
                    logits = self.model(t)
                all_probs.append(F.softmax(logits, dim=1).cpu().numpy()[0])
            
            avg_probs = np.mean(all_probs, axis=0)
            top5_idx = avg_probs.argsort()[::-1][:5]
            
            # Extract Top 5
            top5 = [
                {
                    "label": self.classes[i],
                    "score": float(avg_probs[i]),
                    "crop": self.classes[i].split("__")[0] if "__" in self.classes[i] else "unknown",
                    "disease": self.classes[i].split("__")[1].replace("_", " ") if "__" in self.classes[i] else self.classes[i],
                }
                for i in top5_idx
            ]
            
            best_idx = top5_idx[0]
            pred_label = self.classes[best_idx]
            confidence = float(avg_probs[best_idx])

            # GradCAM Generation
            gradcam_b64 = None
            try:
                t_val = self.val_tf(image=img_rgb)["image"].to(Config.DEVICE).float()
                with torch.enable_grad():
                    cam, _ = self.gcam(t_val)

                heatmap_rgb = (colormap.get_cmap("jet")(cam)[:, :, :3] * 255).astype(np.uint8)
                img_resized = cv2.resize(img_rgb, (self.img_size, self.img_size))
                overlay = (img_resized * 0.5 + heatmap_rgb * 0.5).astype(np.uint8)

                fig, axes = plt.subplots(1, 3, figsize=(9, 3))
                for ax, im, title in zip(axes, [img_resized, heatmap_rgb, overlay], ["Original", "GradCAM", "Overlay"]):
                    ax.imshow(im)
                    ax.set_title(title, fontweight="bold", fontsize=9)
                    ax.axis("off")
                
                plt.suptitle("Model Attention Map", fontsize=9, style="italic")
                plt.tight_layout()
                
                buf = io.BytesIO()
                fig.savefig(buf, format="png", bbox_inches="tight", dpi=72)
                buf.seek(0)
                gradcam_b64 = base64.b64encode(buf.read()).decode("utf-8")
                plt.close(fig)
            except Exception as e:
                log.warning(f"GradCAM failed: {e}")

            return {
                "top5": top5,
                "best_label": pred_label,
                "confidence": confidence,
                "gradcam": gradcam_b64
            }