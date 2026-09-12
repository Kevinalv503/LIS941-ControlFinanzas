// Clase Entradas
// Se encarga de todo lo relacionado a guardar y consultar las entradas

const db = require('../db'); // la conexion

class Entradas {

    // Guarda una nueva entrada en la base de datos.
    // datos = { tipo, monto, fecha, rutaFoto }
    static crear(datos, callback) {
        const sql = `
            INSERT INTO entradas (tipo, monto, fecha, ruta_foto)
            VALUES (?, ?, ?, ?)
        `;

        db.query(sql, [datos.tipo, datos.monto, datos.fecha, datos.rutaFoto], (err, resultado) => {
            if (err) {
                return callback(err);
            }
            callback(null, resultado);
        });
    }

    // Trae todas las entradas registradas, de la mas reciente a la mas antigua.
    static obtenerTodas(callback) {
        const sql = 'SELECT * FROM entradas ORDER BY fecha DESC';

        db.query(sql, (err, filas) => {
            if (err) {
                return callback(err);
            }
            callback(null, filas);
        });
    }
}

module.exports = Entradas;