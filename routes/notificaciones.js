const express = require("express");
const router = express.Router();
const { db } = require('../config/db');

// 🔹 Obtener notificaciones por usuario
router.get("/usuario/:id", (req, res) => {
  const idUsuario = req.params.id;

  const sql = `
    SELECT *
    FROM notificaciones
    WHERE id_usuario = ?
    ORDER BY fecha_envio DESC
  `;

  db.query(sql, [idUsuario], (err, results) => {
    if (err) {
      console.error("Error al obtener notificaciones:", err);
      return res.status(500).json({
        success: false,
        message: "Error al obtener notificaciones",
        error: err
      });
    }

    res.json({
      success: true,
      data: results
    });
  });
});


// 🔹 Marcar notificación como leída
router.put("/leer/:id", (req, res) => {
  const idNotif = req.params.id;

  const sql = `
    UPDATE notificaciones
    SET leida = 1
    WHERE id_notificacion = ?
  `;

  db.query(sql, [idNotif], (err, result) => {
    if (err) {
      console.error("Error al actualizar notificación:", err);
      return res.status(500).json({
        success: false,
        message: "Error al actualizar notificación",
        error: err
      });
    }

    res.json({
      success: true,
      message: "Notificación marcada como leída"
    });
  });
});


// 🔹 Crear nueva notificación (opcional pero profesional 😉)
router.post("/", (req, res) => {
  const { id_usuario, id_cita, tipo, mensaje } = req.body;

  const sql = `
    INSERT INTO notificaciones
    (id_usuario, id_cita, tipo, mensaje, leida, fecha_envio)
    VALUES (?, ?, ?, ?, 0, NOW())
  `;

  db.query(sql, [id_usuario, id_cita, tipo, mensaje], (err, result) => {
    if (err) {
      console.error("Error al crear notificación:", err);
      return res.status(500).json({
        success: false,
        message: "Error al crear notificación",
        error: err
      });
    }

    res.json({
      success: true,
      message: "Notificación creada",
      id_notificacion: result.insertId
    });
  });
});

module.exports = router;