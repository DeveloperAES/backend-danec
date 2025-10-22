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
  correo VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  puntos_totales INT DEFAULT 0,          -- puntos acumulados históricos
  puntos_canjeados INT DEFAULT 0,        -- total puntos usados
  puntos_disponibles INT DEFAULT 0,      -- puntos actual disponibles
  fecha_ultimo_cargue DATETIME,          -- fecha de última carga de puntos
  fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
  rol ENUM('usuario','admin') DEFAULT 'usuario'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ==============================================
-- TABLA: productos
-- ==============================================
CREATE TABLE productos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT,
  puntos INT NOT NULL,                         -- costo en puntos
  stock INT DEFAULT 0,
  link_imagen VARCHAR(255),
  estado ENUM('disponible','agotado') DEFAULT 'disponible',
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ==============================================
-- TABLA: historial_puntos
-- (Registra cada carga o ganancia de puntos)
-- ==============================================
CREATE TABLE historial_puntos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL,
  puntos INT NOT NULL,
  tipo ENUM('carga','ajuste','bono') DEFAULT 'carga',
  descripcion VARCHAR(255),
  fecha_carga DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ==============================================
-- TABLA: canjes
-- (Registra los canjes realizados por los usuarios)
-- ==============================================
CREATE TABLE canjes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL,
  id_producto INT NOT NULL,
  puntos_usados INT NOT NULL,
  fecha_canje DATETIME DEFAULT CURRENT_TIMESTAMP,
  estado ENUM('pendiente','entregado','cancelado') DEFAULT 'pendiente',
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (id_producto) REFERENCES productos(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ==============================================
-- TABLA: movimientos_puntos
-- (Extracto general de puntos ganados/gastados)
-- ==============================================
CREATE TABLE movimientos_puntos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL,
  tipo ENUM('carga','canje','ajuste') NOT NULL,
  puntos INT NOT NULL,
  descripcion VARCHAR(255),
  fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ==============================================
-- VISTA: resumen_mensual_puntos
-- (Resumen de puntos ganados agrupados por mes y año)
-- ==============================================
CREATE OR REPLACE VIEW resumen_mensual_puntos AS
SELECT 
  u.id AS id_usuario,
  CONCAT(u.nombre, ' ', u.apellido) AS usuario,
  YEAR(h.fecha_carga) AS anio,
  MONTH(h.fecha_carga) AS mes,
  SUM(h.puntos) AS puntos_mes
FROM usuarios u
LEFT JOIN historial_puntos h ON u.id = h.id_usuario
GROUP BY u.id, anio, mes;
