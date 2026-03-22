// backend/migrate.js
const { getPool } = require('./db');

async function migrate() {
  const pool = await getPool();
  
  // DB ge connect maadi
  // Table create maaduttade
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects 
                   WHERE name='files')
    CREATE TABLE files (
      id INT IDENTITY(1,1) PRIMARY KEY,
      file_name NVARCHAR(255),
      file_size BIGINT,
      file_type NVARCHAR(50),
      file_path NVARCHAR(500),
      uploaded_at DATETIME DEFAULT GETDATE()
    )
  `);
  
  console.log('Table created!');
  process.exit(0);
}

migrate();