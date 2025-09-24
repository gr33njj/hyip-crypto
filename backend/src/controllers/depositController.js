const Deposit = require('../models/Deposit');
const User = require('../models/User');
const config = require('../config');

// Получение депозитов пользователя
const getUserDeposits = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;

        const deposits = await Deposit.getByUserId(req.user.id, limit, offset);
        
        res.json({
            success: true,
            data: {
                deposits,
                pagination: {
                    page,
                    limit,
                    has_more: deposits.length === limit
                }
            }
        });
    } catch (error) {
        console.error('Ошибка получения депозитов:', error);
        res.status(500).json({
            error: 'internal_error',
            message: 'Внутренняя ошибка сервера'
        });
    }
};

// Подача депозита пользователем (ручной ввод tx_hash)
const submitDeposit = async (req, res) => {
    try {
        const { tx_hash } = req.body;

        // Проверяем, не существует ли уже депозит с таким hash
        const existingDeposit = await Deposit.findByTxHash(tx_hash);
        if (existingDeposit) {
            return res.status(400).json({
                error: 'duplicate_tx_hash',
                message: 'Транзакция с таким hash уже существует',
                data: {
                    existing_deposit: {
                        id: existingDeposit.id,
                        status: existingDeposit.status,
                        created_at: existingDeposit.created_at
                    }
                }
            });
        }

        // Создаём новый депозит
        const deposit = await Deposit.create({
            user_id: req.user.id,
            tx_hash,
            status: 'submitted',
            to_address: config.wallets.poolAddress
        });

        // Здесь можно добавить попытку автоматически найти транзакцию в сети
        // и заполнить данные (amount, from_address, block_number, etc.)
        // Пока оставляем как заглушку для будущей интеграции с TronWeb

        res.status(201).json({
            success: true,
            data: { deposit },
            message: 'Депозит отправлен на проверку'
        });
    } catch (error) {
        console.error('Ошибка создания депозита:', error);
        res.status(500).json({
            error: 'internal_error',
            message: 'Внутренняя ошибка сервера'
        });
    }
};

// Получение информации о депозите
const getDeposit = async (req, res) => {
    try {
        const { id } = req.params;
        const deposit = await Deposit.findById(id);

        if (!deposit) {
            return res.status(404).json({
                error: 'deposit_not_found',
                message: 'Депозит не найден'
            });
        }

        // Проверяем права доступа - пользователь может видеть только свои депозиты
        if (deposit.user_id !== req.user.id && !req.isAdmin) {
            return res.status(403).json({
                error: 'access_denied',
                message: 'Недостаточно прав доступа'
            });
        }

        res.json({
            success: true,
            data: { deposit }
        });
    } catch (error) {
        console.error('Ошибка получения депозита:', error);
        res.status(500).json({
            error: 'internal_error',
            message: 'Внутренняя ошибка сервера'
        });
    }
};

// Получение адреса пула для депозитов
const getPoolAddress = async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                pool_address: config.wallets.poolAddress,
                token_contract: config.usdt.contractAddress,
                network: config.tron.network,
                min_amount: config.security.minDepositAmount,
                confirmations_required: config.security.confirmationsThreshold,
                instructions: {
                    ru: [
                        'Отправьте USDT (TRC-20) на указанный адрес',
                        `Минимальная сумма депозита: ${config.security.minDepositAmount} USDT`,
                        `Требуется минимум ${config.security.confirmationsThreshold} подтверждений`,
                        'После перевода вставьте hash транзакции в форму ниже',
                        'Ваш депозит будет проверен администратором'
                    ],
                    en: [
                        'Send USDT (TRC-20) to the specified address',
                        `Minimum deposit amount: ${config.security.minDepositAmount} USDT`,
                        `Requires minimum ${config.security.confirmationsThreshold} confirmations`,
                        'After transfer, paste transaction hash in the form below',
                        'Your deposit will be verified by administrator'
                    ]
                }
            }
        });
    } catch (error) {
        console.error('Ошибка получения адреса пула:', error);
        res.status(500).json({
            error: 'internal_error',
            message: 'Внутренняя ошибка сервера'
        });
    }
};

// Webhook для обработки входящих транзакций от мониторинга
const webhookTransaction = async (req, res) => {
    try {
        const { tx_hash, from, to, amount, token, block, confirmations = 0 } = req.body;

        // Проверяем, что транзакция на наш пул-адрес
        if (to !== config.wallets.poolAddress) {
            return res.status(400).json({
                error: 'invalid_to_address',
                message: 'Транзакция не на наш адрес'
            });
        }

        // Проверяем токен (должен быть USDT)
        if (token && token !== 'USDT-TRC20') {
            return res.status(400).json({
                error: 'invalid_token',
                message: 'Неподдерживаемый токен'
            });
        }

        // Проверяем минимальную сумму
        if (parseFloat(amount) < config.security.minDepositAmount) {
            console.log(`Транзакция ${tx_hash} ниже минимальной суммы: ${amount}`);
            // Можно записать в отдельную таблицу для анализа
            return res.json({ success: true, message: 'Сумма ниже минимальной' });
        }

        // Проверяем, не существует ли уже такая транзакция
        const existingDeposit = await Deposit.findByTxHash(tx_hash);
        
        if (existingDeposit) {
            // Обновляем данные существующего депозита
            const updatedDeposit = await Deposit.update(existingDeposit.id, {
                amount: parseFloat(amount),
                from_address: from,
                block_number: parseInt(block),
                confirmations: parseInt(confirmations),
                status: confirmations >= config.security.confirmationsThreshold ? 'pending' : 'detected'
            });

            return res.json({
                success: true,
                message: 'Депозит обновлён',
                data: { deposit: updatedDeposit }
            });
        }

        // Создаём новый депозит от мониторинга
        const deposit = await Deposit.createFromMonitoring({
            tx_hash,
            amount: parseFloat(amount),
            token: 'USDT-TRC20',
            from_address: from,
            to_address: to,
            block_number: parseInt(block),
            confirmations: parseInt(confirmations)
        });

        // Если достаточно подтверждений, переводим в статус pending
        if (confirmations >= config.security.confirmationsThreshold) {
            await Deposit.update(deposit.id, { status: 'pending' });
        }

        res.json({
            success: true,
            message: 'Депозит создан',
            data: { deposit }
        });
    } catch (error) {
        console.error('Ошибка обработки webhook транзакции:', error);
        res.status(500).json({
            error: 'internal_error',
            message: 'Внутренняя ошибка сервера'
        });
    }
};

// Получение статистики депозитов (для админов)
const getDepositStats = async (req, res) => {
    try {
        const { date_from, date_to } = req.query;
        
        const stats = await Deposit.getStats(date_from, date_to);
        
        res.json({
            success: true,
            data: { stats }
        });
    } catch (error) {
        console.error('Ошибка получения статистики депозитов:', error);
        res.status(500).json({
            error: 'internal_error',
            message: 'Внутренняя ошибка сервера'
        });
    }
};

module.exports = {
    getUserDeposits,
    submitDeposit,
    getDeposit,
    getPoolAddress,
    webhookTransaction,
    getDepositStats
};
