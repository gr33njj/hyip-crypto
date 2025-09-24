const User = require('../models/User');
const Deposit = require('../models/Deposit');
const Withdrawal = require('../models/Withdrawal');
const Accrual = require('../models/Accrual');
const { query } = require('../config/database');

// Получение дашборда для админов
const getDashboard = async (req, res) => {
    try {
        // Получаем статистику за последние 30 дней
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [depositStats, withdrawalStats, accrualStats, userStats] = await Promise.all([
            Deposit.getStats(thirtyDaysAgo),
            Withdrawal.getStats(thirtyDaysAgo),
            Accrual.getStats(thirtyDaysAgo),
            getUserStats()
        ]);

        // Получаем количество pending операций
        const pendingDeposits = await Deposit.getCount({ status: 'pending' });
        const pendingWithdrawals = await Withdrawal.getCount({ status: 'pending' });
        const pendingWithdrawalAmount = await Withdrawal.getPendingAmount();

        // Получаем общий баланс пула
        const poolBalance = await getPoolBalance();

        res.json({
            success: true,
            data: {
                statistics: {
                    deposits: depositStats,
                    withdrawals: withdrawalStats,
                    accruals: accrualStats,
                    users: userStats
                },
                pending_operations: {
                    deposits_count: pendingDeposits,
                    withdrawals_count: pendingWithdrawals,
                    withdrawals_amount: pendingWithdrawalAmount
                },
                pool_info: {
                    balance: poolBalance.balance,
                    obligations: poolBalance.obligations,
                    free_balance: poolBalance.free_balance,
                    ratio: poolBalance.ratio
                },
                alerts: await getSystemAlerts(poolBalance, pendingWithdrawals)
            }
        });
    } catch (error) {
        console.error('Ошибка получения дашборда админа:', error);
        res.status(500).json({
            error: 'internal_error',
            message: 'Внутренняя ошибка сервера'
        });
    }
};

// Получение всех депозитов для админа
const getAllDeposits = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;

        const filters = {
            status: req.query.status,
            user_id: req.query.user_id,
            tx_hash: req.query.tx_hash,
            from_address: req.query.from_address,
            date_from: req.query.date_from,
            date_to: req.query.date_to
        };

        // Убираем undefined значения
        Object.keys(filters).forEach(key => {
            if (filters[key] === undefined) delete filters[key];
        });

        const [deposits, total] = await Promise.all([
            Deposit.getAll(filters, limit, offset),
            Deposit.getCount(filters)
        ]);

        res.json({
            success: true,
            data: {
                deposits,
                pagination: {
                    page,
                    limit,
                    total,
                    total_pages: Math.ceil(total / limit),
                    has_more: offset + deposits.length < total
                }
            }
        });
    } catch (error) {
        console.error('Ошибка получения депозитов для админа:', error);
        res.status(500).json({
            error: 'internal_error',
            message: 'Внутренняя ошибка сервера'
        });
    }
};

// Одобрение депозита
const approveDeposit = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, admin_comment } = req.body;

        const deposit = await Deposit.findById(id);
        if (!deposit) {
            return res.status(404).json({
                error: 'deposit_not_found',
                message: 'Депозит не найден'
            });
        }

        if (deposit.status !== 'pending' && deposit.status !== 'submitted') {
            return res.status(400).json({
                error: 'invalid_status',
                message: 'Можно одобрить только депозиты в статусе pending или submitted'
            });
        }

        const approvedDeposit = await Deposit.approve(id, req.user.telegram_id, amount, admin_comment);

        res.json({
            success: true,
            data: { deposit: approvedDeposit },
            message: 'Депозит одобрен'
        });
    } catch (error) {
        console.error('Ошибка одобрения депозита:', error);
        res.status(500).json({
            error: 'internal_error',
            message: 'Внутренняя ошибка сервера'
        });
    }
};

// Отклонение депозита
const rejectDeposit = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const deposit = await Deposit.findById(id);
        if (!deposit) {
            return res.status(404).json({
                error: 'deposit_not_found',
                message: 'Депозит не найден'
            });
        }

        const rejectedDeposit = await Deposit.reject(id, req.user.telegram_id, reason);

        res.json({
            success: true,
            data: { deposit: rejectedDeposit },
            message: 'Депозит отклонён'
        });
    } catch (error) {
        console.error('Ошибка отклонения депозита:', error);
        res.status(500).json({
            error: 'internal_error',
            message: 'Внутренняя ошибка сервера'
        });
    }
};

// Получение всех заявок на вывод для админа
const getAllWithdrawals = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;

        const filters = {
            status: req.query.status,
            user_id: req.query.user_id,
            date_from: req.query.date_from,
            date_to: req.query.date_to,
            amount_from: req.query.amount_from,
            amount_to: req.query.amount_to
        };

        Object.keys(filters).forEach(key => {
            if (filters[key] === undefined) delete filters[key];
        });

        const [withdrawals, total] = await Promise.all([
            Withdrawal.getAll(filters, limit, offset),
            Withdrawal.getCount(filters)
        ]);

        res.json({
            success: true,
            data: {
                withdrawals,
                pagination: {
                    page,
                    limit,
                    total,
                    total_pages: Math.ceil(total / limit),
                    has_more: offset + withdrawals.length < total
                }
            }
        });
    } catch (error) {
        console.error('Ошибка получения заявок на вывод для админа:', error);
        res.status(500).json({
            error: 'internal_error',
            message: 'Внутренняя ошибка сервера'
        });
    }
};

// Одобрение заявки на вывод
const approveWithdrawal = async (req, res) => {
    try {
        const { id } = req.params;
        const { admin_comment } = req.body;

        const withdrawal = await Withdrawal.findById(id);
        if (!withdrawal) {
            return res.status(404).json({
                error: 'withdrawal_not_found',
                message: 'Заявка на вывод не найдена'
            });
        }

        if (withdrawal.status !== 'pending') {
            return res.status(400).json({
                error: 'invalid_status',
                message: 'Можно одобрить только заявки в статусе pending'
            });
        }

        const approvedWithdrawal = await Withdrawal.approve(id, req.user.telegram_id, admin_comment);

        res.json({
            success: true,
            data: { withdrawal: approvedWithdrawal },
            message: 'Заявка на вывод одобрена'
        });
    } catch (error) {
        console.error('Ошибка одобрения заявки на вывод:', error);
        res.status(500).json({
            error: 'internal_error',
            message: 'Внутренняя ошибка сервера'
        });
    }
};

// Отклонение заявки на вывод
const rejectWithdrawal = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const withdrawal = await Withdrawal.findById(id);
        if (!withdrawal) {
            return res.status(404).json({
                error: 'withdrawal_not_found',
                message: 'Заявка на вывод не найдена'
            });
        }

        const rejectedWithdrawal = await Withdrawal.reject(id, req.user.telegram_id, reason);

        res.json({
            success: true,
            data: { withdrawal: rejectedWithdrawal },
            message: 'Заявка на вывод отклонена'
        });
    } catch (error) {
        console.error('Ошибка отклонения заявки на вывод:', error);
        res.status(500).json({
            error: 'internal_error',
            message: 'Внутренняя ошибка сервера'
        });
    }
};

// Отметка заявки как выплаченной
const markWithdrawalPaid = async (req, res) => {
    try {
        const { id } = req.params;
        const { tx_hash, actual_amount } = req.body;

        const withdrawal = await Withdrawal.findById(id);
        if (!withdrawal) {
            return res.status(404).json({
                error: 'withdrawal_not_found',
                message: 'Заявка на вывод не найдена'
            });
        }

        if (withdrawal.status !== 'approved') {
            return res.status(400).json({
                error: 'invalid_status',
                message: 'Можно отметить как выплаченную только одобренные заявки'
            });
        }

        const paidWithdrawal = await Withdrawal.markAsPaid(
            id, 
            req.user.telegram_id, 
            tx_hash, 
            actual_amount || withdrawal.requested_amount
        );

        res.json({
            success: true,
            data: { withdrawal: paidWithdrawal },
            message: 'Заявка отмечена как выплаченная'
        });
    } catch (error) {
        console.error('Ошибка отметки заявки как выплаченной:', error);
        res.status(500).json({
            error: 'internal_error',
            message: 'Внутренняя ошибка сервера'
        });
    }
};

// Создание начисления
const createAccrual = async (req, res) => {
    try {
        const { user_id, amount, reason, accrual_type, reference_deposit_id } = req.body;

        // Проверяем существование пользователя
        const user = await User.findById(user_id);
        if (!user) {
            return res.status(404).json({
                error: 'user_not_found',
                message: 'Пользователь не найден'
            });
        }

        const accrual = await Accrual.create({
            user_id,
            amount: parseFloat(amount),
            reason,
            accrual_type: accrual_type || 'manual',
            reference_deposit_id,
            created_by: req.user.telegram_id
        });

        res.status(201).json({
            success: true,
            data: { accrual },
            message: 'Начисление создано'
        });
    } catch (error) {
        console.error('Ошибка создания начисления:', error);
        res.status(500).json({
            error: 'internal_error',
            message: 'Внутренняя ошибка сервера'
        });
    }
};

// Получение всех пользователей для админа
const getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';

        const [users, total] = await Promise.all([
            User.getAll(limit, offset, search),
            User.getCount(search)
        ]);

        res.json({
            success: true,
            data: {
                users,
                pagination: {
                    page,
                    limit,
                    total,
                    total_pages: Math.ceil(total / limit),
                    has_more: offset + users.length < total
                }
            }
        });
    } catch (error) {
        console.error('Ошибка получения пользователей для админа:', error);
        res.status(500).json({
            error: 'internal_error',
            message: 'Внутренняя ошибка сервера'
        });
    }
};

// Вспомогательные функции
const getUserStats = async () => {
    const result = await query(`
        SELECT 
            COUNT(*) as total_users,
            COUNT(CASE WHEN is_active THEN 1 END) as active_users,
            COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_users_30d,
            COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as new_users_7d
        FROM users
    `);
    return result.rows[0];
};

const getPoolBalance = async () => {
    // В реальной реализации здесь будет запрос к TronWeb для получения баланса пула
    // Пока возвращаем моковые данные
    const result = await query(`
        SELECT 
            COALESCE(SUM(CASE WHEN d.status = 'approved' THEN d.amount ELSE 0 END), 0) as total_deposited,
            COALESCE(SUM(CASE WHEN w.status = 'paid' THEN w.actual_amount ELSE 0 END), 0) as total_withdrawn,
            COALESCE(SUM(CASE WHEN w.status IN ('pending', 'approved') THEN w.requested_amount ELSE 0 END), 0) as pending_withdrawals
        FROM deposits d
        FULL OUTER JOIN withdrawals w ON 1=1
    `);
    
    const stats = result.rows[0];
    const balance = parseFloat(stats.total_deposited) - parseFloat(stats.total_withdrawn);
    const obligations = parseFloat(stats.pending_withdrawals);
    const freeBalance = balance - obligations;
    const ratio = balance > 0 ? freeBalance / balance : 0;

    return {
        balance: balance.toFixed(6),
        obligations: obligations.toFixed(6),
        free_balance: freeBalance.toFixed(6),
        ratio: ratio.toFixed(4)
    };
};

const getSystemAlerts = async (poolBalance, pendingWithdrawals) => {
    const alerts = [];

    // Проверяем соотношение баланса к обязательствам
    if (parseFloat(poolBalance.ratio) < 0.1) {
        alerts.push({
            type: 'critical',
            message: 'Критически низкий свободный баланс пула',
            details: `Свободный баланс: ${poolBalance.free_balance} USDT`
        });
    } else if (parseFloat(poolBalance.ratio) < 0.3) {
        alerts.push({
            type: 'warning',
            message: 'Низкий свободный баланс пула',
            details: `Свободный баланс: ${poolBalance.free_balance} USDT`
        });
    }

    // Проверяем количество pending выводов
    if (pendingWithdrawals > 10) {
        alerts.push({
            type: 'warning',
            message: 'Много заявок на вывод в ожидании',
            details: `Заявок в ожидании: ${pendingWithdrawals}`
        });
    }

    return alerts;
};

module.exports = {
    getDashboard,
    getAllDeposits,
    approveDeposit,
    rejectDeposit,
    getAllWithdrawals,
    approveWithdrawal,
    rejectWithdrawal,
    markWithdrawalPaid,
    createAccrual,
    getAllUsers
};
