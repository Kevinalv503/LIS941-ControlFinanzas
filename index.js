const express = require('express');
require('dotenv').config();
const db = require('./db'); // Llamard a la conexión de base de datos

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ruta de prueban
app.get('/', (req, res) => {
    res.send('El servidor con Express está funcionando perfectamente.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor Express corriendo en http://localhost:${PORT}`);
});