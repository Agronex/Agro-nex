import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import weatherRoutes from "./routes/weather.js";
import aiRoutes from "./routes/ai.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/weather", weatherRoutes);
app.use("/api/ai", aiRoutes);

app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});
