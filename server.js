const express = require('express');
const cors    = require('cors');

const app = express();


app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.use('/api/usuarios',          require('./routes/usuarios'));
app.use('/api/servicios',         require('./routes/servicios'));
app.use('/api/citas',             require('./routes/citas'));
app.use('/api/notificaciones',    require('./routes/notificaciones'));
app.use('/api/pagos',             require('./routes/pagos'));
app.use('/api/calificaciones',    require('./routes/calificaciones'));
app.use('/api/ubicaciones',       require('./routes/ubicaciones'));
app.use('/api/recuperar-usuario', require('./routes/recuperar_usuario'));
app.use('/api/auth/google',       require('./routes/auth_google'));
app.use('/api/tse',               require('./routes/tse'));
app.use('/api/tipo-cambio',       require('./routes/tipocambio')); // ✅ solo esta
app.use('/api/clima', require('./routes/clima'));
app.use('/api/divisas',  require('./routes/divisas'));
app.use('/api/paises',   require('./routes/paises'));
app.use('/api/banco',             require('./routes/banco')); 
app.use('/api/paypal', require('./routes/paypal'));

app.listen(3000, () => {
  console.log('Servidor corriendo en puerto 3000');
});