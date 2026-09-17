// Clase Login
// Consulta los usuarios para validar login como tal.

const db = require('../db');

class Login {
    static buscarPorUsuario(nombreUsuario, callback) {
        const sql = `
            SELECT id, nombre_usuario, password
            FROM usuarios
            WHERE nombre_usuario = ?
            LIMIT 1
        `;

        db.query(sql, [nombreUsuario], (err, filas) => {
            if (err) {
                return callback(err);
            }
            callback(null, filas[0] || null);
        });
    }

}

module.exports = Login;
