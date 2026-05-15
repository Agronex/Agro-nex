# Use a slim Python image to save space
FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    MODEL_PATH="/app/best_model.pth"

# Install system dependencies required by OpenCV (cv2)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency list and install them
# Note: Use the CPU-only version of PyTorch to save massive amounts of Docker image space (~2GB)
COPY requirements.txt .
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . /app

# Expose port
EXPOSE 8000

# Start Gunicorn via the application factory
CMD ["gunicorn", "-c", "gunicorn.conf.py", "api.app:create_app()"]