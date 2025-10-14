import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./config/db.js";
import usuariosRoutes from "./routes/usuarios.routes.js";
import authRoutes from "./routes/auth.routes.js";

dotenv.config();

const app = express();
app.use(cors({
    origin: "http://localhost:4321", // Puerto donde corre Astro
    credentials: true
}));
app.use(express.json());

// Rutas
app.use("/api/auth", authRoutes);
app.use("/api/usuarios", usuariosRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));
