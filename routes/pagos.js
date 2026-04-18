const express = require("express");
const router = express.Router();
const { db } = require('../config/db');

// ✅ Obtener todas las citas pendientes o confirmadas
router.get("/citas", (req, res) => {
  const sql = `
    SELECT id_cita, mensaje, estado
    FROM citas
    WHERE estado != 'cancelada'
  `;

  db.query(sql, (err, results) => {
    if (err) return res.json({ success: false, error: err });
    res.json({ success: true, citas: results });
  });
});

// ✅ Crear pago
router.post("/", (req, res) => {
  const { id_cita, monto, metodo_pago } = req.body;

  const sql = `
    INSERT INTO pagos 
    (id_cita, monto, metodo_pago, estado, fecha_pago)
    VALUES (?, ?, ?, 'completado', NOW())
  `;

  db.query(sql, [id_cita, monto, metodo_pago], (err, result) => {
    if (err) return res.json({ success: false, error: err });

    res.json({ success: true, id_pago: result.insertId });
  });
});

// ✅ Ver todos los pagos
router.get("/", (req, res) => {
  const sql = `
    SELECT p.*, c.mensaje 
    FROM pagos p
    JOIN citas c ON p.id_cita = c.id_cita
    ORDER BY p.fecha_pago DESC
  `;

  db.query(sql, (err, results) => {
    if (err) return res.json({ success: false, error: err });
    res.json({ success: true, pagos: results });
  });
});

module.exports = router;