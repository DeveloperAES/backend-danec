import { Router } from "express";
import { getUsuarios, createUsuario, actualizarUsuario, deleteUsuario } from "../controllers/usuarios.controller.js";
import { verificarToken, verificarRol } from "../middlewares/auth.middleware.js";

const router = Router();

// Solo los ADMIN pueden ver todos los usuarios
router.get("/", verificarToken, verificarRol(["admin"]), getUsuarios);


router.put("/:id", verificarToken, actualizarUsuario);

// Solo los ADMIN pueden crear nuevos usuarios
// router.post("/", verificarToken, verificarRol(["admin"]), createUsuario);
router.post("/", verificarToken, createUsuario);

// Solo los ADMIN pueden eliminar usuarios
router.delete("/:id", verificarToken, verificarRol(["admin"]), deleteUsuario);

export default router;
