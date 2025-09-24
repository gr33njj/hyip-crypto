const { query, transaction } = require('../config/database');

class Accrual {
    // Создание начисления
    static async create(accrualData) {
        const {
            user_id,
            amount,
            reason,
            accrual_type = 'manual',
            reference_deposit_id = null,
            created_by
        } = accrualData;

        return await transaction(async (client) => {
            const result = await client.query(
                `INSERT INTO accruals (user_id, amount, reason, accrual_type, reference_deposit_id, created_by)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING *`,
                [user_id, amount, reason, accrual_type, reference_deposit_id, created_by]
            );

            const accrual = result.rows[0];

            // Записываем действие админа
            await client.query(
                `INSERT INTO admin_actions (admin_id, action_type, entity_type, entity_id, details)
                 VALUES ($1, 'create_accrual', 'accruals', $2, $3)`,
                [created_by, accrual.id, JSON.stringify({ 
                    user_id, 
                    amount, 
                    reason, 
                    accrual_type 
                })]
            );

            return accrual;
        });
    }

    // Массовое создание начислений (для процентов)
    static async createBulk(accruals, created_by) {
        return await transaction(async (client) => {
            const results = [];

            for (const accrualData of accruals) {
                const { user_id, amount, reason, accrual_type = 'interest', reference_deposit_id = null } = accrualData;

                const result = await client.query(
                    `INSERT INTO accruals (user_id, amount, reason, accrual_type, reference_deposit_id, created_by)
                     VALUES ($1, $2, $3, $4, $5, $6)
                     RETURNING *`,
                    [user_id, amount, reason, accrual_type, reference_deposit_id, created_by]
                );

                results.push(result.rows[0]);
            }

            // Записываем действие админа для массового начисления
            await client.query(
                `INSERT INTO admin_actions (admin_id, action_type, entity_type, entity_id, details)
                 VALUES ($1, 'bulk_accruals', 'accruals', null, $2)`,
                [created_by, JSON.stringify({ 
                    count: accruals.length,
                    total_amount: accruals.reduce((sum, a) => sum + parseFloat(a.amount), 0)
                })]
            );

            return results;
        });
    }

    // Поиск начисления по ID
    static async findById(id) {
        const sql = `
            SELECT a.*, u.telegram_id, u.username, u.first_name, u.last_name
            FROM accruals a
            LEFT JOIN users u ON a.user_id = u.id
            WHERE a.id = $1
        `;
        const result = await query(sql, [id]);
        return result.rows[0];
    }

    // Получение начислений пользователя
    static async getByUserId(userId, limit = 50, offset = 0) {
        const sql = `
            SELECT a.*, d.tx_hash as reference_tx_hash
            FROM accruals a
            LEFT JOIN deposits d ON a.reference_deposit_id = d.id
            WHERE a.user_id = $1 
            ORDER BY a.created_at DESC 
            LIMIT $2 OFFSET $3
        `;
        const result = await query(sql, [userId, limit, offset]);
        return result.rows;
    }

    // Получение всех начислений для админки
    static async getAll(filters = {}, limit = 50, offset = 0) {
        let sql = `
            SELECT a.*, u.telegram_id, u.username, u.first_name, u.last_name,
                   d.tx_hash as reference_tx_hash
            FROM accruals a
            LEFT JOIN users u ON a.user_id = u.id
            LEFT JOIN deposits d ON a.reference_deposit_id = d.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        // Применяем фильтры
        if (filters.user_id) {
            sql += ` AND a.user_id = $${paramIndex}`;
            params.push(filters.user_id);
            paramIndex++;
        }

        if (filters.accrual_type) {
            sql += ` AND a.accrual_type = $${paramIndex}`;
            params.push(filters.accrual_type);
            paramIndex++;
        }

        if (filters.created_by) {
            sql += ` AND a.created_by = $${paramIndex}`;
            params.push(filters.created_by);
            paramIndex++;
        }

        if (filters.date_from) {
            sql += ` AND a.created_at >= $${paramIndex}`;
            params.push(filters.date_from);
            paramIndex++;
        }

        if (filters.date_to) {
            sql += ` AND a.created_at <= $${paramIndex}`;
            params.push(filters.date_to);
            paramIndex++;
        }

        if (filters.amount_from) {
            sql += ` AND a.amount >= $${paramIndex}`;
            params.push(filters.amount_from);
            paramIndex++;
        }

        if (filters.amount_to) {
            sql += ` AND a.amount <= $${paramIndex}`;
            params.push(filters.amount_to);
            paramIndex++;
        }

        sql += ` ORDER BY a.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await query(sql, params);
        return result.rows;
    }

    // Получение количества начислений
    static async getCount(filters = {}) {
        let sql = 'SELECT COUNT(*) FROM accruals WHERE 1=1';
        const params = [];
        let paramIndex = 1;

        // Применяем те же фильтры
        if (filters.user_id) {
            sql += ` AND user_id = $${paramIndex}`;
            params.push(filters.user_id);
            paramIndex++;
        }

        if (filters.accrual_type) {
            sql += ` AND accrual_type = $${paramIndex}`;
            params.push(filters.accrual_type);
            paramIndex++;
        }

        if (filters.created_by) {
            sql += ` AND created_by = $${paramIndex}`;
            params.push(filters.created_by);
            paramIndex++;
        }

        if (filters.date_from) {
            sql += ` AND created_at >= $${paramIndex}`;
            params.push(filters.date_from);
            paramIndex++;
        }

        if (filters.date_to) {
            sql += ` AND created_at <= $${paramIndex}`;
            params.push(filters.date_to);
            paramIndex++;
        }

        const result = await query(sql, params);
        return parseInt(result.rows[0].count);
    }

    // Удаление начисления (только для корректировок)
    static async delete(id, adminId, reason) {
        return await transaction(async (client) => {
            // Сначала получаем информацию о начислении
            const accrual = await client.query('SELECT * FROM accruals WHERE id = $1', [id]);
            
            if (!accrual.rows[0]) {
                throw new Error('Начисление не найдено');
            }

            // Удаляем начисление
            await client.query('DELETE FROM accruals WHERE id = $1', [id]);

            // Записываем действие админа
            await client.query(
                `INSERT INTO admin_actions (admin_id, action_type, entity_type, entity_id, details)
                 VALUES ($1, 'delete_accrual', 'accruals', $2, $3)`,
                [adminId, id, JSON.stringify({ 
                    deleted_accrual: accrual.rows[0],
                    reason 
                })]
            );

            return accrual.rows[0];
        });
    }

    // Обновление начисления
    static async update(id, updateData, adminId) {
        return await transaction(async (client) => {
            const fields = [];
            const values = [];
            let paramIndex = 1;

            Object.keys(updateData).forEach(key => {
                if (key !== 'id' && updateData[key] !== undefined) {
                    fields.push(`${key} = $${paramIndex}`);
                    values.push(updateData[key]);
                    paramIndex++;
                }
            });

            if (fields.length === 0) {
                return await this.findById(id);
            }

            values.push(id);
            const sql = `
                UPDATE accruals 
                SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
                WHERE id = $${paramIndex}
                RETURNING *
            `;

            const result = await client.query(sql, values);

            // Записываем действие админа
            await client.query(
                `INSERT INTO admin_actions (admin_id, action_type, entity_type, entity_id, details)
                 VALUES ($1, 'update_accrual', 'accruals', $2, $3)`,
                [adminId, id, JSON.stringify(updateData)]
            );

            return result.rows[0];
        });
    }

    // Статистика начислений
    static async getStats(dateFrom = null, dateTo = null) {
        let sql = `
            SELECT 
                COUNT(*) as total_accruals,
                COUNT(CASE WHEN accrual_type = 'manual' THEN 1 END) as manual_count,
                COUNT(CASE WHEN accrual_type = 'interest' THEN 1 END) as interest_count,
                COUNT(CASE WHEN accrual_type = 'bonus' THEN 1 END) as bonus_count,
                COUNT(CASE WHEN accrual_type = 'correction' THEN 1 END) as correction_count,
                COALESCE(SUM(amount), 0) as total_amount,
                COALESCE(SUM(CASE WHEN accrual_type = 'manual' THEN amount ELSE 0 END), 0) as manual_amount,
                COALESCE(SUM(CASE WHEN accrual_type = 'interest' THEN amount ELSE 0 END), 0) as interest_amount,
                COALESCE(AVG(amount), 0) as avg_amount
            FROM accruals
            WHERE 1=1
        `;

        const params = [];
        let paramIndex = 1;

        if (dateFrom) {
            sql += ` AND created_at >= $${paramIndex}`;
            params.push(dateFrom);
            paramIndex++;
        }

        if (dateTo) {
            sql += ` AND created_at <= $${paramIndex}`;
            params.push(dateTo);
            paramIndex++;
        }

        const result = await query(sql, params);
        return result.rows[0];
    }

    // Расчёт процентов для пользователей
    static async calculateInterestForUsers(interestRate, adminId, reason = 'Ежедневное начисление процентов') {
        // Получаем пользователей с положительными балансами
        const usersWithBalance = await query(`
            SELECT 
                u.id,
                u.telegram_id,
                u.username,
                COALESCE(SUM(CASE WHEN d.status = 'approved' THEN d.amount ELSE 0 END), 0) as deposited_amount
            FROM users u
            LEFT JOIN deposits d ON u.id = d.user_id
            GROUP BY u.id, u.telegram_id, u.username
            HAVING COALESCE(SUM(CASE WHEN d.status = 'approved' THEN d.amount ELSE 0 END), 0) > 0
        `);

        const accruals = usersWithBalance.rows.map(user => ({
            user_id: user.id,
            amount: (parseFloat(user.deposited_amount) * interestRate / 100).toFixed(6),
            reason: reason,
            accrual_type: 'interest'
        }));

        if (accruals.length > 0) {
            return await this.createBulk(accruals, adminId);
        }

        return [];
    }

    // Получение суммы начислений пользователя
    static async getUserAccrualsSum(userId) {
        const sql = `
            SELECT COALESCE(SUM(amount), 0) as total_accrued
            FROM accruals 
            WHERE user_id = $1
        `;
        const result = await query(sql, [userId]);
        return parseFloat(result.rows[0].total_accrued);
    }

    // Получение последнего начисления процентов
    static async getLastInterestAccrual() {
        const sql = `
            SELECT MAX(created_at) as last_interest_date
            FROM accruals 
            WHERE accrual_type = 'interest'
        `;
        const result = await query(sql);
        return result.rows[0].last_interest_date;
    }
}

module.exports = Accrual;
