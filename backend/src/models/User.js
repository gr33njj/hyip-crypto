const { query, transaction } = require('../config/database');

class User {
    // Создание нового пользователя
    static async create(userData) {
        const {
            telegram_id,
            username,
            first_name,
            last_name,
            language_code = 'ru'
        } = userData;

        const sql = `
            INSERT INTO users (telegram_id, username, first_name, last_name, language_code)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;

        const result = await query(sql, [telegram_id, username, first_name, last_name, language_code]);
        return result.rows[0];
    }

    // Поиск пользователя по Telegram ID
    static async findByTelegramId(telegramId) {
        const sql = 'SELECT * FROM users WHERE telegram_id = $1';
        const result = await query(sql, [telegramId]);
        return result.rows[0];
    }

    // Поиск пользователя по ID
    static async findById(id) {
        const sql = 'SELECT * FROM users WHERE id = $1';
        const result = await query(sql, [id]);
        return result.rows[0];
    }

    // Поиск или создание пользователя
    static async findOrCreate(userData) {
        const existingUser = await this.findByTelegramId(userData.telegram_id);
        
        if (existingUser) {
            // Обновляем данные пользователя, если они изменились
            return await this.update(existingUser.id, userData);
        }
        
        return await this.create(userData);
    }

    // Обновление данных пользователя
    static async update(id, userData) {
        const fields = [];
        const values = [];
        let paramIndex = 1;

        // Динамически строим запрос для обновления только переданных полей
        Object.keys(userData).forEach(key => {
            if (key !== 'id' && userData[key] !== undefined) {
                fields.push(`${key} = $${paramIndex}`);
                values.push(userData[key]);
                paramIndex++;
            }
        });

        if (fields.length === 0) {
            // Если нет полей для обновления, возвращаем текущего пользователя
            return await this.findById(id);
        }

        values.push(id);
        const sql = `
            UPDATE users 
            SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        const result = await query(sql, values);
        return result.rows[0];
    }

    // Получение баланса пользователя
    static async getBalance(userId) {
        const sql = 'SELECT * FROM calculate_user_balance($1)';
        const result = await query(sql, [userId]);
        return result.rows[0] || {
            on_chain_balance: '0',
            accrued_balance: '0',
            withdrawn_balance: '0',
            total_balance: '0'
        };
    }

    // Получение пользователей с пагинацией (для админки)
    static async getAll(limit = 50, offset = 0, search = '') {
        let sql = `
            SELECT 
                u.*,
                COUNT(d.id) as deposits_count,
                COUNT(w.id) as withdrawals_count,
                COALESCE(SUM(CASE WHEN d.status = 'approved' THEN d.amount ELSE 0 END), 0) as total_deposited,
                COALESCE(SUM(CASE WHEN w.status = 'paid' THEN w.actual_amount ELSE 0 END), 0) as total_withdrawn
            FROM users u
            LEFT JOIN deposits d ON u.id = d.user_id
            LEFT JOIN withdrawals w ON u.id = w.user_id
        `;

        const params = [];
        if (search) {
            sql += ` WHERE u.username ILIKE $1 OR u.first_name ILIKE $1 OR u.last_name ILIKE $1`;
            params.push(`%${search}%`);
        }

        sql += `
            GROUP BY u.id
            ORDER BY u.created_at DESC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;

        params.push(limit, offset);

        const result = await query(sql, params);
        return result.rows;
    }

    // Получение общего количества пользователей
    static async getCount(search = '') {
        let sql = 'SELECT COUNT(*) FROM users';
        const params = [];

        if (search) {
            sql += ' WHERE username ILIKE $1 OR first_name ILIKE $1 OR last_name ILIKE $1';
            params.push(`%${search}%`);
        }

        const result = await query(sql, params);
        return parseInt(result.rows[0].count);
    }

    // Деактивация пользователя
    static async deactivate(id) {
        const sql = `
            UPDATE users 
            SET is_active = false, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;
        const result = await query(sql, [id]);
        return result.rows[0];
    }

    // Активация пользователя
    static async activate(id) {
        const sql = `
            UPDATE users 
            SET is_active = true, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;
        const result = await query(sql, [id]);
        return result.rows[0];
    }

    // Получение статистики пользователя
    static async getStats(userId) {
        const sql = `
            SELECT 
                u.created_at as registration_date,
                COUNT(DISTINCT d.id) as total_deposits,
                COUNT(DISTINCT CASE WHEN d.status = 'approved' THEN d.id END) as approved_deposits,
                COUNT(DISTINCT w.id) as total_withdrawals,
                COUNT(DISTINCT CASE WHEN w.status = 'paid' THEN w.id END) as paid_withdrawals,
                COUNT(DISTINCT a.id) as total_accruals,
                COALESCE(SUM(CASE WHEN d.status = 'approved' THEN d.amount ELSE 0 END), 0) as total_deposited,
                COALESCE(SUM(CASE WHEN w.status = 'paid' THEN w.actual_amount ELSE 0 END), 0) as total_withdrawn,
                COALESCE(SUM(a.amount), 0) as total_accrued
            FROM users u
            LEFT JOIN deposits d ON u.id = d.user_id
            LEFT JOIN withdrawals w ON u.id = w.user_id
            LEFT JOIN accruals a ON u.id = a.user_id
            WHERE u.id = $1
            GROUP BY u.id, u.created_at
        `;

        const result = await query(sql, [userId]);
        return result.rows[0];
    }
}

module.exports = User;
