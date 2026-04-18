// ══════════════════════════════════════════════════════════════
//  routes/recuperar_usuario.js
//  Recuperar usuario por nombre — envía email enmascarado al correo
//
//  POST /api/recuperar-usuario
//  Body: { nombre: "María Pérez" }
// ══════════════════════════════════════════════════════════════

const express    = require('express');
const router     = express.Router();
const { db } = require('../config/db');
const nodemailer = require('nodemailer');

// ── Nodemailer (mismo config que usuarios.js) ─────────────────
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'nbrenes922@gmail.com',
        pass: 'isgopojxgshhacsb'
    }
});

// ── Función para enmascarar email ─────────────────────────────
// "noelia@gmail.com"  →  "n***@gmail.com"
// "ab@hotmail.com"    →  "a***@hotmail.com"
function enmascararEmail(email) {
    const [usuario, dominio] = email.split('@');
    const visible = usuario.charAt(0);          // solo la primera letra
    const oculto  = '*'.repeat(Math.min(3, usuario.length - 1));
    return `${visible}${oculto}@${dominio}`;
}

// ══════════════════════════════════════════════════════════════
//  POST /api/recuperar-usuario
// ══════════════════════════════════════════════════════════════
router.post('/', (req, res) => {
    const { nombre } = req.body;

    if (!nombre || nombre.trim() === '') {
        return res.status(400).json({
            success: false,
            message: 'Ingrese su nombre completo'
        });
    }

    // Buscar usuario por nombre (insensible a mayúsculas)
    db.query(
        `SELECT nombre, email FROM usuarios 
         WHERE LOWER(nombre) = LOWER(?) AND estado = 'activo'
         LIMIT 1`,
        [nombre.trim()],
        async (err, results) => {
            if (err) {
                console.error('❌ Error buscando usuario:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Error del servidor'
                });
            }

            // Respuesta genérica para no revelar si el usuario existe
            if (results.length === 0) {
                return res.json({
                    success: false,
                    message: 'No se encontró ninguna cuenta con ese nombre'
                });
            }

            const usuario = results[0];
            const emailEnmascarado = enmascararEmail(usuario.email);

            // Enviar email con recordatorio
            const html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; 
                            padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                    <h2 style="color: #E91E63;">Recuperación de cuenta</h2>
                    <p>Hola <strong>${usuario.nombre}</strong>,</p>
                    <p>Recibimos una solicitud para recuperar tu cuenta en Noelia's Glamour.</p>
                    <p>Tu correo electrónico registrado es:</p>
                    <div style="background-color: #E91E63; color: white; font-size: 22px; 
                                font-weight: bold; text-align: center; padding: 15px; 
                                border-radius: 5px; margin: 20px 0; letter-spacing: 2px;">
                        ${usuario.email}
                    </div>
                    <p>Usa este correo para iniciar sesión en la aplicación.</p>
                    <p style="color: #999; font-size: 12px;">
                        Si no solicitaste esta información, ignora este mensaje.
                    </p>
                </div>
            `;

            try {
                await transporter.sendMail({
                    from: '"Noelia\'s Glamour" <nbrenes922@gmail.com>',
                    to: usuario.email,
                    subject: "Recuperación de cuenta - Noelia's Glamour",
                    html: html
                });

                console.log(`✅ Email de recuperación enviado a ${usuario.email}`);

                res.json({
                    success: true,
                    // Solo mostramos el email enmascarado al usuario en la app
                    emailEnmascarado: emailEnmascarado,
                    message: `Se envió la información a ${emailEnmascarado}`
                });

            } catch (emailErr) {
                console.error('❌ Error enviando email:', emailErr);
                res.status(500).json({
                    success: false,
                    message: 'Error enviando el correo. Intenta de nuevo.'
                });
            }
        }
    );
});

module.exports = router;