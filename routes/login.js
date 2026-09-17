const express = require('express');
const router = express.Router();
const Login = require('../models/Login');

function pagina(titulo, contenido) {
    return `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>${titulo} - Control de Finanzas</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
            <link href="/css/estilo.css" rel="stylesheet">
        </head>
        <body>${contenido}</body>
        </html>
    `;
}

router.get('/login', (req, res) => {
    if (req.session && req.session.usuario) {
        return res.redirect('/dashboard');
    }

    const mensaje = req.query.error
        ? '<div class="alert alert-danger">Usuario o contraseña incorrectos.</div>'
        : '';

    res.send(pagina('Iniciar sesión', `
        <main class="container">
            <div class="card tarjeta-formulario p-4 login-card">
                <h1 class="h4 mb-3">Iniciar sesión</h1>
                ${mensaje}
                <form action="/login" method="POST">
                    <div class="mb-3">
                        <label class="form-label" for="nombre_usuario">Usuario</label>
                        <input class="form-control" id="nombre_usuario" name="nombre_usuario" required autofocus>
                    </div>
                    <div class="mb-3">
                        <label class="form-label" for="password">Contraseña</label>
                        <input class="form-control" id="password" name="password" type="password" required>
                    </div>
                    <button class="btn btn-entrada text-white w-100" type="submit">Entrar</button>
                </form>
            </div>
        </main>
    `));
});

router.post('/login', (req, res) => {
    const { nombre_usuario: nombreUsuario, password } = req.body;

    Login.buscarPorUsuario(nombreUsuario, (err, usuario) => {
        if (err) {
            console.error('Error al validar el usuario:', err);
            return res.status(500).send('Ocurrio un error al iniciar sesión.');
        }

        if (!usuario || usuario.password !== password) {
            return res.redirect('/login?error=1');
        }

        req.session.usuario = {
            id: usuario.id,
            nombreUsuario: usuario.nombre_usuario
        };
        res.redirect('/dashboard');
    });
});

router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Ocurrio un error al cerrar sesión.');
        }
        res.clearCookie('connect.sid');
        res.redirect('/login');
    });
});

module.exports = router;
