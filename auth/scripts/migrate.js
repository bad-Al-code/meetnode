const { drizzle } = require('drizzle-orm/mysql2');
const { migrate } = require('drizzle-orm/mysql2/migrator');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const runMigrations = async () => {
  console.log('Applying database migrations...');

  const { MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE } =
    process.env;
  if (!MYSQL_HOST || !MYSQL_PORT || !MYSQL_USER || !MYSQL_DATABASE) {
    console.error(
      'Error: Missing required database environment variables for migration.'
    );
    process.exit(1);
  }

  let connection;
  try {
    connection = await mysql.createConnection({
      host: MYSQL_HOST,
      port: parseInt(MYSQL_PORT, 10),
      user: MYSQL_USER,
      password: MYSQL_PASSWORD,
      database: MYSQL_DATABASE,
      multipleStatements: true,
    });

    const db = drizzle(connection);

    await migrate(db, {
      migrationsFolder: path.resolve(__dirname, '../src/db/migrations'),
    });

    console.log('Migrations applied successfully!');
  } catch (error) {
    console.error('Error applying migrations:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
    process.exit(0);
  }
};

runMigrations();
