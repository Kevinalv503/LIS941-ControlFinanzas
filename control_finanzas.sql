-- =========================================================
-- Base de datos: control_finanzas
-- Proyecto: LIS941 - Desafio 2 (Control de Finanzas)
-- =========================================================

CREATE DATABASE IF NOT EXISTS control_finanzas;
USE control_finanzas;

-- ---------------------------------------------------------
-- Tabla: usuarios (para el Login)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_usuario VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Usuario de prueba (usuario: admin / password: 1234)
-- Nota: en el codigo real la contraseña debe guardarse encriptada (bcrypt),
-- esta es solo para poder hacer pruebas mientras se desarrolla.
INSERT INTO usuarios (nombre_usuario, password)
VALUES ('admin', '1234');

-- ---------------------------------------------------------
-- Tabla: entradas
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS entradas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipo VARCHAR(100) NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    fecha DATE NOT NULL,
    ruta_foto VARCHAR(255),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------
-- Tabla: salidas
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS salidas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipo VARCHAR(100) NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    fecha DATE NOT NULL,
    ruta_foto VARCHAR(255),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);