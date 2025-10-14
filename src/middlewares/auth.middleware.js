import jwt from "jsonwebtoken";

export const verificarToken = (req, res, next) => {
  const token = req.headers["authorization"];

  if (!token) return res.status(403).json({ message: "Token no proporcionado" });

  try {
    const tokenLimpio = token.replace("Bearer ", "");
    const decoded = jwt.verify(tokenLimpio, process.env.JWT_SECRET);
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
