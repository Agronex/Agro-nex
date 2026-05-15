import os
import logging

class Config:
    # App Settings
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*")
    MAX_CONTENT_LENGTH = int(os.environ.get("MAX_IMG_MB", "10")) * 1024 * 1024
    
    # Model Settings
    MODEL_PATH = os.environ.get("MODEL_PATH", os.path.join(BASE_DIR, "best_model.pth"))
    TTA_STEPS = int(os.environ.get("TTA_STEPS", "3"))
    DEVICE = os.environ.get("DEVICE", "cpu")
    
    @classmethod
    def setup_logging(cls):
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s [%(process)d] [%(levelname)s] %(message)s",
            handlers=[logging.StreamHandler()]
        )