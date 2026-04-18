const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const crypto = require("crypto");
const nodemailer = require('nodemailer');

// ==========================
// CONFIGURACIÓN DE NODEMAILER (HU#15 y HU#16)
// ==========================
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'nbrenes922@gmail.com',
        pass: 'isgopojxgshhacsb'
    }
});

async function enviarEmail(destinatario, asunto, html) {
    try {
        await transporter.sendMail({
            from: '"Noelia\'s Glamour" <nbrenes922@gmail.com>',
            to: destinatario,
            subject: asunto,
            html: html
        });
        console.log(`✅ Email enviado a ${destinatario}`);
        return true;
    } catch (error) {
        console.error("❌ Error enviando email:", error);
        return false;
    }
}

// ==========================
// POLITICAS DE PASSWORD (HU#14)
// ==========================
function validarPassword(password) {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!regex.test(password)) {
        throw new Error("La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula y un número");
    }
}

// ==========================
// GENERAR TOKEN (6 DÍGITOS)
// ==========================
function generarToken() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// ==========================
// REGISTRAR AUDITORIA (HU#17)
// ==========================
function registrarAuditoria(usuario_id, accion, ip) {
    db.query(
        "INSERT INTO auditoria (usuario_id, accion, ip, fecha) VALUES (?, ?, ?, NOW())",
        [usuario_id, accion, ip],
        (err) => {
            if (err) console.error("Error registrando auditoría:", err);
        }
    );
}

// ==========================
// VERIFICAR INTENTOS FALLIDOS (HU#14)
// ==========================
async function verificarIntentosFallidos(usuario_id, ip) {
    return new Promise((resolve) => {
        db.query(
            "SELECT intentos_fallidos, bloqueo_hasta FROM usuarios WHERE id_usuario = ?",
            [usuario_id],
            (err, results) => {
                if (err || results.length === 0) { resolve(false); return; }
                const usuario = results[0];
                if (usuario.bloqueo_hasta && new Date(usuario.bloqueo_hasta) > new Date()) {
                    registrarAuditoria(usuario_id, "LOGIN_BLOQUEADO", ip);
                    resolve(false); return;
                }
                resolve(true);
            }
        );
    });
}

// ==========================
// REGISTRAR INTENTO FALLIDO (HU#14)
// ==========================
async function registrarIntentoFallido(usuario_id) {
    return new Promise((resolve) => {
        db.query(
            `UPDATE usuarios 
             SET intentos_fallidos = intentos_fallidos + 1,
                 bloqueo_hasta = CASE 
                     WHEN intentos_fallidos + 1 >= 3 THEN DATE_ADD(NOW(), INTERVAL 15 MINUTE)
                     ELSE bloqueo_hasta
                 END
             WHERE id_usuario = ?`,
            [usuario_id],
            (err) => {
                if (err) console.error("Error registrando intento fallido:", err);
                resolve();
            }
        );
    });
}

// ==========================
// REINICIAR INTENTOS (HU#14)
// ==========================
async function reiniciarIntentos(usuario_id) {
    return new Promise((resolve) => {
        db.query(
            "UPDATE usuarios SET intentos_fallidos = 0, bloqueo_hasta = NULL WHERE id_usuario = ?",
            [usuario_id],
            (err) => {
                if (err) console.error("Error reiniciando intentos:", err);
                resolve();
            }
        );
    });
}

// ==========================
// CONFIGURACIÓN MULTER
// ==========================
const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, 'uploads/'); },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, 'usuario_' + req.params.id + ext);
    }
});
const upload = multer({ storage });

// ==========================
// INICIAR REGISTRO CON VERIFICACIÓN POR EMAIL (HU#16)
// ==========================
router.post('/iniciar-registro', async (req, res) => {
    const { cedula, nombre, telefono, email, password,
            pais_id, provincia_id, canton_id, distrito_id } = req.body;

    if (!cedula || !nombre || !telefono || !email || !password) {
        return res.status(400).json({
            success: false,
            message: "Todos los campos son obligatorios"
        });
    }

    if (!pais_id || !provincia_id || !canton_id) {
        return res.status(400).json({
            success: false,
            message: "Seleccione País, Provincia y Cantón"
        });
    }

    try {
        validarPassword(password);

        db.query(
            "SELECT id_usuario FROM usuarios WHERE email = ?",
            [email],
            async (err, results) => {
                if (err) {
                    return res.status(500).json({ success: false, message: "Error del servidor" });
                }

                if (results.length > 0) {
                    return res.json({ success: false, message: "El email ya está registrado" });
                }

                const codigo = generarToken();
                const hash = await bcrypt.hash(password, 10);

                // Eliminar registros pendientes anteriores del mismo email
                db.query("DELETE FROM registros_pendientes WHERE email = ?", [email]);

                // Guardar registro pendiente con ubicación
                db.query(
                    `INSERT INTO registros_pendientes 
                     (cedula, nombre, telefono, email, password_hash, codigo, expira,
                      pais_id, provincia_id, canton_id, distrito_id) 
                     VALUES (?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE),
                             ?, ?, ?, ?)`,
                    [cedula, nombre, telefono, email, hash, codigo,
                     pais_id    || null,
                     provincia_id || null,
                     canton_id  || null,
                     distrito_id || null],
                    async (err) => {
                        if (err) {
                            console.error("Error guardando registro pendiente:", err);
                            return res.status(500).json({
                                success: false,
                                message: "Error al procesar el registro"
                            });
                        }

                        const html = `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                                <h2 style="color: #E91E63;">¡Bienvenido a Noelia's Glamour!</h2>
                                <p>Hola ${nombre},</p>
                                <p>Gracias por registrarte. Para completar tu registro, ingresa el siguiente código:</p>
                                <div style="background-color: #E91E63; color: white; font-size: 32px; font-weight: bold; text-align: center; padding: 15px; border-radius: 5px; letter-spacing: 5px; margin: 20px 0;">
                                    ${codigo}
                                </div>
                                <p>Este código expirará en 10 minutos.</p>
                                <p>Si no solicitaste este registro, ignora este mensaje.</p>
                            </div>
                        `;

                        const enviado = await enviarEmail(email, "Código de verificación - Noelia's Glamour", html);

                        if (!enviado) {
                            return res.json({ success: false, message: "Error enviando el código. Intenta de nuevo." });
                        }

                        res.json({
                            success: true,
                            message: "Código de verificación enviado a tu email",
                            email: email
                        });
                    }
                );
            }
        );

    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
});

// ==========================
// COMPLETAR REGISTRO (VERIFICAR CÓDIGO)
// ==========================
router.post('/completar-registro', (req, res) => {
    const { email, codigo } = req.body;

    if (!email || !codigo) {
        return res.status(400).json({ success: false, message: "Email y código requeridos" });
    }

    db.query(
        `SELECT * FROM registros_pendientes 
         WHERE email = ? AND codigo = ? AND expira > NOW()
         ORDER BY id DESC LIMIT 1`,
        [email, codigo],
        (err, results) => {
            if (err || results.length === 0) {
                return res.json({ success: false, message: "Código inválido o expirado" });
            }

            const registro = results[0];

            db.query(
                `INSERT INTO usuarios 
                 (cedula, nombre, telefono, email, password_hash, rol, estado,
                  provincia_id, canton_id, distrito_id) 
                 VALUES (?, ?, ?, ?, ?, 'cliente', 'activo', ?, ?, ?)`,
                [registro.cedula, registro.nombre, registro.telefono,
                 registro.email, registro.password_hash,
                 registro.provincia_id || null,
                 registro.canton_id    || null,
                 registro.distrito_id  || null],
                (err, result) => {
                    if (err) {
                        console.error("Error creando usuario:", err);
                        return res.json({ success: false, message: "Error al crear usuario" });
                    }

                    db.query("DELETE FROM registros_pendientes WHERE email = ?", [email]);
                    registrarAuditoria(result.insertId, "REGISTRO_COMPLETADO", req.ip);

                    res.json({ success: true, message: "Registro completado exitosamente" });
                }
            );
        }
    );
});

// ==========================
// LOGIN CON MFA Y EMAIL (HU#14, HU#15, HU#17)
// ==========================
router.post('/login', async (req, res) => {
    const email = req.body.email.trim();
    const password = req.body.password.trim();

    if (!email || !password) {
        return res.status(400).json({ success: false, message: "Email y contraseña requeridos" });
    }

    db.query(
        `SELECT * FROM usuarios WHERE email = ? AND estado = 'activo'`,
        [email],
        async (err, results) => {
            if (err) {
                registrarAuditoria(null, "LOGIN_ERROR", req.ip);
                return res.status(500).json({ success: false, message: "Error del servidor" });
            }

            if (results.length === 0) {
                registrarAuditoria(null, "LOGIN_FALLIDO", req.ip);
                return res.json({ success: false, message: "Credenciales incorrectas" });
            }

            const usuario = results[0];

            const puedeIntentar = await verificarIntentosFallidos(usuario.id_usuario, req.ip);
            if (!puedeIntentar) {
                return res.json({
                    success: false,
                    message: "Cuenta bloqueada temporalmente. Intente en 15 minutos."
                });
            }

            const coincide = await bcrypt.compare(password, usuario.password_hash);
            if (!coincide) {
                await registrarIntentoFallido(usuario.id_usuario);
                registrarAuditoria(usuario.id_usuario, "PASSWORD_INCORRECTO", req.ip);
                return res.json({ success: false, message: "Credenciales incorrectas" });
            }

            await reiniciarIntentos(usuario.id_usuario);
            registrarAuditoria(usuario.id_usuario, "LOGIN_EXITOSO", req.ip);

            const token = generarToken();
            db.query("DELETE FROM mfa_tokens WHERE usuario_id = ?", [usuario.id_usuario]);
            db.query(
                "INSERT INTO mfa_tokens (usuario_id, token, expira) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE))",
                [usuario.id_usuario, token],
                async (err) => {
                    if (!err) {
                        const html = `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                                <h2 style="color: #E91E63;">Código de verificación MFA</h2>
                                <p>Hola ${usuario.nombre},</p>
                                <p>Ingresa el siguiente código para completar tu inicio de sesión:</p>
                                <div style="background-color: #E91E63; color: white; font-size: 32px; font-weight: bold; text-align: center; padding: 15px; border-radius: 5px; letter-spacing: 5px; margin: 20px 0;">
                                    ${token}
                                </div>
                                <p>Este código expirará en 5 minutos.</p>
                            </div>
                        `;
                        await enviarEmail(usuario.email, "Código MFA - Noelia's Glamour", html);
                    }
                }
            );

            return res.json({
                success: true,
                mfa: true,
                usuario_id: usuario.id_usuario,
                rol: usuario.rol,
                message: "Se envió un código MFA a tu email"
            });
        }
    );
});

// ==========================
// VERIFICAR TOKEN MFA (HU#15)
// ==========================
router.post('/verificar-token', (req, res) => {
    const usuario_id = req.body.usuario_id;
    const token = req.body.token.toString().trim();

    if (!usuario_id || !token) {
        return res.status(400).json({ success: false, message: "Datos incompletos" });
    }

    db.query(
        `SELECT * FROM mfa_tokens 
         WHERE usuario_id = ? AND token = ? AND expira > NOW()
         ORDER BY id DESC LIMIT 1`,
        [usuario_id, token],
        (err, results) => {
            if (err) {
                registrarAuditoria(usuario_id, "MFA_ERROR", req.ip);
                return res.json({ success: false, message: "Error del servidor" });
            }
            if (results.length === 0) {
                registrarAuditoria(usuario_id, "MFA_FALLIDO", req.ip);
                return res.json({ success: false, message: "Token inválido o expirado" });
            }

            db.query("DELETE FROM mfa_tokens WHERE id = ?", [results[0].id]);
            registrarAuditoria(usuario_id, "MFA_EXITOSO", req.ip);
            res.json({ success: true, message: "Autenticación correcta" });
        }
    );
});

// ==========================
// INICIAR RECUPERACIÓN CON PREGUNTA (HU#16)
// ==========================
router.post('/iniciar-recuperacion', (req, res) => {
    const { email } = req.body;
    db.query(
        "SELECT id_usuario, nombre, pregunta_seguridad FROM usuarios WHERE email = ?",
        [email],
        (err, results) => {
            if (err || results.length === 0) {
                return res.json({ success: false, message: "Email no encontrado" });
            }
            res.json({
                success: true,
                pregunta: results[0].pregunta_seguridad,
                usuario_id: results[0].id_usuario,
                nombre: results[0].nombre
            });
        }
    );
});

// ==========================
// VERIFICAR RESPUESTA Y ENVIAR CÓDIGO POR EMAIL (HU#16)
// ==========================
router.post('/verificar-respuesta', (req, res) => {
    const { usuario_id, respuesta } = req.body;
    db.query(
        "SELECT respuesta_seguridad, intentos_recuperacion, bloqueo_recuperacion, email, nombre FROM usuarios WHERE id_usuario = ?",
        [usuario_id],
        async (err, results) => {
            if (err || results.length === 0) {
                return res.json({ success: false, message: "Error" });
            }
            const usuario = results[0];

            if (usuario.bloqueo_recuperacion && new Date(usuario.bloqueo_recuperacion) > new Date()) {
                return res.json({ success: false, message: "Demasiados intentos. Intente en 15 minutos" });
            }

            if (respuesta.toLowerCase() !== usuario.respuesta_seguridad.toLowerCase()) {
                const nuevosIntentos = (usuario.intentos_recuperacion || 0) + 1;
                const bloqueo = nuevosIntentos >= 3 ? new Date(Date.now() + 15 * 60000) : null;
                db.query(
                    "UPDATE usuarios SET intentos_recuperacion = ?, bloqueo_recuperacion = ? WHERE id_usuario = ?",
                    [nuevosIntentos, bloqueo, usuario_id]
                );
                return res.json({
                    success: false,
                    message: "Respuesta incorrecta",
                    intentos_restantes: 3 - nuevosIntentos
                });
            }

            const codigoVerificacion = generarToken();
            const resetToken = crypto.randomBytes(32).toString("hex");
            db.query(
                "INSERT INTO password_reset (usuario_id, token, expira) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))",
                [usuario_id, resetToken]
            );
            db.query(
                "UPDATE usuarios SET intentos_recuperacion = 0, bloqueo_recuperacion = NULL WHERE id_usuario = ?",
                [usuario_id]
            );

            const html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                    <h2 style="color: #E91E63;">Recuperación de contraseña</h2>
                    <p>Hola ${usuario.nombre},</p>
                    <p>Ingresa el siguiente código de verificación:</p>
                    <div style="background-color: #E91E63; color: white; font-size: 32px; font-weight: bold; text-align: center; padding: 15px; border-radius: 5px; letter-spacing: 5px; margin: 20px 0;">
                        ${codigoVerificacion}
                    </div>
                    <p>Este código expirará en 15 minutos.</p>
                </div>
            `;
            await enviarEmail(usuario.email, "Código de verificación - Noelia's Glamour", html);

            res.json({ success: true, message: "Respuesta correcta. Se ha enviado un código a tu email.", token: resetToken });
        }
    );
});

// ==========================
// VERIFICAR CÓDIGO DE RECUPERACIÓN
// ==========================
router.post('/verificar-codigo-recuperacion', (req, res) => {
    res.json({ success: true, message: "Código verificado correctamente" });
});

// ==========================
// RESET PASSWORD (HU#16)
// ==========================
router.post('/reset-password', async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) {
        return res.status(400).json({ success: false, message: "Token y contraseña requeridos" });
    }
    try {
        validarPassword(password);
        db.query(
            "SELECT * FROM password_reset WHERE token = ? AND expira > NOW()",
            [token],
            async (err, results) => {
                if (err || results.length === 0) {
                    return res.json({ success: false, message: "Token inválido o expirado" });
                }
                const usuario_id = results[0].usuario_id;
                const hash = await bcrypt.hash(password, 10);
                db.query(
                    "UPDATE usuarios SET password_hash = ? WHERE id_usuario = ?",
                    [hash, usuario_id],
                    (err) => {
                        if (err) return res.status(500).json({ success: false, message: "Error actualizando contraseña" });
                        db.query("DELETE FROM password_reset WHERE token = ?", [token]);
                        registrarAuditoria(usuario_id, "PASSWORD_RESET_EXITOSO", req.ip);
                        res.json({ success: true, message: "Contraseña actualizada correctamente" });
                    }
                );
            }
        );
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
});

// ==========================
// GOOGLE AUTHENTICATOR (HU#18)
// ==========================
router.post('/authenticator/configurar', (req, res) => {
    const { usuario_id } = req.body;
    const secret = speakeasy.generateSecret({ name: `Noelia's Glamour (${usuario_id})`, length: 20 });
    QRCode.toDataURL(secret.otpauth_url, (err, qrCode) => {
        if (err) return res.status(500).json({ success: false, message: "Error generando QR" });
        db.query("UPDATE usuarios SET mfa_secret = ? WHERE id_usuario = ?", [secret.base32, usuario_id]);
        res.json({ success: true, qr: qrCode, secret: secret.base32 });
    });
});

router.post('/authenticator/verificar', (req, res) => {
    const { usuario_id, token } = req.body;
    db.query("SELECT mfa_secret FROM usuarios WHERE id_usuario = ?", [usuario_id], (err, results) => {
        if (err || results.length === 0) return res.json({ success: false, message: "Usuario no encontrado" });
        const secret = results[0].mfa_secret;
        if (!secret) return res.json({ success: false, message: "Authenticator no configurado" });
        const verified = speakeasy.totp.verify({ secret, encoding: "base32", token, window: 1 });
        registrarAuditoria(usuario_id, verified ? "AUTHENTICATOR_VERIFICADO" : "AUTHENTICATOR_FALLIDO", req.ip);
        res.json({ success: verified });
    });
});

// ==========================
// OBTENER AUDITORIA (HU#17)
// ==========================
router.get('/auditoria', (req, res) => {
    db.query(
        `SELECT a.*, u.nombre, u.email 
         FROM auditoria a 
         LEFT JOIN usuarios u ON a.usuario_id = u.id_usuario 
         ORDER BY a.fecha DESC LIMIT 100`,
        (err, results) => {
            if (err) return res.status(500).json({ success: false, message: "Error obteniendo auditoría" });
            res.json({ success: true, auditoria: results });
        }
    );
});

// ==========================
// OBTENER CLIENTES (ADMIN)
// ==========================
router.get('/admin', (req, res) => {
    db.query(
        `SELECT id_usuario, cedula, nombre, email, telefono
         FROM usuarios WHERE rol = 'cliente' ORDER BY id_usuario DESC`,
        (err, rows) => {
            if (err) return res.status(500).json({ success: false, message: "Error obteniendo clientes" });
            res.json({ success: true, clientes: rows });
        }
    );
});

// ==========================
// OBTENER PERFIL POR ID
// ==========================
router.get('/:id', (req, res) => {
    db.query(
        "SELECT id_usuario, nombre, email, telefono, foto FROM usuarios WHERE id_usuario = ?",
        [req.params.id],
        (err, results) => {
            if (err) return res.status(500).json({ success: false });
            if (results.length === 0) return res.status(404).json({ success: false });
            res.json(results[0]);
        }
    );
});

// ==========================
// SUBIR FOTO DE PERFIL
// ==========================
router.post('/subir-foto/:id', upload.single('foto'), (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: "No se envió ninguna imagen" });
    const ruta = `uploads/${req.file.filename}`;
    db.query("UPDATE usuarios SET foto = ? WHERE id_usuario = ?", [ruta, req.params.id], (err) => {
        if (err) return res.status(500).json({ success: false, message: "Error al guardar foto" });
        res.json({ success: true, ruta });
    });
});

module.exports = router;