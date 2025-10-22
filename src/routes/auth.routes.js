import { Router } from "express";
import { pool } from "../config/db.js";
import { registrar, login, forgotPassword, resetPassword, logout } from "../controllers/auth.controller.js";
import { verificarToken } from "../middlewares/auth.middleware.js";



const router = Router();


router.post("/register", registrar);

router.post("/login", login);

router.get("/verify", verificarToken, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM usuarios WHERE id = ?", [req.usuario.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const usuario = rows[0];
    return res.json({
      message: "Autenticado",
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        documento: usuario.documento,
        ruc: usuario.ruc,
        razon_social: usuario.razon_social,
        codigo: usuario.codigo,
        agencia: usuario.agencia,
        canal: usuario.canal,
        perfil: usuario.perfil,
        correo: usuario.correo,
        rol: usuario.rol,
        puntos_totales: usuario.puntos_totales,
      },
    });
  } catch (error) {
    console.error("Error al verificar usuario:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
});

router.post("/logout", logout);


// Resetear contraseñas
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
