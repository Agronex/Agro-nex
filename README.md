# 🌾 AgroNex – Smart Farming Dashboard

AgroNex is a smart farming web app for crop monitoring, weather insights, disease detection, market prices, yield prediction, and an AI farming assistant.

## Architecture

| Layer | Stack | Purpose |
| --- | --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS | Farmer-facing UI, chat, dashboard, weather, disease scan, logbook |
| Node server | Express, Node.js | App API, security, CORS, rate limiting, chat orchestration, disease proxy |
| ML backend | Python, Flask, Gunicorn, PyTorch | Crop disease inference API hosted on Hugging Face Spaces |
| Data/auth | Firebase Auth, Firestore | User accounts, settings, chat threads, app data |

## Core features

- Real-time weather and irrigation guidance
- Crop disease detection with image upload
- AI farming assistant with streaming replies
- Multi-turn chat memory and named chat threads
- Yield prediction
- Market price tracking
- Community posts and farm logbook
- Per-user settings, privacy controls, and export/delete tools

## Backend overview

### Node server

The Node/Express server handles the main application backend:

- `GET /health` - server health check
- `POST /chat` - AI assistant response
- `POST /chat/stream` - streaming AI assistant response
- `GET/POST /weather` - weather data pipeline
- `GET /alerts` - farm alert generation
- `POST /disease` - proxy to the ML backend if you want to route disease scans through Node

It also provides:

- CORS protection
- Helmet security headers
- global rate limiting
- stricter AI route rate limiting

### AI assistant

The chat service now uses GitHub Models through:

- `@azure-rest/ai-inference`
- `@azure/core-auth`
- `GITHUB_TOKEN`

Model flow:

1. Try `openai/gpt-5`
2. Fall back to `openai/gpt-4.1` if needed

The assistant supports:

- structured conversation history
- markdown-formatted replies
- streaming token delivery over SSE

### ML backend

The crop disease model is deployed as a Hugging Face Docker Space and runs a Flask app behind Gunicorn.

## ML architecture

### 1) Input and validation
- Receives a leaf image through `multipart/form-data` (`image` field).
- Validates the file with PIL, converts it to RGB, and rejects empty/corrupted uploads.
- Enforces a max image size with `MAX_IMG_MB`.

### 2) Preprocessing
- Resizes images to the checkpoint image size (default `300x300`).
- Normalizes using ImageNet mean/std.
- Converts to tensors with `ToTensorV2`.
- Uses test-time augmentation (TTA) to improve robustness on small CPU deployments.

### 3) Model architecture
- Backbone: `tf_efficientnetv2_s` via `timm`.
- Head: custom MLP classifier:
  - `Linear -> BatchNorm -> SiLU -> Dropout`
  - `Linear -> BatchNorm -> SiLU -> Dropout`
  - final classification layer for all disease classes
- Checkpoint stores the class list and config metadata.
- The current checkpoint covers 15 classes across rice, cotton, sugarcane, and healthy variants.

### 4) Inference flow
- Runs on CPU with a single worker/thread for memory safety.
- Uses a thread lock so concurrent requests do not collide during Grad-CAM generation.
- Runs multiple TTA passes, averages probabilities, and returns top-5 predictions.
- Maps the winning label to disease metadata (`severity`, `details`, `preventive`).

### 5) Explainability
- Grad-CAM is generated from the last available convolution layer.
- The output is returned as a base64 PNG for UI display.

### 6) Output schema
- predicted label
- confidence score
- crop and disease name
- severity metadata
- preventive advice
- top-5 predictions
- Grad-CAM preview when available

### 7) Deployment shape
- Packaged as a Hugging Face Docker Space.
- Served by Gunicorn on port `7860`.
- Uses `best_model.pth` as the checkpoint artifact.

**Endpoints**

- `GET /health`
- `POST /predict`

**Request format**

`multipart/form-data` with an `image` field.

The model returns:

- predicted label
- confidence score
- crop and disease name
- severity metadata
- preventive advice
- top-5 predictions
- Grad-CAM preview when available

## Tech stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- Firebase Auth / Firestore

### Node backend
- Express
- Helmet
- CORS
- express-rate-limit
- GitHub Models inference client

### ML backend
- Flask
- Gunicorn
- PyTorch
- timm
- albumentations
- OpenCV

## Environment variables

### Root / frontend

| Variable | Purpose |
| --- | --- |
| `VITE_BACKEND_URL` | Node server base URL |
| `VITE_DISEASE_API_URL` | ML backend base URL |

### Node server

| Variable | Purpose |
| --- | --- |
| `GITHUB_TOKEN` | GitHub Models token for chat |
| `GITHUB_MODELS_ENDPOINT` | GitHub Models endpoint (`https://models.github.ai/inference`) |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins |
| `ML_SERVICE_URL` | ML backend URL for `/disease` proxying |
| `NODE_ENV` | Production/runtime mode |

### ML backend

| Variable | Purpose |
| --- | --- |
| `MODEL_PATH` | Path to `best_model.pth` |
| `PORT` | Space port (default `7860`) |
| `TTA_STEPS` | Test-time augmentation count |
| `MAX_IMG_MB` | Max upload size |
| `ALLOWED_ORIGIN` | Allowed frontend origin |

## Local development

```bash
# Install frontend deps
cd client
npm install

# Install Node server deps
cd ../server
npm install

# Run frontend
cd ../client
npm run dev

# Run Node server
cd ../server
npm start
```

## Disease detection flow

The app supports both patterns:

1. Frontend calls the Hugging Face Space directly using `VITE_DISEASE_API_URL`
2. Node server proxies requests through `POST /disease` using `ML_SERVICE_URL`

The current production-friendly path is direct frontend calls to the Space API.

## AI chat flow

The assistant uses multi-turn chat history, markdown rendering, and streaming output. The UI stores named threads per signed-in user in Firestore and can resume conversations after refresh.

## Deployment notes

- Node server is responsible for the main app API.
- The crop disease model is hosted separately on Hugging Face Spaces to avoid memory pressure on Render.
- Keep secrets out of source control; set them in your hosting dashboards or local `.env` files.
