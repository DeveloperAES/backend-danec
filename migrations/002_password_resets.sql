-- Migration: create password_resets table
CREATE TABLE IF NOT EXISTS password_resets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(128) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_token (token),
  FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


--Creacion de tabla usuarios
CREATE TABLE usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100),
  documento VARCHAR(50),
  ruc VARCHAR(50),
  razon_social VARCHAR(150),
  codigo VARCHAR(100) NOT NULL,
  agencia VARCHAR(100),
  canal VARCHAR(100),
  perfil VARCHAR(100),
  correo VARCHAR(100) NOT NULL,
  password VARCHAR(255) NOT NULL,
  puntos INT DEFAULT 0,
  fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
  rol VARCHAR(50) DEFAULT 'usuario',
  UNIQUE KEY ux_usuarios_correo (correo),
  UNIQUE KEY ux_usuarios_codigo (codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;