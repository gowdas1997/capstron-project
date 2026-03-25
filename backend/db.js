const sql = require('mssql');
require('dotenv').config();

// ─────────────────────────────────────────────
// 🔧 DATABASE CONFIG (PRIVATE SUBNET)
// ─────────────────────────────────────────────
const config = {
  server: process.env.DB_SERVER,     // e.g. 10.44.0.2
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: 1433,
  options: {
    encrypt: false,                 // ✅ IMPORTANT (private DB)
    trustServerCertificate: true    // allow self-signed certs
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let pool;

// ─────────────────────────────────────────────
// 🚀 GET CONNECTION POOL
// ─────────────────────────────────────────────
async function getPool() {
  try {
    if (!pool) {
      pool = await sql.connect(config);
      console.log('[Capstone] ✅ SQL Server connected');
    }
    return pool;

  } catch (err) {
    console.error('[Capstone] ❌ DB connection error:', err.message);

    // Reset pool so next request retries connection
    pool = null;

    throw err;
  }
}

// ─────────────────────────────────────────────
// 🔄 OPTIONAL: CLOSE CONNECTION (FUTURE USE)
// ─────────────────────────────────────────────
async function closePool() {
  if (pool) {
    await pool.close();
    pool = null;
    console.log('[Capstone] 🔌 DB connection closed');
  }
}

// ─────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────
module.exports = {
  getPool,
  closePool,
  sql
};