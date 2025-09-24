const { Pool } = require('pg');
require('dotenv').config();

// Конфигурация подключения к PostgreSQL
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'usdt_deposits',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    max: 20, // максимальное количество соединений в пуле
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};

// Создаём пул соединений
const pool = new Pool(dbConfig);

// Обработка ошибок подключения
pool.on('error', (err) => {
    console.error('Неожиданная ошибка в пуле соединений базы данных:', err);
    process.exit(-1);
});

// Функция для проверки подключения к базе данных
const testConnection = async () => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        console.log('✅ Подключение к базе данных установлено:', result.rows[0].now);
        client.release();
        return true;
    } catch (error) {
        console.error('❌ Ошибка подключения к базе данных:', error.message);
        return false;
    }
};

// Функция для выполнения запросов с обработкой ошибок
const query = async (text, params) => {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('Executed query', { text, duration, rows: result.rowCount });
        return result;
    } catch (error) {
        const duration = Date.now() - start;
        console.error('Query error', { text, duration, error: error.message });
        throw error;
    }
};

// Функция для получения клиента из пула (для транзакций)
const getClient = async () => {
    return await pool.connect();
};

// Функция для выполнения транзакций
const transaction = async (callback) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// Graceful shutdown
const close = async () => {
    await pool.end();
    console.log('🔌 Соединения с базой данных закрыты');
};

module.exports = {
    pool,
    query,
    getClient,
    transaction,
    testConnection,
    close
};
