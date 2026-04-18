const express = require('express');
const router  = express.Router();
const { dbTSE } = require('../config/db');

router.get('/:cedula', (req, res) => {
  const { cedula } = req.params;

  if (!/^\d{5,20}$/.test(cedula)) {
    return res.status(400).json({
      success : false,
      message : 'Cédula inválida',
    });
  }

  const sql = `
    SELECT
      cedula,
      CONCAT(nombre, ' ', apellido1, ' ', apellido2) AS nombre_completo,
      nombre, apellido1, apellido2,
      fecha_nacimiento, sexo, nacionalidad, estado_civil,
      provincia, canton, distrito, direccion,
      centro_votacion, nombre_padre, nombre_madre
    FROM personas
    WHERE cedula = ?
    LIMIT 1
  `;

  dbTSE.query(sql, [cedula], (err, results) => {
    if (err) {
      console.error('❌ Error en consulta TSE:', err);
      return res.status(500).json({ success: false, message: 'Error interno' });
    }
    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'Cédula no encontrada' });
    }
    return res.json({ success: true, datos: results[0] });
  });
});

module.exports = router;