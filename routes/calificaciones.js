const express = require("express");
const router = express.Router();
const { db } = require('../config/db');

/// ⭐ Crear calificación
router.post("/", (req, res) => {
  const { id_cita, estrellas, comentario } = req.body;

  if (!id_cita || !estrellas) {
    return res.json({
      success: false,
      message: "Faltan datos obligatorios",
    });
  }

  const sql = `
    INSERT INTO calificaciones (id_cita, estrellas, comentario, fecha)
    VALUES (?, ?, ?, NOW())
  `;

  db.query(sql, [id_cita, estrellas, comentario], (err, result) => {
    if (err) {
      console.error("Error al insertar calificación:", err);
      return res.json({ success: false });
    }

    res.json({
      success: true,
      message: "Calificación registrada correctamente",
    });
  });
});

/// ⭐ Obtener calificaciones por cita
router.get("/:id_cita", (req, res) => {
  const { id_cita } = req.params;

  const sql = `
    SELECT * FROM calificaciones
    WHERE id_cita = ?
  `;

  db.query(sql, [id_cita], (err, results) => {
    if (err) return res.json({ success: false });

    res.json({
      success: true,
      calificaciones: results,
    });
  });
});

module.exports = router;