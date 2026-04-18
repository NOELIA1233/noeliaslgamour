// ══════════════════════════════════════════════════════════════
//  routes/ubicaciones.js
//  Endpoint AJAX — tabla `ubicaciones` de noelias_glamour
//
//  GET /api/ubicaciones?tipo=pais
//  GET /api/ubicaciones?tipo=provincia&padre=1
//  GET /api/ubicaciones?tipo=canton&padre=10
//  GET /api/ubicaciones?tipo=distrito&padre=100
// ══════════════════════════════════════════════════════════════

const express = require('express');
const router  = express.Router();
const { db } = require('../config/db');

const TIPOS_VALIDOS = ['pais', 'provincia', 'canton', 'distrito'];

// GET /api/ubicaciones?tipo=X[&padre=Y]
router.get('/', (req, res) => {
  const { tipo, padre } = req.query;

  // ── Validar tipo ─────────────────────────────────────────
  if (!tipo || !TIPOS_VALIDOS.includes(tipo)) {
    return res.status(400).json({
      success: false,
      message: 'Parámetro tipo no válido. Use: pais, provincia, canton, distrito'
    });
  }

  // ── Consulta SQL ─────────────────────────────────────────
  let sql;
  let params;

  if (tipo === 'pais') {
    // Países no tienen padre
    sql    = "SELECT id, nombre FROM ubicaciones WHERE tipo = 'pais' ORDER BY nombre";
    params = [];
  } else {
    // Los demás niveles requieren id_padre
    if (!padre || isNaN(parseInt(padre))) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el parámetro padre para tipo: ' + tipo
      });
    }
    sql    = 'SELECT id, nombre FROM ubicaciones WHERE tipo = ? AND id_padre = ? ORDER BY nombre';
    params = [tipo, parseInt(padre)];
  }

  // ── Ejecutar query ────────────────────────────────────────
  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('❌ Error en ubicaciones:', err);
      return res.status(500).json({
        success: false,
        message: 'Error al consultar ubicaciones'
      });
    }
    // Devuelve array directo: [{id, nombre}, ...]
    res.json(results);
  });
});

module.exports = router;