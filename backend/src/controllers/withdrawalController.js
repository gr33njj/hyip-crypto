const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');
const config = require('../config');

// Получение заявок на вывод пользователя
const getUserWithdrawals = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;

        const withdrawals = await Withdrawal.getByUserId(req.user.id, limit, offset);
        
        res.json({
            success: true,
            data: {
                withdrawals,
                pagination: {
                    page,
                    limit,
                    has_more: withdrawals.length === limit
                }
            }
        });
    } catch (error) {
        console.error('Ошибка получения заявок на вывод:', error);
        res.status(500).json({
            error: 'internal_error',
            message: 'Внутренняя ошибка сервера'
        });
    }
};

// Создание заявки на вывод
const createWithdrawal = async (req, res) => {
    try {
        const { requested_amount, to_address, withdrawal_type = 'partial' } = req.body;

        // Проверяем возможность создания заявки
        const canCreate = await Withdrawal.canCreateWithdrawal(req.user.id, requested_amount);
        
        if (!canCreate.canCreate) {
            let message;
            switch (canCreate.reason) {
                case 'insufficient_balance':
                    message = `Недостаточно средств. Доступно: ${canCreate.currentBalance} USDT`;
                    break;
                case 'pending_withdrawal_exists':
                    message = 'У вас уже есть заявка на вывод в обработке';
                    break;
                default:
                    message = 'Невозможно создать заявку на вывод';
            }
            
            return res.status(400).json({
                error: canCreate.reason,
                message,
                data: {
                    current_balance: canCreate.currentBalance
                }
            });
        }

        // Проверяем дневной лимит (если настроен)
        const dailyWithdrawn = await Withdrawal.getDailyWithdrawnAmount(req.user.id);
        const dailyLimit = parseFloat(process.env.DAILY_WITHDRAWAL_LIMIT) || 50000;
        
        if (dailyWithdrawn + requested_amount > dailyLimit) {
            return res.status(400).json({
                error: 'daily_limit_exceeded',
                message: `Превышен дневной лимит вывода. Доступно: ${dailyLimit - dailyWithdrawn} USDT`,
                data: {
                    daily_limit: dailyLimit,
                    daily_withdrawn: dailyWithdrawn,
                    available_today: dailyLimit - dailyWithdrawn
                }
            });
        }

        // Создаём заявку на вывод
        const withdrawal = await Withdrawal.create({
            user_id: req.user.id,
            requested_amount,
            to_address,
            withdrawal_type
        });

        res.status(201).json({
            success: true,
            data: { withdrawal },
            message: 'Заявка на вывод создана и отправлена на рассмотрение'
        });
    } catch (error) {
        console.error('Ошибка создания заявки на вывод:', error);
        res.status(500).json({
            error: 'internal_error',
            message: 'Внутренняя ошибка сервера'
        });
    }
};

// Получение информации о заявке
const getWithdrawal = async (req, res) => {
    try {
        const { id } = req.params;
        const withdrawal = await Withdrawal.findById(id);

        if (!withdrawal) {
            return res.status(404).json({
                error: 'withdrawal_not_found',
                message: 'Заявка на вывод не найдена'
            });
        }

        // Проверяем права доступа
        if (withdrawal.user_id !== req.user.id && !req.isAdmin) {
            return res.status(403).json({
                error: 'access_denied',
                message: 'Недостаточно прав доступа'
            });
        }

        res.json({
            success: true,
            data: { withdrawal }
        });
    } catch (error) {
        console.error('Ошибка получения заявки на вывод:', error);
        res.status(500).json({
            error: 'internal_error',
            message: 'Внутренняя ошибка сервера'
        });
    }
};

// Отмена заявки пользователем (только pending)
const cancelWithdrawal = async (req, res) => {
    try {
        const { id } = req.params;
        const withdrawal = await Withdrawal.findById(id);

        if (!withdrawal) {
            return res.status(404).json({
                error: 'withdrawal_not_found',
                message: 'Заявка на вывод не найдена'
            });
        }

        // Проверяем права доступа
        if (withdrawal.user_id !== req.user.id) {
            return res.status(403).json({
                error: 'access_denied',
                message: 'Недостаточно прав доступа'
            });
        }

        // Можно отменить только pending заявки
        if (withdrawal.status !== 'pending') {
            return res.status(400).json({
                error: 'cannot_cancel',
                message: 'Можно отменить только заявки в статусе "ожидает обработки"'
            });
        }

        const cancelledWithdrawal = await Withdrawal.cancel(id, null, 'Отменено пользователем');

        res.json({
            success: true,
            data: { withdrawal: cancelledWithdrawal },
            message: 'Заявка на вывод отменена'
        });
    } catch (error) {
        console.error('Ошибка отмены заявки на вывод:', error);
        res.status(500).json({
            error: 'internal_error',
            message: 'Внутренняя ошибка сервера'
        });
    }
};

// Получение лимитов и информации для вывода
const getWithdrawalInfo = async (req, res) => {
    try {
        // Получаем баланс пользователя
        const balance = await User.getBalance(req.user.id);
        
        // Получаем дневной лимит
        const dailyWithdrawn = await Withdrawal.getDailyWithdrawnAmount(req.user.id);
        const dailyLimit = parseFloat(process.env.DAILY_WITHDRAWAL_LIMIT) || 50000;
        
        // Проверяем наличие pending заявок
        const pendingWithdrawals = await Withdrawal.getByUserId(req.user.id, 5, 0);
        const hasPendingWithdrawal = pendingWithdrawals.some(w => ['pending', 'approved'].includes(w.status));

        res.json({
            success: true,
            data: {
                current_balance: balance.total_balance,
                available_balance: balance.total_balance,
                min_withdrawal_amount: 1, // Минимальная сумма вывода
                max_withdrawal_amount: config.security.maxWithdrawalAmount,
                daily_limit: dailyLimit,
                daily_withdrawn: dailyWithdrawn,
                available_today: Math.max(0, dailyLimit - dailyWithdrawn),
                has_pending_withdrawal: hasPendingWithdrawal,
                withdrawal_fee_percent: parseFloat(process.env.WITHDRAWAL_FEE_PERCENT) || 0,
                estimated_processing_time: {
                    approval: '1-24 часа',
                    payment: '1-24 часа после одобрения'
                },
                supported_addresses: ['TRC-20 TRON addresses'],
                instructions: {
                    ru: [
                        'Проверьте адрес получателя - транзакции необратимы',
                        'Укажите корректный TRC-20 адрес',
                        'Минимальная сумма вывода: 1 USDT',
                        'Заявки обрабатываются в течение 24 часов',
                        'Комиссия сети оплачивается отдельно'
                    ],
                    en: [
                        'Double-check recipient address - transactions are irreversible',
                        'Enter a valid TRC-20 address',
                        'Minimum withdrawal amount: 1 USDT',
                        'Requests are processed within 24 hours',
                        'Network fees are paid separately'
                    ]
                }
            }
        });
    } catch (error) {
        console.error('Ошибка получения информации о выводе:', error);
        res.status(500).json({
            error: 'internal_error',
            message: 'Внутренняя ошибка сервера'
        });
    }
};

// Получение статистики выводов (для админов)
const getWithdrawalStats = async (req, res) => {
    try {
        const { date_from, date_to } = req.query;
        
        const stats = await Withdrawal.getStats(date_from, date_to);
        
        // Получаем общую сумму pending выводов
        const pendingAmount = await Withdrawal.getPendingAmount();
        
        res.json({
            success: true,
            data: { 
                stats: {
                    ...stats,
                    pending_total_amount: pendingAmount
                }
            }
        });
    } catch (error) {
        console.error('Ошибка получения статистики выводов:', error);
        res.status(500).json({
            error: 'internal_error',
            message: 'Внутренняя ошибка сервера'
        });
    }
};

module.exports = {
    getUserWithdrawals,
    createWithdrawal,
    getWithdrawal,
    cancelWithdrawal,
    getWithdrawalInfo,
    getWithdrawalStats
};
