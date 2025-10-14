import { pool } from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const registrar = async (req, res) => {
  try {
    const { nombre, correo, password, rol = "usuario" } = req.body;

    // Verificar si ya existe el usuario
    const [existe] = await pool.query("SELECT * FROM usuarios WHERE correo = ?", [correo]);
    if (existe.length > 0) {
      return res.status(400).json({ message: "El correo ya está registrado" });
    }

    // Encriptar contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insertar usuario
    const [result] = await pool.query(
      "INSERT INTO usuarios (nombre, correo, password, rol) VALUES (?, ?, ?, ?)",
      [nombre, correo, passwordHash, rol]
    );

    res.json({ message: "Usuario registrado correctamente", id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { correo, password } = req.body;

    const [rows] = await pool.query("SELECT * FROM usuarios WHERE correo = ?", [correo]);
    if (rows.length === 0) {
      return res.status(400).json({ message: "Usuario no encontrado" });
    }

    const usuario = rows[0];
    const validPassword = await bcrypt.compare(password, usuario.password);
    if (!validPassword) {
      return res.status(400).json({ message: "Contraseña incorrecta" });
    }

    // Generar token con expiración de 2h y rol
    const token = jwt.sign(
      { id: usuario.id, correo: usuario.correo, rol: usuario.rol },
      process.env.JWT_SECRET,
      // { expiresIn: "2h" }
      { expiresIn: "2m" }

    );

    res.json({
      message: "Login exitoso",
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
