const { query, transaction } = require('../config/database');

class Withdrawal {
    // Создание заявки на вывод
    static async create(withdrawalData) {
        const {
            user_id,
            requested_amount,
            to_address,
            withdrawal_type = 'partial'
        } = withdrawalData;

        const sql = `
            INSERT INTO withdrawals (user_id, requested_amount, to_address, withdrawal_type)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;

        const result = await query(sql, [user_id, requested_amount, to_address, withdrawal_type]);
        return result.rows[0];
    }

    // Поиск заявки по ID
    static async findById(id) {
        const sql = `
            SELECT w.*, u.telegram_id, u.username, u.first_name, u.last_name
            FROM withdrawals w
            LEFT JOIN users u ON w.user_id = u.id
            WHERE w.id = $1
        `;
        const result = await query(sql, [id]);
        return result.rows[0];
    }

    // Обновление заявки
    static async update(id, updateData) {
        const fields = [];
        const values = [];
        let paramIndex = 1;

        // Автоматически устанавливаем timestamp для статусов
        if (updateData.status) {
            switch (updateData.status) {
                case 'approved':
                    updateData.processed_at = 'CURRENT_TIMESTAMP';
                    break;
                case 'paid':
                    updateData.paid_at = 'CURRENT_TIMESTAMP';
                    break;
                case 'rejected':
                    updateData.processed_at = 'CURRENT_TIMESTAMP';
                    break;
            }
        }

        Object.keys(updateData).forEach(key => {
            if (key !== 'id' && updateData[key] !== undefined) {
                if (updateData[key] === 'CURRENT_TIMESTAMP') {
                    fields.push(`${key} = CURRENT_TIMESTAMP`);
                } else {
                    fields.push(`${key} = $${paramIndex}`);
                    values.push(updateData[key]);
                    paramIndex++;
                }
            }
        });

        if (fields.length === 0) {
            return await this.findById(id);
        }

        values.push(id);
        const sql = `
            UPDATE withdrawals 
            SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        const result = await query(sql, values);
        return result.rows[0];
    }

    // Одобрение заявки на вывод
    static async approve(id, adminId, comment = null) {
        return await transaction(async (client) => {
            const result = await client.query(
                `UPDATE withdrawals 
                 SET status = 'approved', processed_by = $2, processed_at = CURRENT_TIMESTAMP,
                     admin_comment = $3, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1 RETURNING *`,
                [id, adminId, comment]
            );

            // Записываем действие админа
            await client.query(
                `INSERT INTO admin_actions (admin_id, action_type, entity_type, entity_id, details)
                 VALUES ($1, 'approve_withdrawal', 'withdrawals', $2, $3)`,
                [adminId, id, JSON.stringify({ comment })]
            );

            return result.rows[0];
        });
    }

    // Отклонение заявки на вывод
    static async reject(id, adminId, reason) {
        return await transaction(async (client) => {
            const result = await client.query(
                `UPDATE withdrawals 
                 SET status = 'rejected', processed_by = $2, processed_at = CURRENT_TIMESTAMP,
                     admin_comment = $3, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1 RETURNING *`,
                [id, adminId, reason]
            );

            // Записываем действие админа
            await client.query(
                `INSERT INTO admin_actions (admin_id, action_type, entity_type, entity_id, details)
                 VALUES ($1, 'reject_withdrawal', 'withdrawals', $2, $3)`,
                [adminId, id, JSON.stringify({ reason })]
            );

            return result.rows[0];
        });
    }

    // Отметка как выплаченная
    static async markAsPaid(id, adminId, txHash, actualAmount = null) {
        return await transaction(async (client) => {
            const updateData = {
                status: 'paid',
                tx_hash: txHash,
                processed_by: adminId
            };

            if (actualAmount !== null) {
                updateData.actual_amount = actualAmount;
            }

            let sql = `
                UPDATE withdrawals 
                SET status = 'paid', tx_hash = $2, processed_by = $3, paid_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
            `;
            let params = [id, txHash, adminId];

            if (actualAmount !== null) {
                sql += `, actual_amount = $4`;
                params.push(actualAmount);
            }

            sql += ` WHERE id = $1 RETURNING *`;

            const result = await client.query(sql, params);

            // Записываем действие админа
            await client.query(
                `INSERT INTO admin_actions (admin_id, action_type, entity_type, entity_id, details)
                 VALUES ($1, 'mark_withdrawal_paid', 'withdrawals', $2, $3)`,
                [adminId, id, JSON.stringify({ tx_hash: txHash, actual_amount: actualAmount })]
            );

            return result.rows[0];
        });
    }

    // Отмена заявки
    static async cancel(id, adminId = null, reason = null) {
        return await transaction(async (client) => {
            const result = await client.query(
                `UPDATE withdrawals 
                 SET status = 'cancelled', processed_by = $2, processed_at = CURRENT_TIMESTAMP,
                     admin_comment = $3, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1 RETURNING *`,
                [id, adminId, reason]
            );

            // Записываем действие админа (если отменил админ)
            if (adminId) {
                await client.query(
                    `INSERT INTO admin_actions (admin_id, action_type, entity_type, entity_id, details)
                     VALUES ($1, 'cancel_withdrawal', 'withdrawals', $2, $3)`,
                    [adminId, id, JSON.stringify({ reason })]
                );
            }

            return result.rows[0];
        });
    }

    // Получение заявок пользователя
    static async getByUserId(userId, limit = 50, offset = 0) {
        const sql = `
            SELECT * FROM withdrawals 
            WHERE user_id = $1 
            ORDER BY created_at DESC 
            LIMIT $2 OFFSET $3
        `;
        const result = await query(sql, [userId, limit, offset]);
        return result.rows;
    }

    // Получение заявок для админки
    static async getAll(filters = {}, limit = 50, offset = 0) {
        let sql = `
            SELECT w.*, u.telegram_id, u.username, u.first_name, u.last_name
            FROM withdrawals w
            LEFT JOIN users u ON w.user_id = u.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        // Применяем фильтры
        if (filters.status) {
            sql += ` AND w.status = $${paramIndex}`;
            params.push(filters.status);
            paramIndex++;
        }

        if (filters.user_id) {
            sql += ` AND w.user_id = $${paramIndex}`;
            params.push(filters.user_id);
            paramIndex++;
        }

        if (filters.date_from) {
            sql += ` AND w.created_at >= $${paramIndex}`;
            params.push(filters.date_from);
            paramIndex++;
        }

        if (filters.date_to) {
            sql += ` AND w.created_at <= $${paramIndex}`;
            params.push(filters.date_to);
            paramIndex++;
        }

        if (filters.amount_from) {
            sql += ` AND w.requested_amount >= $${paramIndex}`;
            params.push(filters.amount_from);
            paramIndex++;
        }

        if (filters.amount_to) {
            sql += ` AND w.requested_amount <= $${paramIndex}`;
            params.push(filters.amount_to);
            paramIndex++;
        }

        sql += ` ORDER BY w.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await query(sql, params);
        return result.rows;
    }

    // Получение количества заявок
    static async getCount(filters = {}) {
        let sql = 'SELECT COUNT(*) FROM withdrawals WHERE 1=1';
        const params = [];
        let paramIndex = 1;

        // Применяем те же фильтры
        if (filters.status) {
            sql += ` AND status = $${paramIndex}`;
            params.push(filters.status);
            paramIndex++;
        }

        if (filters.user_id) {
            sql += ` AND user_id = $${paramIndex}`;
            params.push(filters.user_id);
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

    // Проверка возможности создания заявки
    static async canCreateWithdrawal(userId, requestedAmount) {
        // Получаем баланс пользователя
        const balanceResult = await query('SELECT * FROM calculate_user_balance($1)', [userId]);
        const balance = balanceResult.rows[0];

        if (!balance || parseFloat(balance.total_balance) < requestedAmount) {
            return {
                canCreate: false,
                reason: 'insufficient_balance',
                currentBalance: balance ? balance.total_balance : '0'
            };
        }

        // Проверяем наличие pending заявок
        const pendingResult = await query(
            'SELECT COUNT(*) FROM withdrawals WHERE user_id = $1 AND status IN ($2, $3)',
            [userId, 'pending', 'approved']
        );

        if (parseInt(pendingResult.rows[0].count) > 0) {
            return {
                canCreate: false,
                reason: 'pending_withdrawal_exists',
                currentBalance: balance.total_balance
            };
        }

        return {
            canCreate: true,
            currentBalance: balance.total_balance
        };
    }

    // Статистика выводов
    static async getStats(dateFrom = null, dateTo = null) {
        let sql = `
            SELECT 
                COUNT(*) as total_withdrawals,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
                COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
                COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
                COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN actual_amount ELSE 0 END), 0) as paid_amount,
                COALESCE(SUM(CASE WHEN status IN ('pending', 'approved') THEN requested_amount ELSE 0 END), 0) as pending_amount,
                COALESCE(AVG(CASE WHEN status = 'paid' THEN actual_amount END), 0) as avg_paid_amount
            FROM withdrawals
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

    // Получение суммы pending выводов (для проверки ликвидности)
    static async getPendingAmount() {
        const sql = `
            SELECT COALESCE(SUM(requested_amount), 0) as pending_amount
            FROM withdrawals 
            WHERE status IN ('pending', 'approved')
        `;
        const result = await query(sql);
        return parseFloat(result.rows[0].pending_amount);
    }

    // Получение дневного лимита выводов пользователя
    static async getDailyWithdrawnAmount(userId) {
        const sql = `
            SELECT COALESCE(SUM(actual_amount), 0) as daily_amount
            FROM withdrawals 
            WHERE user_id = $1 
              AND status = 'paid' 
              AND paid_at >= CURRENT_DATE
        `;
        const result = await query(sql, [userId]);
        return parseFloat(result.rows[0].daily_amount);
    }
}

module.exports = Withdrawal;
