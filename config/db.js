const mysql = require('mysql2');
require('dotenv').config();

// ── Conexión principal ────────────────────────────────────
const db = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'noelia1234',
  database : 'noelias_glamour',
  port     : 3306,
});

db.connect((err) => {
  if (err) console.error('❌ Error conectando a MySQL:', err);
  else console.log('✅ Conectado a noelias_glamour');
});

// ── Conexión TSE ──────────────────────────────────────────
const dbTSE = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'noelia1234',
  database : 'tse_db',
  port     : 3306,
});

dbTSE.connect((err) => {
  if (err) console.error('❌ Error conectando a tse_db:', err);
  else console.log('✅ Conectado a tse_db');
});

// ── Conexión Banco ────────────────────────────────────────
const dbBanco = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'noelia1234',
  database : 'banco_db',
  port     : 3306,
});

dbBanco.connect((err) => {
  if (err) console.error('❌ Error conectando a banco_db:', err);
  else console.log('✅ Conectado a banco_db');
});

module.exports = { db, dbTSE, dbBanco };