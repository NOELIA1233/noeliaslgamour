const express = require('express');
const router = express.Router();
const https = require('https');

// GET /api/divisas
router.get('/', (req, res) => {
    const url = 'https://open.er-api.com/v6/latest/USD';

    https.get(url, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
            try {
                const json = JSON.parse(data);
                res.json({
                    success: true,
                    base: 'USD',
                    CRC: json.rates.CRC,  // Colones
                    EUR: json.rates.EUR,  // Euros
                    MXN: json.rates.MXN,  // Pesos mexicanos
                    actualizado: json.time_last_update_utc
                });
            } catch (e) {
                res.status(500).json({ success: false, message: 'Error obteniendo divisas' });
            }
        });
    }).on('error', () => {
        res.status(500).json({ success: false, message: 'Error de conexión' });
    });
});

module.exports = router;