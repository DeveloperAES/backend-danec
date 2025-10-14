import { Router } from "express";
import { getUsuarios, createUsuario } from "../controllers/usuarios.controller.js";
import { verificarToken, verificarRol } from "../middlewares/auth.middleware.js";

const router = Router();

// Solo usuarios autenticados pueden ver usuarios
router.get("/", verificarToken, getUsuarios);

// Solo los ADMIN pueden crear nuevos usuarios
router.post("/", verificarToken, verificarRol(["admin"]), createUsuario);

export default router;
