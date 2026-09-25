// Clase ReporteBalance
// Reune las entradas y salidas (opcionalmente filtradas por un rango de fechas),
// calcula los totales, el balance (entradas - salidas) y los porcentajes
// que se usan en el grafico de pastel y en el PDF.

const db = require('../db');

class ReporteBalance {

    // desde / hasta son opcionales, con formato 'AAAA-MM-DD'
    constructor(desde = null, hasta = null) {
        this.desde = ReporteBalance.fechaValida(desde) ? desde : null;
        this.hasta = ReporteBalance.fechaValida(hasta) ? hasta : null;

        this.entradas = [];
        this.salidas = [];
        this.totalEntradas = 0;
        this.totalSalidas = 0;
        this.balance = 0;
        this.porcentajeEntradas = 0;
        this.porcentajeSalidas = 0;
    }

    // Valida que el texto tenga formato de fecha AAAA-MM-DD
    static fechaValida(texto) {
        return typeof texto === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(texto);
    }

    // Arma el WHERE segun las fechas que se hayan enviado
    construirFiltro() {
        const condiciones = [];
        const parametros = [];

        if (this.desde) {
            condiciones.push('fecha >= ?');
            parametros.push(this.desde);
        }
        if (this.hasta) {
            condiciones.push('fecha <= ?');
            parametros.push(this.hasta);
        }

        const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
        return { where, parametros };
    }

    // Consulta una de las dos tablas (entradas o salidas)
    consultarTabla(tabla, callback) {
        // Solo se permiten estas dos tablas (evita inyectar nombres de tabla)
        if (!['entradas', 'salidas'].includes(tabla)) {
            return callback(new Error('Tabla no permitida'));
        }

        const { where, parametros } = this.construirFiltro();
        const sql = `SELECT id, tipo, monto, fecha, ruta_foto FROM ${tabla} ${where} ORDER BY fecha ASC, id ASC`;

        db.query(sql, parametros, (err, filas) => {
            if (err) {
                return callback(err);
            }
            callback(null, filas);
        });
    }

    // Suma los montos de una lista de registros
    static sumar(registros) {
        const total = registros.reduce((acum, r) => acum + Number(r.monto), 0);
        return Math.round(total * 100) / 100;
    }

    // Calcula totales, balance y porcentajes con los datos ya cargados
    calcular() {
        this.totalEntradas = ReporteBalance.sumar(this.entradas);
        this.totalSalidas = ReporteBalance.sumar(this.salidas);
        this.balance = Math.round((this.totalEntradas - this.totalSalidas) * 100) / 100;

        const suma = this.totalEntradas + this.totalSalidas;
        this.porcentajeEntradas = suma > 0 ? (this.totalEntradas / suma) * 100 : 0;
        this.porcentajeSalidas = suma > 0 ? (this.totalSalidas / suma) * 100 : 0;
    }

    // Carga entradas y salidas y deja todo calculado.
    // callback(err, reporte)
    generar(callback) {
        this.consultarTabla('entradas', (err, entradas) => {
            if (err) {
                return callback(err);
            }
            this.consultarTabla('salidas', (err2, salidas) => {
                if (err2) {
                    return callback(err2);
                }
                this.entradas = entradas;
                this.salidas = salidas;
                this.calcular();
                callback(null, this);
            });
        });
    }

    // Texto del periodo para los titulos: "2016-04-01 / 2016-04-30"
    get periodo() {
        if (this.desde && this.hasta) return `${this.desde} / ${this.hasta}`;
        if (this.desde) return `Desde ${this.desde}`;
        if (this.hasta) return `Hasta ${this.hasta}`;
        return 'Todos los registros';
    }

    // Da formato de moneda: 1500 -> "$1,500.00", -300 -> "-$300.00"
    static moneda(valor) {
        const signo = Number(valor) < 0 ? '-' : '';
        return signo + '$' + Math.abs(Number(valor)).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    // Da formato dd/mm/aaaa a una fecha que viene de MySQL
    static formatoFecha(fecha) {
        const f = new Date(fecha);
        const dd = String(f.getDate()).padStart(2, '0');
        const mm = String(f.getMonth() + 1).padStart(2, '0');
        return `${dd}/${mm}/${f.getFullYear()}`;
    }
}

module.exports = ReporteBalance;
