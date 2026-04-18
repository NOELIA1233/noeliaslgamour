const express = require('express');
const router = express.Router();
const { db } = require('../config/db');

/*
===========================================
   OBTENER TODOS LOS SERVICIOS ACTIVOS
===========================================
*/
router.get('/', (req, res) => {
  const query = `
    SELECT 
      id_servicio,
      nombre,
      descripcion,
      precio,
      duracion_min,
      categoria,
      estado,
      disponibilidad
    FROM servicios
    WHERE estado = 'activo'
      AND disponibilidad = 1
    ORDER BY categoria ASC, nombre ASC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error al obtener servicios:", err);
      return res.status(500).json({
        success: false,
        message: "Error al obtener los servicios"
      });
    }

    res.json({
      success: true,
      total: results.length,
      servicios: results
    });
  });
});


/*
===========================================
   CREAR NUEVO SERVICIO
===========================================
*/
router.post('/', (req, res) => {

  const {
    nombre,
    descripcion,
    precio,
    duracion_min,
    categoria
  } = req.body;

  const query = `
    INSERT INTO servicios
    (nombre, descripcion, precio, duracion_min, categoria, estado, disponibilidad)
    VALUES (?, ?, ?, ?, ?, 'activo', 1)
  `;

  db.query(
    query,
    [nombre, descripcion, precio, duracion_min, categoria],
    (err, result) => {

      if (err) {
        console.error("Error al crear servicio:", err);
        return res.status(500).json({
          success: false,
          message: "Error al crear servicio"
        });
      }

      res.json({
        success: true,
        message: "Servicio creado correctamente"
      });
    }
  );
});


/*
===========================================
   EDITAR SERVICIO
===========================================
*/
router.put('/:id', (req, res) => {

  const { id } = req.params;

  const {
    nombre,
    descripcion,
    precio,
    duracion_min,
    categoria
  } = req.body;

  const query = `
    UPDATE servicios
    SET nombre = ?,
        descripcion = ?,
        precio = ?,
        duracion_min = ?,
        categoria = ?
    WHERE id_servicio = ?
  `;

  db.query(
    query,
    [nombre, descripcion, precio, duracion_min, categoria, id],
    (err, result) => {

      if (err) {
        console.error("Error al actualizar:", err);
        return res.status(500).json({
          success: false,
          message: "Error al actualizar servicio"
        });
      }

      res.json({
        success: true,
        message: "Servicio actualizado correctamente"
      });
    }
  );
});


/*
===========================================
   DESACTIVAR SERVICIO
===========================================
*/
router.delete('/:id', (req, res) => {

  const { id } = req.params;

  const query = `
    UPDATE servicios
    SET estado = 'inactivo'
    WHERE id_servicio = ?
  `;

  db.query(query, [id], (err, result) => {

    if (err) {
      console.error("Error al desactivar:", err);
      return res.status(500).json({
        success: false,
        message: "Error al desactivar servicio"
      });
    }

    res.json({
      success: true,
      message: "Servicio desactivado"
    });
  });
});

module.exports = router;