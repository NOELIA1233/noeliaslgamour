const express = require('express');
const router  = express.Router();
const { dbBanco: db } = require('../config/db');

// ============================================================
//  POST /api/banco/validar-tarjeta
//  Body: { numero, fecha_venc, cvv, monto }
//  Verifica que la tarjeta exista, esté activa, no vencida
//  y tenga saldo suficiente. Si todo pasa → descuenta el monto.
// ============================================================
router.post('/validar-tarjeta', (req, res) => {
  const { numero, fecha_venc, cvv, monto } = req.body;

  if (!numero || !fecha_venc || !cvv || !monto) {
    return res.status(400).json({
      success : false,
      message : 'Faltan datos: numero, fecha_venc, cvv, monto',
    });
  }

  // Limpiar número (por si viene con espacios)
  const numeroLimpio = numero.replace(/\s/g, '');

  const sql = `
    SELECT id_tarjeta, tipo, subtipo, nombre_titular,
           fecha_venc AS venc, cvv AS cvv_bd, saldo, activa
    FROM tarjetas
    WHERE numero = ?
    LIMIT 1
  `;

  db.query(sql, [numeroLimpio], (err, results) => {
    if (err) {
      console.error('❌ Error BD banco:', err);
      return res.status(500).json({ success: false, message: 'Error interno' });
    }

    // Tarjeta no existe
    if (results.length === 0) {
      return res.json({ success: false, message: 'Tarjeta no encontrada' });
    }

    const tarjeta = results[0];

    // Tarjeta inactiva (bloqueada)
    if (!tarjeta.activa) {
      return res.json({ success: false, message: 'Tarjeta bloqueada o inactiva' });
    }

    // Verificar CVV
    if (tarjeta.cvv_bd !== cvv.toString()) {
      return res.json({ success: false, message: 'CVV incorrecto' });
    }

    // Verificar fecha de vencimiento (formato MM/YY)
    const [mesVenc, anioVenc] = tarjeta.venc.split('/').map(Number);
    const hoy   = new Date();
    const anioH = hoy.getFullYear() % 100; // últimos 2 dígitos
    const mesH  = hoy.getMonth() + 1;

    if (anioVenc < anioH || (anioVenc === anioH && mesVenc < mesH)) {
      return res.json({ success: false, message: 'Tarjeta vencida' });
    }

    // Verificar si la fecha_venc enviada por Flutter coincide con la de la BD
    if (tarjeta.venc !== fecha_venc) {
      return res.json({ success: false, message: 'Fecha de vencimiento incorrecta' });
    }

    // Verificar saldo suficiente
    const montoNum = parseFloat(monto);
    if (tarjeta.saldo < montoNum) {
      return res.json({
        success : false,
        message : `Saldo insuficiente. Saldo disponible: ₡${tarjeta.saldo.toLocaleString('es-CR')}`,
      });
    }

    // ── Todo bien: descontar saldo y registrar transacción ──
    const nuevoSaldo = parseFloat((tarjeta.saldo - montoNum).toFixed(2));

    db.query(
      'UPDATE tarjetas SET saldo = ? WHERE id_tarjeta = ?',
      [nuevoSaldo, tarjeta.id_tarjeta],
      (err2) => {
        if (err2) {
          return res.status(500).json({ success: false, message: 'Error actualizando saldo' });
        }

        db.query(
          `INSERT INTO transacciones (id_tarjeta, tipo_pago, monto, descripcion, estado)
           VALUES (?, 'tarjeta', ?, 'Pago con tarjeta', 'aprobado')`,
          [tarjeta.id_tarjeta, montoNum]
        );

        return res.json({
          success         : true,
          message         : '¡Pago aprobado!',
          tipo_tarjeta    : tarjeta.tipo,       // 'visa' o 'mastercard'
          subtipo         : tarjeta.subtipo,    // 'debito' o 'credito'
          nombre_titular  : tarjeta.nombre_titular,
          saldo_anterior  : tarjeta.saldo,
          saldo_nuevo     : nuevoSaldo,
          monto_cobrado   : montoNum,
        });
      }
    );
  });
});

// ============================================================
//  POST /api/banco/validar-sinpe
//  Body: { telefono, monto, descripcion }
//  Busca el teléfono en cuentas_sinpe → obtiene la tarjeta
//  asociada → verifica saldo → descuenta.
// ============================================================
router.post('/validar-sinpe', (req, res) => {
  const { telefono, monto, descripcion } = req.body;

  if (!telefono || !monto) {
    return res.status(400).json({
      success : false,
      message : 'Faltan datos: telefono, monto',
    });
  }

  const sql = `
    SELECT t.id_tarjeta, t.tipo, t.subtipo,
           t.nombre_titular, t.saldo, t.activa,
           s.telefono
    FROM cuentas_sinpe s
    JOIN tarjetas t ON s.id_tarjeta = t.id_tarjeta
    WHERE s.telefono = ?
      AND s.activa = 1
    LIMIT 1
  `;

  db.query(sql, [telefono], (err, results) => {
    if (err) {
      console.error('❌ Error BD banco SINPE:', err);
      return res.status(500).json({ success: false, message: 'Error interno' });
    }

    if (results.length === 0) {
      return res.json({
        success : false,
        message : 'Número de teléfono no registrado en SINPE Móvil',
      });
    }

    const cuenta = results[0];

    if (!cuenta.activa) {
      return res.json({ success: false, message: 'Cuenta SINPE inactiva' });
    }

    const montoNum = parseFloat(monto);
    if (cuenta.saldo < montoNum) {
      return res.json({
        success : false,
        message : `Saldo insuficiente. Disponible: ₡${cuenta.saldo.toLocaleString('es-CR')}`,
      });
    }

    // ── Descontar y registrar ──
    const nuevoSaldo = parseFloat((cuenta.saldo - montoNum).toFixed(2));

    db.query(
      'UPDATE tarjetas SET saldo = ? WHERE id_tarjeta = ?',
      [nuevoSaldo, cuenta.id_tarjeta],
      (err2) => {
        if (err2) {
          return res.status(500).json({ success: false, message: 'Error actualizando saldo' });
        }

        db.query(
          `INSERT INTO transacciones (id_tarjeta, tipo_pago, monto, descripcion, estado)
           VALUES (?, 'sinpe', ?, ?, 'aprobado')`,
          [cuenta.id_tarjeta, montoNum, descripcion || 'Pago SINPE Móvil']
        );

        return res.json({
          success        : true,
          message        : '¡Pago SINPE aprobado!',
          telefono       : cuenta.telefono,
          nombre_titular : cuenta.nombre_titular,
          tipo_tarjeta   : cuenta.tipo,
          saldo_nuevo    : nuevoSaldo,
          monto_cobrado  : montoNum,
        });
      }
    );
  });
});

// ============================================================
//  GET /api/banco/transacciones/:id_tarjeta  (opcional/admin)
// ============================================================
router.get('/transacciones/:id_tarjeta', (req, res) => {
  db.query(
    'SELECT * FROM transacciones WHERE id_tarjeta = ? ORDER BY fecha DESC LIMIT 20',
    [req.params.id_tarjeta],
    (err, results) => {
      if (err) return res.status(500).json({ success: false });
      res.json({ success: true, transacciones: results });
    }
  );
});

module.exports = router;