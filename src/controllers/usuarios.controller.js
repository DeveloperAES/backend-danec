import { pool } from "../config/db.js";

// Obtener todos los usuarios
export const getUsuarios = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM usuarios");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Crear un usuario
export const createUsuario = async (req, res) => {
  try {
    const { nombre, correo } = req.body;
    const [result] = await pool.query(
      "INSERT INTO usuarios (nombre, correo) VALUES (?, ?)",
      [nombre, correo]
    );
    res.json({ id: result.insertId, nombre, correo });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
