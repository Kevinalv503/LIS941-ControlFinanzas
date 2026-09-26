// Clase Salidas
// Se encarga de guardar y consultar las salidas.

const db = require('../db');

class Salidas {
    static crear(datos, callback) {
        const sql = `
            INSERT INTO salidas (tipo, monto, fecha, ruta_foto)
            VALUES (?, ?, ?, ?)
        `;

        db.query(sql, [datos.tipo, datos.monto, datos.fecha, datos.rutaFoto], (err, resultado) => {
            if (err) {
                return callback(err);
            }
            callback(null, resultado);
        });
    }

    static obtenerTodas(callback) {
        const sql = `
            SELECT id, tipo, monto, DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha, ruta_foto, creado_en
            FROM salidas
            ORDER BY fecha DESC
        `;

        db.query(sql, (err, filas) => {
            if (err) {
                return callback(err);
            }
            callback(null, filas);
        });
    }
}

module.exports = Salidas;
