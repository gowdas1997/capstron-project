const { getPool } = require('./db');

async function migrate() {
  const pool = await getPool();

  // Files table
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='files')
    CREATE TABLE files (
      id          INT IDENTITY(1,1) PRIMARY KEY,
      file_name   NVARCHAR(255),
      file_size   BIGINT,
      file_type   NVARCHAR(50),
      file_path   NVARCHAR(500),
      uploaded_by INT,
      uploaded_at DATETIME DEFAULT GETDATE()
    )
  `);

  // Users table
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users')
    CREATE TABLE users (
      id         INT IDENTITY(1,1) PRIMARY KEY,
      username   NVARCHAR(100),
      email      NVARCHAR(255),
      password   NVARCHAR(255),
      role       NVARCHAR(20) DEFAULT 'user',
      created_at DATETIME DEFAULT GETDATE()
    )
  `);

  // Unique constraints
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='UQ_users_email')
    ALTER TABLE users ADD CONSTRAINT UQ_users_email UNIQUE (email)
  `);
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='UQ_users_username')
    ALTER TABLE users ADD CONSTRAINT UQ_users_username UNIQUE (username)
  `);

  // Default admin user (password: Admin@123)
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM users WHERE email='admin@capstone.com')
    INSERT INTO users (username, email, password, role)
    VALUES ('admin', 'admin@capstone.com',
    '$2b$10$rQ7K8gXkZ9mN2pL5vH3uOeWYx1tFcDjA6bMsIqPnUoVwCyRzEl4Ki', 'admin')
  `);

  console.log('Migration complete!');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration error:', err.message);
  process.exit(1);
});