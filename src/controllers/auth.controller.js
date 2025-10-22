import { pool } from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";

// Registro de usuarios
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

    if (!correo || !password || !nombre) {
      return res.status(400).json({ message: "Faltan campos obligatorios: nombre, correo o password" });
    }

    const [existeCorreo] = await pool.query("SELECT * FROM usuarios WHERE correo = ?", [correo]);
    if (existeCorreo.length > 0) return res.status(409).json({ message: "El correo ya está registrado" });

    if (codigo) {
      const [existeCodigo] = await pool.query("SELECT * FROM usuarios WHERE codigo = ?", [codigo]);
      if (existeCodigo.length > 0) return res.status(409).json({ message: "El código ya está en uso" });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const [result] = await pool.query(
      `INSERT INTO usuarios (nombre, apellido, documento, ruc, razon_social, codigo, agencia, canal, perfil, correo, password, rol) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre, apellido, documento, ruc, razon_social, codigo, agencia, canal, perfil, correo, passwordHash, rol]
    );

    return res.json({ message: "Usuario registrado correctamente", id: result.insertId });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Login
export const login = async (req, res) => {
  try {
    const { codigo, password } = req.body;
    if (!codigo || !password) return res.status(400).json({ message: "Faltan campos: codigo o password" });

    const [rows] = await pool.query("SELECT * FROM usuarios WHERE codigo = ?", [codigo]);
    if (rows.length === 0) return res.status(400).json({ message: "Código no encontrado" });

    const usuario = rows[0];
    const validPassword = await bcrypt.compare(password, usuario.password);
    if (!validPassword) return res.status(400).json({ message: "Contraseña incorrecta" });

    const token = jwt.sign({ id: usuario.id, codigo: usuario.codigo, rol: usuario.rol }, process.env.JWT_SECRET, { expiresIn: "2h" });

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      //  secure: false,
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
       maxAge: 2 * 60 * 60 * 1000, // 2 horas
      // maxAge: 2 * 60 * 1000, // 2 minutos

    };

    res.cookie("token", token, cookieOptions);

    return res.json({
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
        rol: usuario.rol,
        puntos_totales: usuario.puntos_totales
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Logout: revoke token and clear cookie
export const logout = async (req, res) => {
  try {
    const tokenFromCookie = req.cookies && req.cookies.token;
    const authHeader = req.headers["authorization"];
    const tokenFromHeader = authHeader ? authHeader.replace("Bearer ", "") : null;
    const token = tokenFromHeader || tokenFromCookie;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const expiresAt = decoded.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 2 * 60 * 60 * 1000);
        await pool.query("INSERT INTO revoked_tokens (token, expires_at) VALUES (?, ?)", [token, expiresAt]);
      } catch (err) {
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        await pool.query("INSERT INTO revoked_tokens (token, expires_at) VALUES (?, ?)", [token, expiresAt]);
      }
    }

    res.clearCookie("token", { httpOnly: true, sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax", secure: process.env.NODE_ENV === "production" });
    return res.json({ message: "Cierre de sesión exitoso" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Forgot password
export const forgotPassword = async (req, res) => {
  try {
    const { codigo } = req.body;
    if (!codigo) return res.status(400).json({ message: "Falta codigo" });

    const [rows] = await pool.query("SELECT * FROM usuarios WHERE codigo = ?", [codigo]);
    if (rows.length === 0) return res.status(400).json({ message: "Usuario no encontrado" });

    const user = rows[0];
    if (!user.correo) return res.status(400).json({ message: "No hay correo registrado para este usuario" });

    const token = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await pool.query("INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)", [user.id, token, expiresAt]);

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
        const transporter = nodemailer.createTransport({ host: smtpHost, port: Number(smtpPort), secure: Number(smtpPort) === 465, auth: { user: smtpUser, pass: smtpPass } });
        await transporter.sendMail({ from: fromEmail, to: user.correo, subject: 'Restablecer contraseña', text: `Hola ${user.nombre}, accede a: ${resetUrl}`, html: `<p>Hola ${user.nombre},</p><p>Haz clic en el enlace para restablecer tu contraseña (válido 1 hora):</p><p><a href="${resetUrl}">${resetUrl}</a></p>` });
        mailSent = true;
      } catch (err) {
        mailError = err.message;
      }
    }

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
    if (new Date(reset.expires_at) < now) return res.status(400).json({ message: 'Token expirado' });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    await pool.query('UPDATE usuarios SET password = ? WHERE id = ?', [passwordHash, reset.user_id]);

    await pool.query('DELETE FROM password_resets WHERE id = ?', [reset.id]);

    return res.json({ message: 'Contraseña restablecida correctamente' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
