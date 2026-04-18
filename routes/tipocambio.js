const express = require('express');
const router = express.Router();
const https = require('https');

function obtenerUltimoDiaHabil() {
    const hoy = new Date();
    let fecha = new Date(hoy);
    
    if (hoy.getDay() === 6) fecha.setDate(hoy.getDate() - 1);
    else if (hoy.getDay() === 0) fecha.setDate(hoy.getDate() - 2);
    
    const anio = fecha.getFullYear();
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const dia = fecha.getDate().toString().padStart(2, '0');
    return `${anio}/${mes}/${dia}`;
}

function obtenerIndicador(codigo) {
    const fecha = obtenerUltimoDiaHabil();
    const url = `https://apim.bccr.fi.cr/SDDE/api/Bccr.GE.SDDE.Publico.Indicadores.API/indicadoresEconomicos/${codigo}/series?fechaInicio=${fecha}&fechaFin=${fecha}&idioma=ES`;

    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'Authorization': `Bearer ${process.env.BCCR_TOKEN}`,
                'User-Agent': 'NoeliasGlamour/1.0'
            }
        };

        https.get(url, options, (response) => {
            let data = '';
            response.on('data', chunk => data += chunk);
            response.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.estado && json.datos && json.datos[0] && json.datos[0].series) {
                        resolve(parseFloat(json.datos[0].series[0].valorDatoPorPeriodo));
                    } else {
                        resolve(null);
                    }
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

router.get('/', async (req, res) => {
    try {
        const [compra, venta] = await Promise.all([
            obtenerIndicador(317),
            obtenerIndicador(318)
        ]);

        res.json({
            success: true,
            compra,
            venta,
            fecha: new Date().toISOString(),
            moneda: 'USD'
        });
    } catch (error) {
        console.error('❌ Error BCCR:', error);
        res.status(500).json({ success: false, message: 'Error al consultar BCCR' });
    }
});

module.exports = router;