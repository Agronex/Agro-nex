# 🌾 AgroNex – Smart Farming Dashboard

AgroNex is a **smart farming web Dashboard** designed to empower farmers with **real-time insights** into crop health, weather, irrigation, market trends, and yield prediction.  
By combining **machine learning, and AI assistance**, AgroNex helps farmers make **data-driven decisions** for sustainable and efficient agriculture.


---

## Overview

### 🌦️ Real-Time Weather Insights
- Integrated **Open-Meteo API** and **Tomorrow.io API** for accurate multi-source weather data.  
- Displays temperature, humidity, rainfall, and wind speed with irrigation recommendations.

### 🌿 Crop Disease Detection (ML)
- Custom **Vision Transformer (ViT)** model trained on images of **Corn, Wheat, Potato, and Rice**.  
- Model deployed on **Hugging Face** and accessed through an **Inference API** for real-time disease detection.

### 📊 Yield Prediction
- Simple regression-based **ML model** trained on the *Crop Yield Prediction Dataset* from **Kaggle**.  
- Predicts expected yield based on weather and soil parameters.

### 🧠 AI Farming Assistant
- Built-in **AI Farming Assistant** powered by **DeepSeek**, integrated via **Hugging Face Inference API**.  
- Provides intelligent answers, recommendations, and insights for crop care and farming decisions.

### 🧠 Smart Irrigation & Disease Alerts
- AI-based irrigation advice depending on current weather and soil data.  
- Instant notifications for potential diseases or pests using the ViT detection model.

### 📈 Market Price Updates
- Uses **Government Agmarknet API (agmarknet.gov.in)** for authentic and live crop price data.

### 🌾 Yield Estimation
- Predicts yield based on environmental, crop, and seasonal data using the ML model.

### 📘 Farm Logbook & Community Support
- Farmers can log daily activities, track progress, and share posts.  
- Built with **Firebase Firestore** to store community posts and user data securely.

### 🧑‍🌾 Secure Authentication
- **Firebase Authentication** used for secure user login, signup, and account management.

### 💬 AI-Powered Support
- The integrated AI assistant provides context-aware suggestions and helps resolve farming queries.

---

## 🧩 Tech Stack

### 🌐 Frontend
- **React.js**, **TypeScript**, **JavaScript**, **HTML**, **CSS**, **Tailwind CSS**  
- Hosted on **Vercel**

### ⚙️ Backend
- **Node.js**, **Express.js**, **Python (for ML models)**  
- Hosted on **Render**

### 🧠 Machine Learning & AI
- **Hugging Face Inference API**  
- **DeepSeek AI** (for Farming Assistant)  
- **Vision Transformer (ViT)** model for disease detection  
- **Custom Yield Prediction Model** (trained on Kaggle dataset)

### ☁️ Database & Authentication
- **Firebase Authentication** for secure user management  
- **Firestore Database** for storing user profiles, community posts, and activity logs

### 🌦️ APIs Used
- **Open-Meteo API** – Real-time weather data  
- **Tomorrow.io API** – Advanced weather forecasts  
- **Agmarknet API** – Official government market prices  
- **Hugging Face Inference API** – AI assistant & disease detection

---

## ⚙️ Installation

```bash
# Clone the repository
git clone https://github.com/Agronex/Agro-nex.git

# Navigate into the project directory
cd Agro-nex

# Navigate into the frontend directory
cd client

# Install dependencies
npm install

# Run the development server
npm run dev
