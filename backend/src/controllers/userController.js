const User = require('../models/User');

// Получение профиля текущего пользователя
const getProfile = async (req, res) => {
    try {
        // Получаем баланс пользователя
        const balance = await User.getBalance(req.user.id);
        
        // Получаем статистику пользователя
        const stats = await User.getStats(req.user.id);

        res.json({
            success: true,
            data: {
                user: {
                    id: req.user.id,
                    telegram_id: req.user.telegram_id,
                    username: req.user.username,
                    first_name: req.user.first_name,
                    last_name: req.user.last_name,
                    language_code: req.user.language_code,
                    wallet_address: req.user.wallet_address,
                    created_at: req.user.created_at
                },
                balance,
                stats
            }
        });
    } catch (error) {
        console.error('Ошибка получения профиля:', error);
        res.status(500).json({
            error: 'internal_error',
            message: 'Внутренняя ошибка сервера'
        });
    }
};

// Получение баланса пользователя
const getBalance = async (req, res) => {
    try {
        const balance = await User.getBalance(req.user.id);
        
        res.json({
            success: true,
            data: balance
        });
    } catch (error) {
        console.error('Ошибка получения баланса:', error);
        res.status(500).json({
            error: 'internal_error',
            message: 'Внутренняя ошибка сервера'
        });
    }
};

// Обновление профиля пользователя
const updateProfile = async (req, res) => {
    try {
        const allowedFields = ['username', 'first_name', 'last_name', 'language_code'];
        const updateData = {};
        
        // Фильтруем только разрешённые поля
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        });

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                error: 'no_data',
                message: 'Нет данных для обновления'
            });
        }

        const updatedUser = await User.update(req.user.id, updateData);
        
        res.json({
            success: true,
            data: {
                user: {
                    id: updatedUser.id,
                    telegram_id: updatedUser.telegram_id,
                    username: updatedUser.username,
                    first_name: updatedUser.first_name,
                    last_name: updatedUser.last_name,
                    language_code: updatedUser.language_code,
                    updated_at: updatedUser.updated_at
                }
            },
            message: 'Профиль обновлён'
        });
    } catch (error) {
        console.error('Ошибка обновления профиля:', error);
        res.status(500).json({
            error: 'internal_error',
            message: 'Внутренняя ошибка сервера'
        });
    }
};

// Получение истории операций пользователя
const getUserHistory = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;
        const type = req.query.type; // deposits, withdrawals, accruals

        let history = [];

        if (!type || type === 'deposits') {
            const Deposit = require('../models/Deposit');
            const deposits = await Deposit.getByUserId(req.user.id, limit, offset);
            history = history.concat(deposits.map(d => ({
                ...d,
                operation_type: 'deposit'
            })));
        }

        if (!type || type === 'withdrawals') {
            const Withdrawal = require('../models/Withdrawal');
            const withdrawals = await Withdrawal.getByUserId(req.user.id, limit, offset);
            history = history.concat(withdrawals.map(w => ({
                ...w,
                operation_type: 'withdrawal'
            })));
        }

        if (!type || type === 'accruals') {
            const Accrual = require('../models/Accrual');
            const accruals = await Accrual.getByUserId(req.user.id, limit, offset);
            history = history.concat(accruals.map(a => ({
                ...a,
                operation_type: 'accrual'
            })));
        }

        // Сортируем по дате создания
        history.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        // Обрезаем до лимита если получили данные из нескольких источников
        if (type === undefined) {
            history = history.slice(0, limit);
        }

        res.json({
            success: true,
            data: {
                history,
                pagination: {
                    page,
                    limit,
                    total: history.length
                }
            }
        });
    } catch (error) {
        console.error('Ошибка получения истории пользователя:', error);
        res.status(500).json({
            error: 'internal_error',
            message: 'Внутренняя ошибка сервера'
        });
    }
};

// Деактивация аккаунта (self-service)
const deactivateAccount = async (req, res) => {
    try {
        // Проверяем, нет ли pending операций
        const Withdrawal = require('../models/Withdrawal');
        const pendingWithdrawals = await Withdrawal.getByUserId(req.user.id, 1, 0);
        
        if (pendingWithdrawals.length > 0 && pendingWithdrawals[0].status === 'pending') {
            return res.status(400).json({
                error: 'pending_operations',
                message: 'Невозможно деактивировать аккаунт с незавершёнными операциями'
            });
        }

        await User.deactivate(req.user.id);
        
        res.json({
            success: true,
            message: 'Аккаунт деактивирован'
        });
    } catch (error) {
        console.error('Ошибка деактивации аккаунта:', error);
        res.status(500).json({
            error: 'internal_error',
            message: 'Внутренняя ошибка сервера'
        });
    }
};

module.exports = {
    getProfile,
    getBalance,
    updateProfile,
    getUserHistory,
    deactivateAccount
};
