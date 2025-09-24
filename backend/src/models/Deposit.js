const { query, transaction } = require('../config/database');

class Deposit {
    // Создание нового депозита (при ручной подаче)
    static async create(depositData) {
        const {
            user_id,
            tx_hash,
            amount,
            token = 'USDT-TRC20',
            from_address,
            to_address,
            block_number,
            confirmations = 0,
            status = 'submitted'
        } = depositData;

        const sql = `
            INSERT INTO deposits (
                user_id, tx_hash, amount, token, from_address, to_address, 
                block_number, confirmations, status, submitted_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
            RETURNING *
        `;

        const result = await query(sql, [
            user_id, tx_hash, amount, token, from_address, 
            to_address, block_number, confirmations, status
        ]);

        return result.rows[0];
    }

    // Создание депозита от мониторинга (автоматически обнаруженного)
    static async createFromMonitoring(txData) {
        const {
            tx_hash,
            amount,
            token = 'USDT-TRC20',
            from_address,
            to_address,
            block_number,
            confirmations = 0
        } = txData;

        const sql = `
            INSERT INTO deposits (
                tx_hash, amount, token, from_address, to_address, 
                block_number, confirmations, status, detected_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'detected', CURRENT_TIMESTAMP)
            RETURNING *
        `;

        const result = await query(sql, [
            tx_hash, amount, token, from_address, 
            to_address, block_number, confirmations
        ]);

        return result.rows[0];
    }

    // Поиск депозита по hash транзакции
    static async findByTxHash(txHash) {
        const sql = 'SELECT * FROM deposits WHERE tx_hash = $1';
        const result = await query(sql, [txHash]);
        return result.rows[0];
    }

    // Поиск депозита по ID
    static async findById(id) {
        const sql = `
            SELECT d.*, u.telegram_id, u.username 
            FROM deposits d
            LEFT JOIN users u ON d.user_id = u.id
            WHERE d.id = $1
        `;
        const result = await query(sql, [id]);
        return result.rows[0];
    }

    // Обновление депозита
    static async update(id, updateData) {
        const fields = [];
        const values = [];
        let paramIndex = 1;

        // Автоматически устанавливаем timestamp для статусов
        if (updateData.status) {
            switch (updateData.status) {
                case 'detected':
                    updateData.detected_at = 'CURRENT_TIMESTAMP';
                    break;
                case 'approved':
                    updateData.approved_at = 'CURRENT_TIMESTAMP';
                    break;
                case 'rejected':
                    updateData.rejected_at = 'CURRENT_TIMESTAMP';
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
            UPDATE deposits 
            SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        const result = await query(sql, values);
        return result.rows[0];
    }

    // Апрув депозита админом
    static async approve(id, adminId, amount = null, comment = null) {
        return await transaction(async (client) => {
            // Обновляем депозит
            const updateData = {
                status: 'approved',
                processed_by: adminId,
                admin_comment: comment
            };

            if (amount !== null) {
                updateData.amount = amount;
            }

            let sql = `
                UPDATE deposits 
                SET status = 'approved', processed_by = $2, approved_at = CURRENT_TIMESTAMP, 
                    updated_at = CURRENT_TIMESTAMP
            `;
            let params = [id, adminId];
            let paramIndex = 3;

            if (amount !== null) {
                sql += `, amount = $${paramIndex}`;
                params.push(amount);
                paramIndex++;
            }

            if (comment) {
                sql += `, admin_comment = $${paramIndex}`;
                params.push(comment);
                paramIndex++;
            }

            sql += ` WHERE id = $1 RETURNING *`;

            const result = await client.query(sql, params);
            const deposit = result.rows[0];

            // Записываем действие админа
            await client.query(
                `INSERT INTO admin_actions (admin_id, action_type, entity_type, entity_id, details)
                 VALUES ($1, 'approve_deposit', 'deposits', $2, $3)`,
                [adminId, id, JSON.stringify({ amount: amount || deposit.amount, comment })]
            );

            return deposit;
        });
    }

    // Отклонение депозита админом
    static async reject(id, adminId, reason) {
        return await transaction(async (client) => {
            const result = await client.query(
                `UPDATE deposits 
                 SET status = 'rejected', processed_by = $2, rejected_at = CURRENT_TIMESTAMP,
                     admin_comment = $3, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1 RETURNING *`,
                [id, adminId, reason]
            );

            // Записываем действие админа
            await client.query(
                `INSERT INTO admin_actions (admin_id, action_type, entity_type, entity_id, details)
                 VALUES ($1, 'reject_deposit', 'deposits', $2, $3)`,
                [adminId, id, JSON.stringify({ reason })]
            );

            return result.rows[0];
        });
    }

    // Получение депозитов пользователя
    static async getByUserId(userId, limit = 50, offset = 0) {
        const sql = `
            SELECT * FROM deposits 
            WHERE user_id = $1 
            ORDER BY created_at DESC 
            LIMIT $2 OFFSET $3
        `;
        const result = await query(sql, [userId, limit, offset]);
        return result.rows;
    }

    // Получение депозитов для админки
    static async getAll(filters = {}, limit = 50, offset = 0) {
        let sql = `
            SELECT d.*, u.telegram_id, u.username, u.first_name, u.last_name
            FROM deposits d
            LEFT JOIN users u ON d.user_id = u.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        // Применяем фильтры
        if (filters.status) {
            sql += ` AND d.status = $${paramIndex}`;
            params.push(filters.status);
            paramIndex++;
        }

        if (filters.user_id) {
            sql += ` AND d.user_id = $${paramIndex}`;
            params.push(filters.user_id);
            paramIndex++;
        }

        if (filters.tx_hash) {
            sql += ` AND d.tx_hash ILIKE $${paramIndex}`;
            params.push(`%${filters.tx_hash}%`);
            paramIndex++;
        }

        if (filters.from_address) {
            sql += ` AND d.from_address = $${paramIndex}`;
            params.push(filters.from_address);
            paramIndex++;
        }

        if (filters.date_from) {
            sql += ` AND d.created_at >= $${paramIndex}`;
            params.push(filters.date_from);
            paramIndex++;
        }

        if (filters.date_to) {
            sql += ` AND d.created_at <= $${paramIndex}`;
            params.push(filters.date_to);
            paramIndex++;
        }

        sql += ` ORDER BY d.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await query(sql, params);
        return result.rows;
    }

    // Получение количества депозитов
    static async getCount(filters = {}) {
        let sql = 'SELECT COUNT(*) FROM deposits WHERE 1=1';
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

    // Получение неопределённых депозитов (без привязки к пользователю)
    static async getUnmatched(limit = 50, offset = 0) {
        const sql = `
            SELECT * FROM deposits 
            WHERE user_id IS NULL AND status IN ('detected', 'pending')
            ORDER BY created_at DESC 
            LIMIT $1 OFFSET $2
        `;
        const result = await query(sql, [limit, offset]);
        return result.rows;
    }

    // Привязка депозита к пользователю
    static async linkToUser(depositId, userId, adminId) {
        return await transaction(async (client) => {
            const result = await client.query(
                `UPDATE deposits 
                 SET user_id = $2, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1 RETURNING *`,
                [depositId, userId]
            );

            // Записываем действие админа
            await client.query(
                `INSERT INTO admin_actions (admin_id, action_type, entity_type, entity_id, details)
                 VALUES ($1, 'link_deposit_to_user', 'deposits', $2, $3)`,
                [adminId, depositId, JSON.stringify({ user_id: userId })]
            );

            return result.rows[0];
        });
    }

    // Обновление количества подтверждений
    static async updateConfirmations(txHash, confirmations) {
        const sql = `
            UPDATE deposits 
            SET confirmations = $2, updated_at = CURRENT_TIMESTAMP
            WHERE tx_hash = $1 
            RETURNING *
        `;
        const result = await query(sql, [txHash, confirmations]);
        return result.rows[0];
    }

    // Поиск дубликатов по hash
    static async findDuplicates(txHash) {
        const sql = 'SELECT * FROM deposits WHERE tx_hash = $1 ORDER BY created_at';
        const result = await query(sql, [txHash]);
        return result.rows;
    }

    // Статистика депозитов
    static async getStats(dateFrom = null, dateTo = null) {
        let sql = `
            SELECT 
                COUNT(*) as total_deposits,
                COUNT(CASE WHEN status = 'submitted' THEN 1 END) as submitted_count,
                COUNT(CASE WHEN status = 'detected' THEN 1 END) as detected_count,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
                COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
                COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
                COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) as approved_amount,
                COALESCE(AVG(CASE WHEN status = 'approved' THEN amount END), 0) as avg_approved_amount
            FROM deposits
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
}

module.exports = Deposit;
