const express = require('express');
const router = express.Router();
const { db } = require('../config/db');


// =====================================
// HISTORIAL DE CITAS POR USUARIO
// =====================================
router.get('/usuario/:id', (req, res) => {
  const { id } = req.params;

  const query = `
    SELECT 
      id_cita,
      id_usuario,
      id_servicio,
      fecha,
      hora,
      mensaje,
      estado,
      observaciones,
      fecha_creacion
    FROM citas
    WHERE id_usuario = ?
    ORDER BY fecha DESC, hora DESC
  `;

  db.query(query, [id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({
        success: false,
        message: "Error al obtener historial"
      });
    }

    res.json({
      success: true,
      citas: results
    });
  });
});

// =====================================
// CANCELAR CITA
// =====================================
router.put('/cancelar/:id', (req, res) => {
  const { id } = req.params;

  db.query(
    "SELECT estado FROM citas WHERE id_cita = ?",
    [id],
    (err, results) => {

      if (err) {
        console.error("ERROR SQL:", err);
        return res.status(500).json({
          success: false,
          message: "Error del servidor"
        });
      }

      if (results.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Cita no encontrada"
        });
      }

      const estadoActual = results[0].estado;

      if (estadoActual === 'cancelada') {
        return res.json({
          success: false,
          message: "La cita ya está cancelada"
        });
      }

      if (estadoActual === 'completada') {
        return res.json({
          success: false,
          message: "No se puede cancelar una cita completada"
        });
      }

      db.query(
        "UPDATE citas SET estado = 'cancelada' WHERE id_cita = ?",
        [id],
        (err2) => {

          if (err2) {
            console.error("ERROR SQL:", err2);
            return res.status(500).json({
              success: false,
              message: "Error al cancelar"
            });
          }

          res.json({
            success: true,
            message: "Cita cancelada correctamente"
          });
        }
      );
    }
  );
});


// =====================================
// MODIFICAR CITA
// =====================================
router.put('/modificar/:id', (req, res) => {
  const { id } = req.params;
  const { fecha, hora } = req.body;

  if (!fecha || !hora) {
    return res.status(400).json({
      success: false,
      message: "Fecha y hora son obligatorias"
    });
  }

  db.query(
    "SELECT estado FROM citas WHERE id_cita = ?",
    [id],
    (err, results) => {

      if (err) {
        console.error("ERROR SQL:", err);
        return res.status(500).json({
          success: false,
          message: "Error del servidor"
        });
      }

      if (results.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Cita no encontrada"
        });
      }

      const estadoActual = results[0].estado;

      if (estadoActual === 'cancelada' || estadoActual === 'completada') {
        return res.json({
          success: false,
          message: "No se puede modificar esta cita"
        });
      }

      db.query(
        "UPDATE citas SET fecha = ?, hora = ?, estado = 'pendiente' WHERE id_cita = ?",
        [fecha, hora, id],
        (err2) => {

          if (err2) {
            console.error("ERROR SQL:", err2);
            return res.status(500).json({
              success: false,
              message: "Error al modificar cita"
            });
          }

          res.json({
            success: true,
            message: "Cita modificada correctamente"
          });
        }
      );
    }
  );
});


// =====================================
// CREAR CITA (AGENDAR)
// =====================================
router.post('/crear', (req, res) => {
  const { id_usuario, id_servicio, fecha, hora, mensaje } = req.body;

  if (!id_usuario || !id_servicio || !fecha || !hora) {
    return res.status(400).json({
      success: false,
      message: "Datos incompletos"
    });
  }

  const query = `
    INSERT INTO citas 
    (id_usuario, id_servicio, fecha, hora, mensaje, estado)
    VALUES (?, ?, ?, ?, ?, 'pendiente')
  `;

  db.query(
    query,
    [id_usuario, id_servicio, fecha, hora, mensaje || null],
    (err, result) => {

      if (err) {
        console.error("ERROR SQL:", err);
        return res.status(500).json({
          success: false,
          message: "Error al crear la cita"
        });
      }

      res.json({
        success: true,
        message: "Cita creada correctamente",
        id_cita: result.insertId
      });
    }
  );
});


router.get('/admin', (req, res) => {

  const query = `
    SELECT 
      c.id_cita,
      u.nombre,
      u.telefono,
      u.email AS correo,
      s.nombre AS servicio,
      c.fecha,
      c.hora,
      s.duracion_min,
      c.estado,
      c.observaciones
    FROM citas c
    JOIN usuarios u ON c.id_usuario = u.id_usuario
    JOIN servicios s ON c.id_servicio = s.id_servicio
    ORDER BY c.fecha, c.hora
  `;

  db.query(query, (err, rows) => {

    if (err) {
      console.error("ERROR SQL:", err);
      return res.status(500).json({
        success: false,
        message: err.message
      });
    }

    res.json({
      success: true,
      citas: rows
    });

  });

});


// =====================================
// FINALIZAR CITA
// =====================================
router.put('/finalizar/:id', (req, res) => {
  const { id } = req.params;

  // Verificamos si la cita existe
  db.query(
    "SELECT estado FROM citas WHERE id_cita = ?",
    [id],
    (err, results) => {
      if (err) {
        console.error("ERROR SQL:", err);
        return res.status(500).json({
          success: false,
          message: "Error del servidor"
        });
      }

      if (results.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Cita no encontrada"
        });
      }

      const estadoActual = results[0].estado;

      // Solo se puede finalizar una cita que no esté cancelada o ya completada
      if (estadoActual === 'cancelada' || estadoActual === 'completada') {
        return res.json({
          success: false,
          message: "La cita ya está finalizada o cancelada"
        });
      }

      // Actualizamos la cita a "finalizada"
      db.query(
        "UPDATE citas SET estado = 'completada' WHERE id_cita = ?",
        [id],
        (err2) => {
          if (err2) {
            console.error("ERROR SQL:", err2);
            return res.status(500).json({
              success: false,
              message: "Error al finalizar cita"
            });
          }

          res.json({
            success: true,
            message: "Cita finalizada correctamente"
          });
        }
      );
    }
  );
});





// =====================================
module.exports = router;