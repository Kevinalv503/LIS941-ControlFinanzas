// Rutas para el modulo de Balance y Reporte
//   GET /balance       -> pagina con tablas, balance y grafico de pastel
//   GET /balance/pdf   -> descarga el mismo reporte en PDF

const express = require('express');
const PDFDocument = require('pdfkit');
const router = express.Router();
const ReporteBalance = require('../models/ReporteBalance');
const requiereSesion = require('../middleware/auth');

router.use('/balance', requiereSesion);

// Colores del sistema (los mismos de estilo.css)
const COLOR = {
    oscuro: '#16342e',
    entrada: '#1f6f54',
    salida: '#c0392b',
    texto: '#1f2a27',
    gris: '#6c757d',
    borde: '#dfe5e1',
    fondoSuave: '#f5f6f4'
};

// Evita que un texto guardado en la BD se interprete como HTML
function escaparHtml(texto) {
    return String(texto)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Arma el querystring de las fechas para reutilizarlo en el enlace del PDF
function queryFechas(reporte) {
    const params = new URLSearchParams();
    if (reporte.desde) params.set('desde', reporte.desde);
    if (reporte.hasta) params.set('hasta', reporte.hasta);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
}

// Primer y ultimo dia del mes actual (para el boton "Este mes")
function rangoMesActual() {
    const hoy = new Date();
    const y = hoy.getFullYear();
    const m = hoy.getMonth();
    const dosDigitos = n => String(n).padStart(2, '0');
    const ultimoDia = new Date(y, m + 1, 0).getDate();
    return {
        desde: `${y}-${dosDigitos(m + 1)}-01`,
        hasta: `${y}-${dosDigitos(m + 1)}-${dosDigitos(ultimoDia)}`
    };
}

// Filas HTML de una tabla (entradas o salidas)
function filasTabla(registros) {
    if (!registros.length) {
        return '<tr><td colspan="3" class="text-center text-muted py-3">Sin registros en este periodo</td></tr>';
    }
    return registros.map(r => `
        <tr>
            <td>${escaparHtml(r.tipo)}</td>
            <td>${ReporteBalance.formatoFecha(r.fecha)}</td>
            <td class="text-end">${ReporteBalance.moneda(r.monto)}</td>
        </tr>
    `).join('');
}

// ---------------------------------------------------------
// GET /balance -> pagina del reporte
// ---------------------------------------------------------
router.get('/balance', (req, res) => {
    const reporte = new ReporteBalance(req.query.desde, req.query.hasta);

    reporte.generar((err) => {
        if (err) {
            console.error('Error al generar el balance:', err);
            return res.status(500).send('Ocurrio un error al generar el balance.');
        }

        const mes = rangoMesActual();
        const claseBalance = reporte.balance >= 0 ? 'balance-positivo' : 'balance-negativo';
        const hayDatos = reporte.totalEntradas + reporte.totalSalidas > 0;

        res.send(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>Balance - Control de Finanzas</title>
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

                <main class="container reporte">
                    <!-- Filtro por rango de fechas -->
                    <form class="card filtro-reporte p-3 mb-4" method="GET" action="/balance">
                        <div class="row g-2 align-items-end">
                            <div class="col-sm-4">
                                <label class="form-label small mb-1" for="desde">Desde</label>
                                <input class="form-control" type="date" id="desde" name="desde" value="${reporte.desde || ''}">
                            </div>
                            <div class="col-sm-4">
                                <label class="form-label small mb-1" for="hasta">Hasta</label>
                                <input class="form-control" type="date" id="hasta" name="hasta" value="${reporte.hasta || ''}">
                            </div>
                            <div class="col-sm-4 d-flex gap-2">
                                <button class="btn btn-entrada text-white flex-fill" type="submit">Filtrar</button>
                                <a class="btn btn-outline-secondary" href="/balance?desde=${mes.desde}&hasta=${mes.hasta}">Este mes</a>
                                <a class="btn btn-outline-secondary" href="/balance">Todo</a>
                            </div>
                        </div>
                    </form>

                    <!-- Reporte -->
                    <section class="card tarjeta-reporte mb-4">
                        <div class="card-body p-4">
                            <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
                                <h1 class="h4 m-0">Reporte de balance <span class="text-muted fw-normal">${reporte.periodo}</span></h1>
                                <a class="btn btn-exportar" href="/balance/pdf${queryFechas(reporte)}">Exportar a PDF</a>
                            </div>

                            <!-- Tarjetas resumen -->
                            <div class="row g-3 mb-4">
                                <div class="col-md-4">
                                    <div class="resumen resumen-entradas">
                                        <span>Total entradas</span>
                                        <strong>${ReporteBalance.moneda(reporte.totalEntradas)}</strong>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="resumen resumen-salidas">
                                        <span>Total salidas</span>
                                        <strong>${ReporteBalance.moneda(reporte.totalSalidas)}</strong>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="resumen ${claseBalance}">
                                        <span>Balance (entradas − salidas)</span>
                                        <strong>${ReporteBalance.moneda(reporte.balance)}</strong>
                                    </div>
                                </div>
                            </div>

                            <!-- Tablas lado a lado -->
                            <div class="row g-4">
                                <div class="col-lg-6">
                                    <h2 class="h6 titulo-tabla titulo-entradas">Entradas</h2>
                                    <table class="table table-sm tabla-reporte">
                                        <thead><tr><th>Tipo</th><th>Fecha</th><th class="text-end">Monto</th></tr></thead>
                                        <tbody>${filasTabla(reporte.entradas)}</tbody>
                                        <tfoot><tr><th colspan="2">TOTAL</th><th class="text-end">${ReporteBalance.moneda(reporte.totalEntradas)}</th></tr></tfoot>
                                    </table>
                                </div>
                                <div class="col-lg-6">
                                    <h2 class="h6 titulo-tabla titulo-salidas">Salidas</h2>
                                    <table class="table table-sm tabla-reporte">
                                        <thead><tr><th>Tipo</th><th>Fecha</th><th class="text-end">Monto</th></tr></thead>
                                        <tbody>${filasTabla(reporte.salidas)}</tbody>
                                        <tfoot><tr><th colspan="2">TOTAL</th><th class="text-end">${ReporteBalance.moneda(reporte.totalSalidas)}</th></tr></tfoot>
                                    </table>
                                </div>
                            </div>

                            <p class="balance-final ${claseBalance}">Balance: ${ReporteBalance.moneda(reporte.balance)}</p>
                        </div>
                    </section>

                    <!-- Grafico de pastel -->
                    <section class="card tarjeta-reporte mb-5">
                        <div class="card-body p-4">
                            <h2 class="h5 text-center mb-3">Gráfico de balance: Entradas vs Salidas</h2>
                            ${hayDatos
                                ? '<div class="contenedor-grafico"><canvas id="graficoBalance"></canvas></div>'
                                : '<p class="text-center text-muted m-0">No hay datos para graficar en este periodo.</p>'}
                        </div>
                    </section>
                </main>

                <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"></script>
                <script>
                    (function () {
                        const canvas = document.getElementById('graficoBalance');
                        if (!canvas) return;

                        const totales = [${reporte.totalEntradas}, ${reporte.totalSalidas}];
                        const porcentajes = [${reporte.porcentajeEntradas.toFixed(1)}, ${reporte.porcentajeSalidas.toFixed(1)}];

                        new Chart(canvas, {
                            type: 'pie',
                            data: {
                                labels: ['Entradas (' + porcentajes[0] + '%)', 'Salidas (' + porcentajes[1] + '%)'],
                                datasets: [{
                                    data: totales,
                                    backgroundColor: ['${COLOR.entrada}', '${COLOR.salida}'],
                                    borderColor: '#ffffff',
                                    borderWidth: 2
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { position: 'bottom' },
                                    tooltip: {
                                        callbacks: {
                                            label: (ctx) => ' $' + Number(ctx.raw).toLocaleString('en-US', { minimumFractionDigits: 2 }) + ' (' + porcentajes[ctx.dataIndex] + '%)'
                                        }
                                    }
                                }
                            }
                        });
                    })();
                </script>
            </body>
            </html>
        `);
    });
});

// ---------------------------------------------------------
// GET /balance/pdf -> reporte en PDF (generado en el servidor con PDFKit)
// ---------------------------------------------------------
router.get('/balance/pdf', (req, res) => {
    const reporte = new ReporteBalance(req.query.desde, req.query.hasta);

    reporte.generar((err) => {
        if (err) {
            console.error('Error al generar el PDF:', err);
            return res.status(500).send('Ocurrio un error al generar el PDF.');
        }

        const nombreArchivo = `reporte-balance-${new Date().toISOString().slice(0, 10)}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);

        const doc = new PDFDocument({ size: 'LETTER', margin: 50, bufferPages: true });
        doc.pipe(res);

        dibujarPdf(doc, reporte, req.session.usuario);
        doc.end();
    });
});

// ---------------------------------------------------------
// Funciones de dibujo del PDF
// ---------------------------------------------------------
function dibujarPdf(doc, reporte, usuario) {
    const izquierda = doc.page.margins.left;
    const ancho = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // Encabezado con franja de color
    doc.rect(0, 0, doc.page.width, 90).fill(COLOR.oscuro);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(20)
        .text('Reporte de Balance', izquierda, 28, { width: ancho });
    doc.font('Helvetica').fontSize(11).fillColor('#cfe0d8')
        .text(`Periodo: ${reporte.periodo}`, izquierda, 56, { width: ancho });

    // Datos de generacion
    doc.fillColor(COLOR.gris).fontSize(9)
        .text(`Generado el ${ReporteBalance.formatoFecha(new Date())} por ${usuario ? usuario.nombreUsuario : 'usuario'}`,
            izquierda, 105, { width: ancho, align: 'right' });

    // Tarjetas resumen
    let y = 125;
    const anchoTarjeta = (ancho - 20) / 3;
    const tarjetas = [
        { titulo: 'Total entradas', valor: reporte.totalEntradas, color: COLOR.entrada },
        { titulo: 'Total salidas', valor: reporte.totalSalidas, color: COLOR.salida },
        { titulo: 'Balance', valor: reporte.balance, color: reporte.balance >= 0 ? COLOR.oscuro : COLOR.salida }
    ];
    tarjetas.forEach((t, i) => {
        const x = izquierda + i * (anchoTarjeta + 10);
        doc.roundedRect(x, y, anchoTarjeta, 55, 6).fill(COLOR.fondoSuave);
        doc.rect(x, y, 4, 55).fill(t.color);
        doc.fillColor(COLOR.gris).font('Helvetica').fontSize(9).text(t.titulo, x + 14, y + 12);
        doc.fillColor(t.color).font('Helvetica-Bold').fontSize(15).text(ReporteBalance.moneda(t.valor), x + 14, y + 27);
    });
    y += 80;

    // Tablas
    y = dibujarTabla(doc, 'Entradas', reporte.entradas, reporte.totalEntradas, COLOR.entrada, y);
    y = dibujarTabla(doc, 'Salidas', reporte.salidas, reporte.totalSalidas, COLOR.salida, y + 20);

    // Balance resultante
    y = asegurarEspacio(doc, y + 15, 40);
    doc.roundedRect(izquierda, y, ancho, 34, 6).fill(reporte.balance >= 0 ? '#e6f2ec' : '#f9e3e0');
    doc.fillColor(reporte.balance >= 0 ? COLOR.entrada : COLOR.salida).font('Helvetica-Bold').fontSize(13)
        .text(`Balance (entradas - salidas): ${ReporteBalance.moneda(reporte.balance)}`, izquierda, y + 11, { width: ancho, align: 'center' });
    y += 55;

    // Grafico de pastel
    y = asegurarEspacio(doc, y, 260);
    dibujarGraficoPastel(doc, reporte, y);

    // Numero de pagina en el pie de cada hoja
    const rango = doc.bufferedPageRange();
    for (let i = rango.start; i < rango.start + rango.count; i++) {
        doc.switchToPage(i);
        const pieY = doc.page.height - 35;
        const margenInferior = doc.page.margins.bottom;
        doc.page.margins.bottom = 0; // permite escribir en el pie sin saltar de pagina
        doc.fillColor(COLOR.gris).font('Helvetica').fontSize(8)
            .text(`Control de Finanzas - Página ${i + 1} de ${rango.count}`, izquierda, pieY, { width: ancho, align: 'center' });
        doc.page.margins.bottom = margenInferior;
    }
}

// Si no cabe "alto" desde "y", agrega una pagina nueva y devuelve la nueva y
function asegurarEspacio(doc, y, alto) {
    const limite = doc.page.height - doc.page.margins.bottom - 20;
    if (y + alto > limite) {
        doc.addPage();
        return doc.page.margins.top;
    }
    return y;
}

// Dibuja una tabla con encabezado de color, filas alternadas y fila de total
function dibujarTabla(doc, titulo, registros, total, color, y) {
    const izquierda = doc.page.margins.left;
    const ancho = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const altoFila = 22;
    const columnas = [
        { nombre: 'Tipo', x: izquierda + 10, ancho: ancho * 0.5, align: 'left' },
        { nombre: 'Fecha', x: izquierda + ancho * 0.5, ancho: ancho * 0.25, align: 'left' },
        { nombre: 'Monto', x: izquierda + ancho * 0.75, ancho: ancho * 0.25 - 10, align: 'right' }
    ];

    const encabezado = (yy) => {
        doc.rect(izquierda, yy, ancho, altoFila).fill(color);
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(10);
        columnas.forEach(c => doc.text(c.nombre, c.x, yy + 7, { width: c.ancho, align: c.align }));
        return yy + altoFila;
    };

    y = asegurarEspacio(doc, y, 25 + altoFila * 2);
    doc.fillColor(color).font('Helvetica-Bold').fontSize(13).text(titulo, izquierda, y);
    y = encabezado(y + 20);

    if (!registros.length) {
        doc.rect(izquierda, y, ancho, altoFila).fill('#ffffff');
        doc.fillColor(COLOR.gris).font('Helvetica-Oblique').fontSize(10)
            .text('Sin registros en este periodo', izquierda, y + 7, { width: ancho, align: 'center' });
        y += altoFila;
    }

    registros.forEach((r, i) => {
        const nuevaY = asegurarEspacio(doc, y, altoFila * 2);
        if (nuevaY !== y) {
            y = encabezado(nuevaY); // repite el encabezado en la pagina nueva
        }
        doc.rect(izquierda, y, ancho, altoFila).fill(i % 2 === 0 ? '#ffffff' : COLOR.fondoSuave);
        doc.fillColor(COLOR.texto).font('Helvetica').fontSize(10);
        doc.text(String(r.tipo), columnas[0].x, y + 7, { width: columnas[0].ancho - 10, height: 12, ellipsis: true });
        doc.text(ReporteBalance.formatoFecha(r.fecha), columnas[1].x, y + 7, { width: columnas[1].ancho });
        doc.text(ReporteBalance.moneda(r.monto), columnas[2].x, y + 7, { width: columnas[2].ancho, align: 'right' });
        y += altoFila;
    });

    // Fila de total
    y = asegurarEspacio(doc, y, altoFila);
    doc.moveTo(izquierda, y).lineTo(izquierda + ancho, y).lineWidth(1).strokeColor(color).stroke();
    doc.fillColor(COLOR.texto).font('Helvetica-Bold').fontSize(10);
    doc.text('TOTAL', columnas[0].x, y + 7);
    doc.text(ReporteBalance.moneda(total), columnas[2].x, y + 7, { width: columnas[2].ancho, align: 'right' });
    return y + altoFila;
}

// Dibuja un grafico de pastel con su leyenda
function dibujarGraficoPastel(doc, reporte, y) {
    const izquierda = doc.page.margins.left;
    const ancho = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    doc.fillColor(COLOR.oscuro).font('Helvetica-Bold').fontSize(14)
        .text('Gráfico de balance: Entradas vs Salidas', izquierda, y, { width: ancho, align: 'center' });

    const radio = 90;
    const cx = izquierda + ancho / 2 - 90;
    const cy = y + 40 + radio;
    const suma = reporte.totalEntradas + reporte.totalSalidas;

    if (suma <= 0) {
        doc.fillColor(COLOR.gris).font('Helvetica-Oblique').fontSize(11)
            .text('No hay datos para graficar en este periodo.', izquierda, y + 40, { width: ancho, align: 'center' });
        return;
    }

    const partes = [
        { etiqueta: 'Entradas', valor: reporte.totalEntradas, pct: reporte.porcentajeEntradas, color: COLOR.entrada },
        { etiqueta: 'Salidas', valor: reporte.totalSalidas, pct: reporte.porcentajeSalidas, color: COLOR.salida }
    ];

    // Rebanadas (empezando arriba, sentido horario)
    let angulo = -Math.PI / 2;
    partes.forEach(p => {
        if (p.valor <= 0) return;
        const barrido = (p.valor / suma) * Math.PI * 2;
        if (barrido >= Math.PI * 2 - 0.0001) {
            doc.circle(cx, cy, radio).fill(p.color); // una sola parte = circulo completo
        } else {
            const x1 = cx + radio * Math.cos(angulo);
            const y1 = cy + radio * Math.sin(angulo);
            const x2 = cx + radio * Math.cos(angulo + barrido);
            const y2 = cy + radio * Math.sin(angulo + barrido);
            const arcoGrande = barrido > Math.PI ? 1 : 0;
            doc.path(`M ${cx} ${cy} L ${x1} ${y1} A ${radio} ${radio} 0 ${arcoGrande} 1 ${x2} ${y2} Z`).fill(p.color);
        }

        // Porcentaje dentro de la rebanada
        const medio = angulo + barrido / 2;
        const tx = cx + radio * 0.6 * Math.cos(medio);
        const ty = cy + radio * 0.6 * Math.sin(medio);
        if (p.pct >= 5) {
            doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(11)
                .text(`${p.pct.toFixed(1)}%`, tx - 25, ty - 6, { width: 50, align: 'center' });
        }
        angulo += barrido;
    });

    // Borde blanco entre rebanadas
    doc.circle(cx, cy, radio).lineWidth(2).strokeColor('#ffffff').stroke();

    // Leyenda a la derecha
    let ly = cy - 30;
    const lx = cx + radio + 40;
    partes.forEach(p => {
        doc.rect(lx, ly, 12, 12).fill(p.color);
        doc.fillColor(COLOR.texto).font('Helvetica-Bold').fontSize(11).text(p.etiqueta, lx + 20, ly);
        doc.font('Helvetica').fontSize(10).fillColor(COLOR.gris)
            .text(`${ReporteBalance.moneda(p.valor)} (${p.pct.toFixed(1)}%)`, lx + 20, ly + 14);
        ly += 42;
    });
}

module.exports = router;
