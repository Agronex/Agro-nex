import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import chatRoutes from "./routes/chatRoutes.js";
import weatherRoutes from "./routes/weatherRoutes.js";
import diseaseRoutes from "./routes/diseaseRoutes.js";


dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// mount routes
app.use("/chat", chatRoutes);
app.use("/weather", weatherRoutes);
app.use("/disease", diseaseRoutes);


app.listen(5000, () => console.log("✅ Server running on http://localhost:5000"));
