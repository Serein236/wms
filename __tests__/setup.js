const mysql = require('mysql2/promise');

// Test database config
const testDbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'warehouse_test',
    charset: 'utf8mb4'
};

let testConnection;

beforeAll(async () => {
    // Create test database if not exists
    const tempConnection = await mysql.createConnection({
        host: testDbConfig.host,
        port: testDbConfig.port,
        user: testDbConfig.user,
        password: testDbConfig.password
    });
    await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS ${testDbConfig.database}`);
    await tempConnection.end();

    // Connect to test database
    testConnection = await mysql.createConnection(testDbConfig);
});

afterAll(async () => {
    if (testConnection) {
        await testConnection.end();
    }
});

module.exports = { testConnection, testDbConfig };
