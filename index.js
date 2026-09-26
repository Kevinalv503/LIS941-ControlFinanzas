const express = require('express');
const session = require('express-session');
require('dotenv').config();
const db = require('./db'); // Llamard a la conexión de base de datos
const requiereSesion = require('./middleware/auth');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'clave-temporal-control-finanzas',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 8
    }
}));

// Servir la carpeta uploads como publica, para poder ver las fotos de facturas
app.use('/uploads', requiereSesion, express.static('uploads'));

const rutasLogin = require('./routes/login');
const rutaDashboard = require('./routes/dashboard');
const rutasEntradas = require('./routes/entradas');
const rutasSalidas = require('./routes/salidas');
const rutasBalance = require('./routes/balance');
app.use('/', rutasLogin);
app.use('/', rutaDashboard);
app.use('/', rutasEntradas);
app.use('/', rutasSalidas);
app.use('/', rutasBalance);

app.get('/', (req, res) => {
    res.redirect(req.session && req.session.usuario ? '/dashboard' : '/login');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor Express corriendo en http://localhost:${PORT}`);
});

app.use(express.static('public'));