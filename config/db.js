const mysql = require('mysql2');
require('dotenv').config();

// ── Conexión principal ────────────────────────────────────
const db = mysql.createConnection({
  host     : process.env.DB_HOST,
  user     : process.env.DB_USER,
  password : process.env.DB_PASSWORD,
  database : process.env.DB_NAME,
  port     : process.env.DB_PORT || 3306,
});

db.connect((err) => {
  if (err) console.error('❌ Error conectando a MySQL:', err);
  else console.log('✅ Conectado a noelias_glamour');
});

// ── Conexión TSE ──────────────────────────────────────────
const dbTSE = mysql.createConnection({
  host     : process.env.DB_HOST,
  user     : process.env.DB_USER,
  password : process.env.DB_PASSWORD,
  database : 'tse_db',
  port     : process.env.DB_PORT || 3306,
});

dbTSE.connect((err) => {
  if (err) console.error('❌ Error conectando a tse_db:', err);
  else console.log('✅ Conectado a tse_db');
});

// ── Conexión Banco ────────────────────────────────────────
const dbBanco = mysql.createConnection({
  host     : process.env.DB_HOST,
  user     : process.env.DB_USER,
  password : process.env.DB_PASSWORD,
  database : 'banco_db',
  port     : process.env.DB_PORT || 3306,
});

dbBanco.connect((err) => {
  if (err) console.error('❌ Error conectando a banco_db:', err);
  else console.log('✅ Conectado a banco_db');
});

module.exports = { db, dbTSE, dbBanco };