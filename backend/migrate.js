// backend/migrate.js
const { getPool } = require('./db');

async function migrate() {
  const pool = await getPool();

  // Files table
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='files')
    CREATE TABLE files (
      id INT IDENTITY(1,1) PRIMARY KEY,
      file_name NVARCHAR(255),
      file_size BIGINT,
      file_type NVARCHAR(50),
      file_path NVARCHAR(500),
      uploaded_by INT,
      uploaded_at DATETIME DEFAULT GETDATE()
    )
  `);
  console.log('Files table ready!');

  // Users table
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users')
    CREATE TABLE users (
      id INT IDENTITY(1,1) PRIMARY KEY,
      username NVARCHAR(100) NOT NULL UNIQUE,
      email NVARCHAR(255) NOT NULL UNIQUE,
      password_hash NVARCHAR(500) NOT NULL,
      role NVARCHAR(20) DEFAULT 'user',
      created_at DATETIME DEFAULT GETDATE()
    )
  `);
  console.log('Users table ready!');

  console.log('All migrations done!');
  process.exit(0);
}

migrate();