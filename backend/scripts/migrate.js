const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

// Настройка подключения к базе данных
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'usdt_deposits',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
});

// Таблица для отслеживания миграций
const createMigrationsTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS migrations (
            id SERIAL PRIMARY KEY,
            filename VARCHAR(255) NOT NULL UNIQUE,
            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;
    await pool.query(query);
};

// Получение выполненных миграций
const getExecutedMigrations = async () => {
    const result = await pool.query('SELECT filename FROM migrations ORDER BY id');
    return result.rows.map(row => row.filename);
};

// Выполнение миграции
const executeMigration = async (filename, content) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Выполняем SQL из файла миграции
        await client.query(content);
        
        // Записываем в таблицу миграций
        await client.query('INSERT INTO migrations (filename) VALUES ($1)', [filename]);
        
        await client.query('COMMIT');
        console.log(`✅ Миграция ${filename} выполнена успешно`);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ Ошибка выполнения миграции ${filename}:`, error.message);
        throw error;
    } finally {
        client.release();
    }
};

// Основная функция миграции
const runMigrations = async () => {
    try {
        console.log('🚀 Запуск миграций...');
        
        // Создаём таблицу для отслеживания миграций
        await createMigrationsTable();
        
        // Получаем список выполненных миграций
        const executedMigrations = await getExecutedMigrations();
        console.log(`📋 Выполнено миграций: ${executedMigrations.length}`);
        
        // Читаем файлы миграций
        const migrationsDir = path.join(__dirname, '../migrations');
        const migrationFiles = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort();
        
        console.log(`📁 Найдено файлов миграций: ${migrationFiles.length}`);
        
        // Выполняем новые миграции
        let executedCount = 0;
        for (const filename of migrationFiles) {
            if (!executedMigrations.includes(filename)) {
                const filePath = path.join(migrationsDir, filename);
                const content = fs.readFileSync(filePath, 'utf8');
                await executeMigration(filename, content);
                executedCount++;
            } else {
                console.log(`⏭️  Миграция ${filename} уже выполнена, пропускаем`);
            }
        }
        
        if (executedCount === 0) {
            console.log('✨ Все миграции уже выполнены');
        } else {
            console.log(`✅ Выполнено новых миграций: ${executedCount}`);
        }
        
    } catch (error) {
        console.error('❌ Критическая ошибка при выполнении миграций:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
};

// Запускаем миграции, если скрипт вызван напрямую
if (require.main === module) {
    runMigrations();
}

module.exports = { runMigrations };
