import jwt from "jsonwebtoken";
import { pool } from "../config/db.js";

export const verificarToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const tokenFromHeader = authHeader ? authHeader.replace("Bearer ", "") : null;
  const tokenFromCookie = req.cookies && req.cookies.token;
  const token = tokenFromHeader || tokenFromCookie;

  if (!token) return res.status(403).json({ message: "Token no proporcionado" });

  try {
    // comprobar si el token está revocado
    const [revoked] = await pool.query("SELECT * FROM revoked_tokens WHERE token = ? LIMIT 1", [token]);
    if (revoked.length > 0) return res.status(401).json({ message: "Token revocado" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token inválido o expirado" });
  }
};




// Middleware para verificar rol
export const verificarRol = (rolesPermitidos) => (req, res, next) => {
  if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
    return res.status(403).json({ message: "No tienes permisos para acceder a esta ruta" });
  }
  next();
};
