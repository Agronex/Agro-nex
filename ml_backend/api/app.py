import io
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image, UnidentifiedImageError

from api.config import Config
from api.ml_service import MLService
from api.disease import get_disease_info

log = logging.getLogger(__name__)

# Initialize ML Service globally so it loads once per worker process
ml_service = MLService()

def create_app():
    Config.setup_logging()
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app, origins=Config.ALLOWED_ORIGIN, methods=["GET", "POST", "OPTIONS"])

    # Load model on startup
    try:
        ml_service.load_model()
    except Exception as e:
        log.error(f"Failed to load model during startup: {e}")
        # In a real cluster, you might want this to raise so the pod fails and restarts
        # raise e

    @app.route("/health", methods=["GET"])
    def health():
        if not ml_service.model:
            return jsonify({"status": "degraded", "error": "Model not loaded"}), 503
        return jsonify({"status": "ok", "classes": len(ml_service.classes), "device": Config.DEVICE})

    @app.route("/predict", methods=["POST"])
    def predict():
        if "image" not in request.files:
            return jsonify({"error": "No image field provided"}), 400

        file = request.files["image"]
        if not file or file.filename == "":
            return jsonify({"error": "Empty file provided"}), 400

        # Robust Validation: Try to open via PIL to ensure it's a valid image
        try:
            img_bytes = file.read()
            pil_image = Image.open(io.BytesIO(img_bytes)).convert("RGB")
            # Verify fully decodes the image (protects against zip-bombs/malformed files)
            pil_image.verify() 
            # Re-open because verify() closes the file pointer
            pil_image = Image.open(io.BytesIO(img_bytes)).convert("RGB") 
        except (UnidentifiedImageError, IOError):
            return jsonify({"error": "Invalid or corrupted image file"}), 400

        try:
            results = ml_service.predict(pil_image)
            disease_info = get_disease_info(results["best_label"])

            # Merge ML results with Disease Knowledge Base
            response_payload = {
                "label": results["best_label"],
                "score": results["confidence"],
                "crop": results["top5"][0]["crop"],
                "disease": results["top5"][0]["disease"],
                "severity": disease_info["severity"],
                "details": disease_info["details"],
                "preventive": disease_info["preventive"],
                "top5": results["top5"],
                "gradcam": results["gradcam"],
                "device": Config.DEVICE,
            }
            return jsonify(response_payload)

        except Exception as exc:
            log.error(f"Prediction pipeline error: {exc}", exc_info=True)
            return jsonify({"error": "Internal prediction error."}), 500

    @app.errorhandler(413)
    def request_entity_too_large(error):
        mb_limit = Config.MAX_CONTENT_LENGTH // (1024 * 1024)
        return jsonify({"error": f"Image too large. Max size is {mb_limit} MB."}), 413

    return app