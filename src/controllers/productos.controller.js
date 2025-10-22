import { pool } from "../config/db.js";

// Obtener todos los productos (público)
export const getProductos = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, nombre, descripcion, puntos, stock, link_imagen, estado, fecha_creacion FROM productos WHERE estado = 'disponible'");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Crear un producto (solo admin)
export const createProducto = async (req, res) => {
  try {
    const { nombre, descripcion = "", puntos, stock = 0, link_imagen = "", estado = 'disponible' } = req.body;
    if (!nombre || puntos === undefined) return res.status(400).json({ message: "Faltan campos obligatorios: nombre o puntos" });

    const [result] = await pool.query(
      `INSERT INTO productos (nombre, descripcion, puntos, stock, link_imagen, estado) VALUES (?, ?, ?, ?, ?, ?)`,
      [nombre, descripcion, puntos, stock, link_imagen, estado]
    );

    res.status(201).json({ id: result.insertId, nombre, descripcion, puntos, stock, link_imagen, estado });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
