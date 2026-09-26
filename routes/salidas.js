// Rutas para el modulo de Salidas

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const Salidas = require('../models/Salidas');
const requiereSesion = require('../middleware/auth');

router.use(requiereSesion);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'uploads', 'facturas'));
    },
    filename: (req, file, cb) => {
        const nombreUnico = Date.now() + path.extname(file.originalname);
        cb(null, nombreUnico);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        cb(null, file.mimetype.startsWith('image/'));
    }
});

function encabezado(titulo) {
    return `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>${titulo} - Control de Finanzas</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
            <link href="/css/estilo.css" rel="stylesheet">
        </head>
        <body>
            <nav class="navbar navbar-finanzas navbar-dark mb-4">
                <div class="container">
                    <a class="navbar-brand" href="/dashboard">Control de Finanzas</a>
                    <a class="btn btn-outline-light btn-sm" href="/dashboard">Volver al menú</a>
                </div>
            </nav>
    `;
}

const pieDePagina = `
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
        </body>
        </html>
`;

function escaparHtml(texto) {
    return String(texto)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function fechaValida(fecha) {
    if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        return false;
    }

    const [anio, mes, dia] = fecha.split('-').map(Number);
    const fechaUtc = new Date(Date.UTC(anio, mes - 1, dia));
    return fechaUtc.getUTCFullYear() === anio
        && fechaUtc.getUTCMonth() === mes - 1
        && fechaUtc.getUTCDate() === dia;
}

function validarDatos(body) {
    const tipo = typeof body.tipo === 'string' ? body.tipo.trim() : '';
    const monto = typeof body.monto === 'string' ? body.monto.trim() : '';
    const numeroMonto = Number(monto);
    const montoValido = /^-?\d{1,8}(?:\.\d{1,2})?$/.test(monto)
        && Number.isFinite(numeroMonto)
        && Math.abs(numeroMonto) <= 99999999.99;

    if (!tipo) {
        return 'El tipo es obligatorio.';
    }
    if (tipo.length > 100) {
        return 'El tipo no puede superar los 100 caracteres.';
    }
    if (!monto) {
        return 'El monto es obligatorio.';
    }
    if (!montoValido) {
        return 'El monto debe ser numérico y tener como máximo dos decimales.';
    }
    if (!fechaValida(body.fecha)) {
        return 'La fecha es obligatoria y debe ser válida.';
    }

    return null;
}

function eliminarFoto(rutaFoto) {
    if (!rutaFoto) return;

    fs.unlink(rutaFoto, (err) => {
        if (err && err.code !== 'ENOENT') {
            console.error('Error al eliminar la foto de salida:', err);
        }
    });
}

// GET -> muestra el formulario para registrar una salida
router.get('/registrar-salida', (req, res) => {
    res.send(`
        ${encabezado('Registrar salida')}
        <div class="container">
            <div class="card tarjeta-formulario p-4">
                <h4 class="mb-3">Registrar salida</h4>
                <form action="/registrar-salida" method="POST" enctype="multipart/form-data">
                    <div class="mb-3">
                        <label class="form-label" for="tipo">Tipo</label>
                        <input type="text" class="form-control" id="tipo" name="tipo" placeholder="Ej. Compra, servicio..." required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label" for="monto">Monto</label>
                        <input type="number" step="0.01" class="form-control" id="monto" name="monto" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label" for="fecha">Fecha</label>
                        <input type="date" class="form-control" id="fecha" name="fecha" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label" for="foto">Foto de factura</label>
                        <input type="file" class="form-control" id="foto" name="foto" accept="image/*" required>
                    </div>
                    <button type="submit" class="btn btn-entrada text-white w-100">Guardar salida</button>
                </form>
            </div>
        </div>
        ${pieDePagina}
    `);
});

// POST -> valida el formulario, sube la foto y guarda la salida
router.post('/registrar-salida', (req, res, next) => {
    upload.single('foto')(req, res, (err) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                return res.status(400).send('No se pudo subir la foto de factura.');
            }
            return next(err);
        }

        const errorValidacion = validarDatos(req.body);
        if (errorValidacion) {
            eliminarFoto(req.file && req.file.path);
            return res.status(400).send(errorValidacion);
        }

        if (!req.file) {
            return res.status(400).send('La foto de factura es obligatoria.');
        }

        const datos = {
            tipo: req.body.tipo.trim(),
            monto: req.body.monto.trim(),
            fecha: req.body.fecha,
            rutaFoto: `uploads/facturas/${req.file.filename}`
        };

        Salidas.crear(datos, (error) => {
            if (error) {
                console.error('Error al guardar la salida:', error);
                eliminarFoto(req.file.path);
                return res.status(500).send('Ocurrio un error al guardar la salida.');
            }
            res.redirect('/ver-salidas');
        });
    });
});

// GET -> muestra todas las salidas registradas
router.get('/ver-salidas', (req, res) => {
    Salidas.obtenerTodas((err, salidas) => {
        if (err) {
            console.error('Error al obtener las salidas:', err);
            return res.status(500).send('Ocurrio un error al cargar las salidas.');
        }

        const filas = salidas.map(salida => {
            const fecha = typeof salida.fecha === 'string'
                ? salida.fecha.split('-').reverse().join('/')
                : new Date(salida.fecha).toLocaleDateString('es-ES');
            const rutaFoto = typeof salida.ruta_foto === 'string'
                ? `/${salida.ruta_foto.replace(/\\/g, '/')}`
                : '';

            return `
                <tr>
                    <td>${escaparHtml(salida.tipo)}</td>
                    <td>$${escaparHtml(Number(salida.monto).toFixed(2))}</td>
                    <td>${escaparHtml(fecha)}</td>
                    <td>
                        ${rutaFoto
                    ? `<img src="${escaparHtml(rutaFoto)}" class="foto-factura-mini" data-bs-toggle="modal" data-bs-target="#modalFoto" data-src="${escaparHtml(rutaFoto)}" alt="Foto de factura">`
                    : '<span class="text-muted">Sin foto</span>'}
                    </td>
                </tr>
            `;
        }).join('');

        res.send(`
            ${encabezado('Salidas registradas')}
            <div class="container tabla-finanzas">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h4 class="m-0">Salidas registradas</h4>
                    <a href="/registrar-salida" class="btn btn-entrada text-white">Nueva salida</a>
                </div>
                <table class="table table-hover bg-white shadow-sm rounded">
                    <thead class="table-light">
                        <tr>
                            <th>Tipo</th>
                            <th>Monto</th>
                            <th>Fecha</th>
                            <th>Foto de factura</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filas}
                    </tbody>
                </table>
            </div>

            <div class="modal fade" id="modalFoto" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-body p-0">
                            <img id="imagenModal" src="" class="w-100 rounded" alt="Foto de factura ampliada">
                        </div>
                    </div>
                </div>
            </div>

            <script>
                document.querySelectorAll('.foto-factura-mini').forEach(img => {
                    img.addEventListener('click', () => {
                        document.getElementById('imagenModal').src = img.dataset.src;
                    });
                });
            </script>
            ${pieDePagina}
        `);
    });
});

module.exports = router;
