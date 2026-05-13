import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

import chatRoutes from "./routes/chatRoutes.js";
import weatherRoutes from "./routes/weatherRoutes.js";
import diseaseRoutes from "./routes/diseaseRoutes.js";
import alertRoutes from "./routes/alertRoutes.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/chat", chatRoutes);
app.use("/weather", weatherRoutes);
app.use("/disease", diseaseRoutes);
app.use("/alerts", alertRoutes);

// Health check for Render
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// Start ML Service
const mlScriptPath = path.join(__dirname, "ml", "ml_service.py");
console.log(`🚀 Starting ML Service from: ${mlScriptPath}`);

// Windows -> python
// Linux(Render) -> python3
const pythonCmd = process.platform === "win32" ? "python" : "python3";

const mlProcess = spawn(pythonCmd, [mlScriptPath], {
  stdio: "inherit",
});

mlProcess.on("error", (err) => {
  console.error("❌ Failed to start Python ML Service:", err);
});

mlProcess.on("close", (code) => {
  console.log(`⚠️ ML Service exited with code ${code}`);
});

// Graceful shutdown
const cleanup = () => {
  if (mlProcess) {
    console.log("🛑 Shutting down ML Service...");
    mlProcess.kill("SIGINT");
  }
  process.exit();
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

// IMPORTANT: Render needs process.env.PORT
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Node Server running on port ${PORT}`);
});