const express = require('express');
const router = express.Router();
const requiereSesion = require('../middleware/auth');

router.get('/dashboard', requiereSesion, (req, res) => {
    const usuario = req.session.usuario;

    res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Dashboard - Control de Finanzas</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
            <link href="/css/estilo.css" rel="stylesheet">
        </head>
        <body>
            <nav class="navbar navbar-finanzas navbar-dark mb-4">
                <div class="container">
                    <span class="navbar-brand">Control de Finanzas</span>
                    <form action="/logout" method="POST">
                        <button class="btn btn-outline-light btn-sm" type="submit">Cerrar sesión</button>
                    </form>
                </div>
            </nav>
            <main class="container dashboard">
                <h1 class="h3">Bienvenido, ${usuario.nombreUsuario}</h1>
                <p class="text-muted">Selecciona una opción para continuar.</p>
                <div class="row g-3 mt-3">
                    <div class="col-md-6">
                        <a class="dashboard-option" href="/registrar-entrada">
                            <strong>Registrar entrada</strong>
                            <span>Guarda un ingreso con su factura.</span>
                        </a>
                    </div>
                    <div class="col-md-6">
                        <a class="dashboard-option" href="/ver-entradas">
                            <strong>Ver entradas</strong>
                            <span>Consulta los ingresos registrados.</span>
                        </a>
                    </div>
                    <div class="col-md-6">
                        <a class="dashboard-option" href="/balance">
                            <strong>Mostrar balance</strong>
                            <span>Reporte de entradas vs. salidas con gráfico y PDF.</span>
                        </a>
                    </div>
                </div>
            </main>
        </body>
        </html>
    `);
});

module.exports = router;
