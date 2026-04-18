const express    = require('express');
const router     = express.Router();
const { db } = require('../config/db');
const { OAuth2Client } = require('google-auth-library');

const CLIENT_ID = '784111543476-sgfrn5r5krc6drq6rq3lmeiod9eo4cdt.apps.googleusercontent.com';
const client    = new OAuth2Client(CLIENT_ID);

router.post('/', async (req, res) => {
    const { idToken, accessToken, email, nombre, foto, google_id } = req.body;

    if (!idToken && !google_id) {
        return res.status(400).json({
            success: false,
            message: 'Token de Google requerido'
        });
    }

    try {
        let googleId   = google_id;
        let userEmail  = email;
        let userNombre = nombre;
        let userFoto   = foto;

        // Si hay idToken lo verificamos con Google
        if (idToken) {
            try {
                const ticket = await client.verifyIdToken({
                    idToken: idToken,
                    audience: CLIENT_ID,
                });
                const payload = ticket.getPayload();
                googleId   = payload['sub'];
                userEmail  = payload['email'];
                userNombre = payload['name'];
                userFoto   = payload['picture'];
            } catch (e) {
                console.log('idToken inválido, usando datos del perfil directamente');
                // Continuar con los datos del perfil que mandó Flutter
            }
        }

        if (!userEmail) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo obtener el email de Google'
            });
        }

        // Buscar si el usuario ya existe
        db.query(
            `SELECT * FROM usuarios 
             WHERE google_id = ? OR email = ? 
             LIMIT 1`,
            [googleId, userEmail],
            (err, results) => {
                if (err) {
                    console.error('❌ Error buscando usuario Google:', err);
                    return res.status(500).json({
                        success: false,
                        message: 'Error del servidor'
                    });
                }

                if (results.length > 0) {
                    // Usuario existe → actualizar google_id si falta
                    const usuario = results[0];

                    if (!usuario.google_id) {
                        db.query(
                            'UPDATE usuarios SET google_id = ?, foto = ? WHERE id_usuario = ?',
                            [googleId, userFoto, usuario.id_usuario]
                        );
                    }

                    if (usuario.estado !== 'activo') {
                        return res.json({
                            success: false,
                            message: 'Tu cuenta está desactivada'
                        });
                    }

                    console.log(`✅ Login Google: ${userEmail}`);

                    return res.json({
                        success   : true,
                        message   : 'Login exitoso con Google',
                        usuario_id: usuario.id_usuario,
                        nombre    : usuario.nombre,
                        email     : usuario.email,
                        rol       : usuario.rol,
                        foto      : userFoto,
                    });

                } else {
                    // Usuario nuevo → registrar automáticamente
                    db.query(
                        `INSERT INTO usuarios 
                         (nombre, email, google_id, foto, rol, estado, password_hash)
                         VALUES (?, ?, ?, ?, 'cliente', 'activo', '')`,
                        [userNombre, userEmail, googleId, userFoto],
                        (err, result) => {
                            if (err) {
                                console.error('❌ Error registrando usuario Google:', err);
                                return res.status(500).json({
                                    success: false,
                                    message: 'Error al registrar usuario'
                                });
                            }

                            console.log(`✅ Registro Google: ${userEmail}`);

                            return res.json({
                                success   : true,
                                message   : 'Registro exitoso con Google',
                                usuario_id: result.insertId,
                                nombre    : userNombre,
                                email     : userEmail,
                                rol       : 'cliente',
                                foto      : userFoto,
                                nuevo     : true,
                            });
                        }
                    );
                }
            }
        );

    } catch (error) {
        console.error('❌ Error en auth Google:', error);
        return res.status(500).json({
            success: false,
            message: 'Error procesando autenticación de Google'
        });
    }
});

module.exports = router;