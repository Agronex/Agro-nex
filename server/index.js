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

// mount routes
app.use("/chat", chatRoutes);
app.use("/weather", weatherRoutes);
app.use("/disease", diseaseRoutes);
app.use("/alerts", alertRoutes);

<<<<<<< HEAD
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});
=======
app.listen(5000, () => {
  console.log("✅ Node Server running on http://localhost:5000");
>>>>>>> 8ba3702 (Refactor: Combine ML service with Node backend and cleanup project)

  // Spawn the Python ML Service
  const mlScriptPath = path.join(__dirname, "ml", "ml_service.py");
  console.log(`🚀 Starting ML Service from: ${mlScriptPath}`);
  
  const mlProcess = spawn("python", [mlScriptPath], {
    stdio: "inherit" // Pipe stdout/stderr to Node's console
  });

  mlProcess.on("error", (err) => {
    console.error("❌ Failed to start Python ML Service:", err);
  });

  mlProcess.on("close", (code) => {
    console.log(`⚠️ ML Service exited with code ${code}`);
  });

  // Handle graceful shutdown of the child process
  const cleanup = () => {
    if (mlProcess) {
      console.log("🛑 Shutting down ML Service...");
      mlProcess.kill("SIGINT");
    }
    process.exit();
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
  process.on("exit", cleanup);
});
