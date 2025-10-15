import { pool } from "../config/db.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Obtener todos los usuarios
export const getUsuarios = async (req, res) => {
  try {
    // Seleccionar columnas específicas para incluir los nuevos campos
    const [rows] = await pool.query(
      `SELECT id, nombre, apellido, documento, ruc, razon_social, codigo, agencia, canal, perfil, correo, rol FROM usuarios`
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Crear un usuario
export const createUsuario = async (req, res) => {
  try {
    const {
      nombre,
      apellido = "",
      documento = "",
      ruc = "",
      razon_social = "",
      codigo = "",
      agencia = "",
      canal = "",
      perfil = "",
      correo,
      password,
      rol = "usuario",
    } = req.body;

    // Validaci\u00f3n m\u00ednima
    if (!nombre || !correo) { 
      return res.status(400).json({ message: "Faltan campos obligatorios: nombre o correo" });
    }

    // Verificar unicidad de codigo si se proporcion\u00f3
    if (codigo) {
      const [existeCodigo] = await pool.query("SELECT * FROM usuarios WHERE codigo = ?", [codigo]);
        if (existeCodigo.length > 0) {
          return res.status(409).json({ message: "El código ya está en uso" });
      }
    }

    // Verificar unicidad de correo
    if (correo) {
      const [existeCorreo] = await pool.query("SELECT * FROM usuarios WHERE correo = ?", [correo]);
        if (existeCorreo.length > 0) {
          return res.status(409).json({ message: "El correo ya está registrado" });
      }
    }

    // Manejar password: si no se proporciona, generar una temporal
    let plainPassword = null;
    let passwordHash = null;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(password, salt);
    } else {
      // generar password temporal aleatorio
      plainPassword = crypto.randomBytes(6).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(plainPassword, salt);
    }

    const [result] = await pool.query(
      `INSERT INTO usuarios (nombre, apellido, documento, ruc, razon_social, codigo, agencia, canal, perfil, correo, password, rol) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre, apellido, documento, ruc, razon_social, codigo, agencia, canal, perfil, correo, passwordHash, rol]
    );

    const responseBody = { id: result.insertId, nombre, apellido, documento, ruc, razon_social, codigo, agencia, canal, perfil, correo, rol };
    if (plainPassword) responseBody.generatedPassword = plainPassword;

    res.json(responseBody);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Eliminar usuario (solo admin debe exponer ruta)
export const deleteUsuario = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    
    // Verificar si userId es un número válido
    if (isNaN(userId)) {
      return res.status(400).json({ error: "ID de usuario no válido" });
    }

    // Opcional: evitar que el admin se elimine a sí mismo
    if (req.usuario && req.usuario.id === userId) {
      return res.status(400).json({ message: 'No puedes eliminar tu propio usuario' });
    }

    // Realizar la eliminación
    const result = await pool.query("DELETE FROM usuarios WHERE id = ?", [userId]);

    // Verificar si el usuario fue encontrado y eliminado
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json({ message: "Usuario eliminado" });
  } catch (error) {
    console.error(error); // Para un log más detallado en el servidor
    res.status(500).json({ error: error.message });
  }
};




//Actualizar usuario
export const actualizarUsuario = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const requester = req.usuario; // set por verificarToken

    if (!requester) return res.status(401).json({ message: "No autenticado" });

    // Si no es admin y no es el propio usuario => prohibido
    if (requester.rol !== "admin" && requester.id !== userId) {
      return res.status(403).json({ message: "No tienes permiso para editar este usuario" });
    }

    // Prohibir cambios a campos sensibles si no es admin
    const forbiddenIfNotAdmin = ["rol", "codigo", "puntos"];
    if (requester.rol !== "admin") {
      for (const f of forbiddenIfNotAdmin) {
        if (req.body[f] !== undefined) {
          return res.status(403).json({ message: `No puedes modificar ${f}` });
        }
      }
    }

    // Si hay password en body -> hashear
    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      req.body.password = await bcrypt.hash(req.body.password, salt);
    }

    // Ejecutar UPDATE (ejemplo simple):
    const fields = [];
    const values = [];
    for (const [k, v] of Object.entries(req.body)) {
      fields.push(`${k} = ?`);
      values.push(v);
    }
    if (fields.length === 0) return res.status(400).json({ message: "Nada que actualizar" });

    values.push(userId);
    const sql = `UPDATE usuarios SET ${fields.join(", ")} WHERE id = ?`;
    await pool.query(sql, values);

    const [rows] = await pool.query("SELECT id, nombre, apellido, documento, ruc, razon_social, codigo, agencia, canal, perfil, correo, rol FROM usuarios WHERE id = ?", [userId]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};