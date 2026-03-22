const sql = require('mssql');
require('dotenv').config();

const config = {
  server:   process.env.DB_SERVER,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port:     1433,
  options: {
    encrypt:                true,  // GCP Cloud SQL ge beku
    trustServerCertificate: true
  }
};

let pool;

async function getPool() {
  if (!pool) {
    pool = await sql.connect(config);
    console.log('[Capstone] SQL Server connected!');
  }
  return pool;
}

module.exports = { getPool, sql };