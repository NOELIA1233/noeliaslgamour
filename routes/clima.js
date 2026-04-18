const express = require('express');
const router = express.Router();
const https = require('https');

// GET /api/clima
router.get('/', (req, res) => {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    const ciudad = process.env.OPENWEATHER_CIUDAD || 'San Jose,CR';
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(ciudad)}&appid=${apiKey}&units=metric&lang=es`;

    https.get(url, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
            try {
                const json = JSON.parse(data);

                if (json.cod !== 200) {
                    return res.status(400).json({ success: false, message: json.message });
                }

                res.json({
                    success: true,
                    ciudad: json.name,
                    temperatura: Math.round(json.main.temp),
                    sensacion: Math.round(json.main.feels_like),
                    descripcion: json.weather[0].description,
                    icono: `https://openweathermap.org/img/wn/${json.weather[0].icon}@2x.png`,
                    humedad: json.main.humidity,
                    viento: json.wind.speed,
                    recomendacion: generarRecomendacion(json.weather[0].main, json.main.temp)
                });
            } catch (e) {
                res.status(500).json({ success: false, message: 'Error procesando datos del clima' });
            }
        });
    }).on('error', (err) => {
        res.status(500).json({ success: false, message: 'Error consultando clima' });
    });
});

function generarRecomendacion(clima, temp) {
    if (clima === 'Rain' || clima === 'Drizzle' || clima === 'Thunderstorm') {
        return '🌧️ Está lloviendo. ¡Recordá llevar paraguas a tu cita!';
    } else if (clima === 'Clear' && temp > 28) {
        return '☀️ Día muy soleado y caluroso. Ideal para lucir tu nuevo look!';
    } else if (clima === 'Clear') {
        return '🌤️ Día despejado. ¡Perfecto para tu cita en el salón!';
    } else if (clima === 'Clouds') {
        return '⛅ Día nublado pero tranquilo. Te esperamos con gusto!';
    } else {
        return '🌈 Cualquier clima es bueno para verse bien!';
    }
}

module.exports = router;