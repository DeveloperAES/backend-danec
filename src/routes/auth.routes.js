import { Router } from "express";
import { registrar, login, forgotPassword, resetPassword } from "../controllers/auth.controller.js";

const router = Router();

router.post("/register", registrar);

router.post("/login", login);

// Resetear contraseñas
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
