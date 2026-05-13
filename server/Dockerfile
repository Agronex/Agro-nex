# Use Node.js 20 slim as the base image
FROM node:20-slim

# Install Python 3, pip, and required system libraries for OpenCV/PyTorch
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package.json and install Node dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy Python requirements
COPY ml/requirements.txt ./ml/

# Create a symlink so `python` points to `python3` inside the container
RUN ln -s /usr/bin/python3 /usr/bin/python

# Configure pip to not use cache to save space, and install CPU-only PyTorch
# This is crucial for Render's free tier to avoid exhausting the 512MB RAM and disk space limits
RUN pip3 install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu --break-system-packages

# Install the rest of the Python dependencies
RUN pip3 install --no-cache-dir -r ml/requirements.txt --break-system-packages

# Copy the rest of the server code
COPY . .

# Expose port 5000 (Render will map this automatically)
EXPOSE 5000

# Start the Node.js server (which will automatically spawn the ML service)
CMD ["node", "index.js"]
