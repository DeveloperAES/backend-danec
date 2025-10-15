import { pool } from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";


//Registro de usuarios
export const registrar = async (req, res) => {
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

    // Validaciones básicas
    if (!correo || !password || !nombre) {
      return res.status(400).json({ message: "Faltan campos obligatorios: nombre, correo o password" });
    }

    // Verificar si ya existe el usuario por correo
    const [existeCorreo] = await pool.query("SELECT * FROM usuarios WHERE correo = ?", [correo]);
    if (existeCorreo.length > 0) {
      // Usar 409 Conflict para duplicados y mensaje claro
      return res.status(409).json({ message: "El correo ya está registrado" });
    }

    // Si se envió codigo, verificar unicidad
    if (codigo) {
      const [existeCodigo] = await pool.query("SELECT * FROM usuarios WHERE codigo = ?", [codigo]);
      if (existeCodigo.length > 0) {
        return res.status(409).json({ message: "El código ya está en uso" });
      }
    }

    // Encriptar contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insertar usuario con los nuevos campos (los nombres de columnas asumen snake_case en la BD)
    const [result] = await pool.query(
      `INSERT INTO usuarios (nombre, apellido, documento, ruc, razon_social, codigo, agencia, canal, perfil, correo, password, rol) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre, apellido, documento, ruc, razon_social, codigo, agencia, canal, perfil, correo, passwordHash, rol]
    );

    res.json({ message: "Usuario registrado correctamente", id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


//Login + token
export const login = async (req, res) => {
  try {
    const { codigo, password } = req.body;

    if (!codigo || !password) {
      return res.status(400).json({ message: "Faltan campos: codigo o password" });
    }

    const [rows] = await pool.query("SELECT * FROM usuarios WHERE codigo = ?", [codigo]);
    if (rows.length === 0) {
      return res.status(400).json({ message: "Código no encontrado" });
    }

    const usuario = rows[0];
    const validPassword = await bcrypt.compare(password, usuario.password);
    if (!validPassword) {
      return res.status(400).json({ message: "Contraseña incorrecta" });
    }

    // Generar token con expiración (ajustable)
    const token = jwt.sign(
      { id: usuario.id, codigo: usuario.codigo, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({
      message: "Login exitoso",
      token,
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
        rol: usuario.rol
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Request password reset: user provides codigo -> send email with token
export const forgotPassword = async (req, res) => {
  try {
    const { codigo } = req.body;
    if (!codigo) return res.status(400).json({ message: "Falta codigo" });

    const [rows] = await pool.query("SELECT * FROM usuarios WHERE codigo = ?", [codigo]);
    if (rows.length === 0) return res.status(400).json({ message: "Usuario no encontrado" });

    const user = rows[0];
    if (!user.correo) return res.status(400).json({ message: "No hay correo registrado para este usuario" });

    // generar token y expiración (por ejemplo 1 hora)
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h

    // almacenar token en tabla password_resets
    await pool.query(
      "INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)",
      [user.id, token, expiresAt]
    );

    // preparar envío de correo (si hay configuración SMTP)
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpPort = process.env.SMTP_PORT || 587;
    const fromEmail = process.env.FROM_EMAIL || `no-reply@${process.env.DOMAIN || 'example.com'}`;

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
 
    let mailSent = false;
    let mailError = null;
    if (smtpHost && smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: Number(smtpPort),
          secure: Number(smtpPort) === 465,
          auth: { user: smtpUser, pass: smtpPass }
        });

        const info = await transporter.sendMail({
          from: fromEmail,
          to: user.correo,
          subject: 'Restablecer contraseña',
          text: `Hola ${user.nombre}, accede a: ${resetUrl}`,
          html: `<p>Hola ${user.nombre},</p><p>Haz clic en el enlace para restablecer tu contraseña (válido 1 hora):</p><p><a href="${resetUrl}">${resetUrl}</a></p>`
        });
        mailSent = true;
      } catch (err) {
        mailError = err.message;
      }
    }

    // Si no se pudo enviar el correo (o no hay SMTP), devolver token en respuesta para pruebas
    const response = { message: 'Si existe el usuario, se ha enviado un enlace de restablecimiento al correo registrado' };
    if (!mailSent) response.debugToken = token;
    if (mailError) response.mailError = mailError;

    return res.json(response);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Reset password using token
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: 'Faltan token o password' });

    const [rows] = await pool.query("SELECT * FROM password_resets WHERE token = ?", [token]);
    if (rows.length === 0) return res.status(400).json({ message: 'Token inválido' });

    const reset = rows[0];
    const now = new Date();
    if (new Date(reset.expires_at) < now) {
      return res.status(400).json({ message: 'Token expirado' });
    }

    // actualizar password del usuario
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    await pool.query('UPDATE usuarios SET password = ? WHERE id = ?', [passwordHash, reset.user_id]);

    // eliminar token usado
    await pool.query('DELETE FROM password_resets WHERE id = ?', [reset.id]);

    return res.json({ message: 'Contraseña restablecida correctamente' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
