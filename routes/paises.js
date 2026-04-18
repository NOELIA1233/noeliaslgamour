const express = require('express');
const router = express.Router();
const https = require('https');

// GET /api/paises/:codigo  (ejemplo: /api/paises/CR)
router.get('/:codigo', (req, res) => {
    const codigo = req.params.codigo.toUpperCase();
    const url = `https://restcountries.com/v3.1/alpha/${codigo}`;

    https.get(url, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
            try {
                const json = JSON.parse(data);
                const pais = json[0];
                res.json({
                    success: true,
                    nombre: pais.name.common,
                    capital: pais.capital?.[0],
                    poblacion: pais.population,
                    moneda: Object.values(pais.currencies)?.[0]?.name,
                    bandera: pais.flags.png,
                    idioma: Object.values(pais.languages)?.[0],
                    region: pais.region
                });
            } catch (e) {
                res.status(500).json({ success: false, message: 'País no encontrado' });
            }
        });
    }).on('error', () => {
        res.status(500).json({ success: false, message: 'Error de conexión' });
    });
});

module.exports = router;