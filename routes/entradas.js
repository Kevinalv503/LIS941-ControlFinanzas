// Rutas para el modulo de Entradas

const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const Entradas = require('../models/Entradas');
const requiereSesion = require('../middleware/auth');

router.use(requiereSesion);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/facturas');
    },
    filename: (req, file, cb) => {
        const nombreUnico = Date.now() + path.extname(file.originalname);
        cb(null, nombreUnico);
    }
});

const upload = multer({ storage });

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
                    <span class="navbar-brand">Control de Finanzas</span>
                </div>
            </nav>
    `;
}

const pieDePagina = `
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
        </body>
        </html>
`;

// GET -> muestra el formulario para registrar una entrada
router.get('/registrar-entrada', (req, res) => {
    res.send(`
        ${encabezado('Registrar entrada')}
        <div class="container">
            <div class="card tarjeta-formulario p-4">
                <h4 class="mb-3">Registrar entrada</h4>
                <form action="/registrar-entrada" method="POST" enctype="multipart/form-data">
                    <div class="mb-3">
                        <label class="form-label">Tipo de entrada</label>
                        <input type="text" class="form-control" name="tipo" placeholder="Ej. Sueldo, remesa..." required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Monto</label>
                        <input type="number" step="0.01" class="form-control" name="monto" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Fecha</label>
                        <input type="date" class="form-control" name="fecha" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Factura (foto)</label>
                        <input type="file" class="form-control" name="foto" accept="image/*" required>
                    </div>
                    <button type="submit" class="btn btn-entrada text-white w-100">Guardar entrada</button>
                </form>
            </div>
        </div>
        ${pieDePagina}
    `);
});

// POST -> procesa el formulario, sube la foto y guarda la entrada
router.post('/registrar-entrada', upload.single('foto'), (req, res) => {
    const datos = {
        tipo: req.body.tipo,
        monto: req.body.monto,
        fecha: req.body.fecha,
        rutaFoto: req.file ? req.file.path : null
    };

    Entradas.crear(datos, (err) => {
        if (err) {
            console.error('Error al guardar la entrada:', err);
            return res.status(500).send('Ocurrio un error al guardar la entrada.');
        }
        res.redirect('/ver-entradas');
    });
});

// GET -> muestra la tabla con todas las entradas registradas
router.get('/ver-entradas', (req, res) => {
    Entradas.obtenerTodas((err, entradas) => {
        if (err) {
            console.error('Error al obtener las entradas:', err);
            return res.status(500).send('Ocurrio un error al cargar las entradas.');
        }

        const filas = entradas.map(e => {
            // Formateamos la fecha para que se vea como dd/mm/aaaa en vez del timestamp completo
            const fecha = new Date(e.fecha).toLocaleDateString('es-ES');

            return `
                <tr>
                    <td>${e.tipo}</td>
                    <td>$${e.monto}</td>
                    <td>${fecha}</td>
                    <td>
                        ${e.ruta_foto
                    ? `<img src="/${e.ruta_foto}" class="foto-factura-mini" data-bs-toggle="modal" data-bs-target="#modalFoto" data-src="/${e.ruta_foto}">`
                    : '<span class="text-muted">Sin foto</span>'}
                    </td>
                </tr>
            `;
        }).join('');

        res.send(`
            ${encabezado('Entradas registradas')}
            <div class="container tabla-finanzas">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h4 class="m-0">Entradas registradas</h4>
                    <a href="/registrar-entrada" class="btn btn-entrada text-white">Nueva entrada</a>
                </div>
                <table class="table table-hover bg-white shadow-sm rounded">
                    <thead class="table-light">
                        <tr>
                            <th>Tipo</th>
                            <th>Monto</th>
                            <th>Fecha</th>
                            <th>Factura</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filas}
                    </tbody>
                </table>
            </div>

            <!-- Modal para ver la foto en grande al hacer clic -->
            <div class="modal fade" id="modalFoto" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-body p-0">
                            <img id="imagenModal" src="" class="w-100 rounded">
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