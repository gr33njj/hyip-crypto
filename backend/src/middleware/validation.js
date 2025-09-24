const { body, param, query, validationResult } = require('express-validator');
const config = require('../config');

// Middleware для обработки ошибок валидации
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'validation_error',
            message: 'Ошибки валидации данных',
            details: errors.array()
        });
    }
    next();
};

// Валидация для создания заявки на вывод
const validateWithdrawal = [
    body('requested_amount')
        .isFloat({ min: 0.01 })
        .withMessage('Сумма должна быть больше 0.01')
        .custom((value) => {
            if (value > config.security.maxWithdrawalAmount) {
                throw new Error(`Максимальная сумма вывода: ${config.security.maxWithdrawalAmount} USDT`);
            }
            return true;
        }),
    body('to_address')
        .notEmpty()
        .withMessage('Адрес получателя обязателен')
        .isLength({ min: 34, max: 34 })
        .withMessage('Неверный формат TRON адреса')
        .matches(/^T[A-Za-z1-9]{33}$/)
        .withMessage('Адрес должен начинаться с T и содержать 34 символа'),
    body('withdrawal_type')
        .optional()
        .isIn(['partial', 'full'])
        .withMessage('Тип вывода должен быть partial или full'),
    handleValidationErrors
];

// Валидация для подачи депозита
const validateDeposit = [
    body('tx_hash')
        .notEmpty()
        .withMessage('Hash транзакции обязателен')
        .isLength({ min: 64, max: 64 })
        .withMessage('Hash транзакции должен содержать 64 символа')
        .matches(/^[a-fA-F0-9]{64}$/)
        .withMessage('Hash транзакции должен содержать только шестнадцатеричные символы'),
    handleValidationErrors
];

// Валидация для админских действий с депозитом
const validateDepositAdmin = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('ID депозита должен быть положительным числом'),
    body('amount')
        .optional()
        .isFloat({ min: 0.01 })
        .withMessage('Сумма должна быть больше 0.01'),
    body('admin_comment')
        .optional()
        .isString()
        .isLength({ max: 500 })
        .withMessage('Комментарий не должен превышать 500 символов'),
    handleValidationErrors
];

// Валидация для отклонения депозита/вывода
const validateReject = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('ID должен быть положительным числом'),
    body('reason')
        .notEmpty()
        .withMessage('Причина отклонения обязательна')
        .isLength({ min: 5, max: 500 })
        .withMessage('Причина должна содержать от 5 до 500 символов'),
    handleValidationErrors
];

// Валидация для создания начисления
const validateAccrual = [
    body('user_id')
        .isInt({ min: 1 })
        .withMessage('ID пользователя должен быть положительным числом'),
    body('amount')
        .isFloat({ min: -999999.99, max: 999999.99 })
        .withMessage('Сумма должна быть от -999999.99 до 999999.99'),
    body('reason')
        .notEmpty()
        .withMessage('Причина начисления обязательна')
        .isLength({ min: 5, max: 200 })
        .withMessage('Причина должна содержать от 5 до 200 символов'),
    body('accrual_type')
        .optional()
        .isIn(['manual', 'interest', 'bonus', 'correction'])
        .withMessage('Неверный тип начисления'),
    body('reference_deposit_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('ID депозита должен быть положительным числом'),
    handleValidationErrors
];

// Валидация для пометки вывода как выплаченного
const validateMarkPaid = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('ID вывода должен быть положительным числом'),
    body('tx_hash')
        .notEmpty()
        .withMessage('Hash транзакции обязателен')
        .isLength({ min: 64, max: 64 })
        .withMessage('Hash транзакции должен содержать 64 символа')
        .matches(/^[a-fA-F0-9]{64}$/)
        .withMessage('Hash транзакции должен содержать только шестнадцатеричные символы'),
    body('actual_amount')
        .optional()
        .isFloat({ min: 0.01 })
        .withMessage('Фактическая сумма должна быть больше 0.01'),
    handleValidationErrors
];

// Валидация для webhook транзакций
const validateWebhookTx = [
    body('tx_hash')
        .notEmpty()
        .withMessage('Hash транзакции обязателен')
        .isLength({ min: 64, max: 64 })
        .withMessage('Hash транзакции должен содержать 64 символа'),
    body('from')
        .notEmpty()
        .withMessage('Адрес отправителя обязателен')
        .matches(/^T[A-Za-z1-9]{33}$/)
        .withMessage('Неверный формат TRON адреса отправителя'),
    body('to')
        .notEmpty()
        .withMessage('Адрес получателя обязателен')
        .matches(/^T[A-Za-z1-9]{33}$/)
        .withMessage('Неверный формат TRON адреса получателя'),
    body('amount')
        .isFloat({ min: 0.000001 })
        .withMessage('Сумма должна быть больше 0'),
    body('token')
        .optional()
        .isString()
        .withMessage('Токен должен быть строкой'),
    body('block')
        .isInt({ min: 1 })
        .withMessage('Номер блока должен быть положительным числом'),
    body('confirmations')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Количество подтверждений должно быть неотрицательным числом'),
    handleValidationErrors
];

// Валидация для пагинации
const validatePagination = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Номер страницы должен быть положительным числом'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Лимит должен быть от 1 до 100'),
    query('search')
        .optional()
        .isString()
        .isLength({ max: 100 })
        .withMessage('Поисковый запрос не должен превышать 100 символов'),
    handleValidationErrors
];

// Валидация для фильтров списков
const validateListFilters = [
    query('status')
        .optional()
        .isString()
        .withMessage('Статус должен быть строкой'),
    query('date_from')
        .optional()
        .isISO8601()
        .withMessage('Неверный формат даты date_from'),
    query('date_to')
        .optional()
        .isISO8601()
        .withMessage('Неверный формат даты date_to'),
    query('user_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('ID пользователя должен быть положительным числом'),
    handleValidationErrors
];

// Валидация TRON адреса
const validateTronAddress = (address) => {
    return /^T[A-Za-z1-9]{33}$/.test(address);
};

// Валидация transaction hash
const validateTxHash = (hash) => {
    return /^[a-fA-F0-9]{64}$/.test(hash);
};

// Middleware для проверки лимитов
const checkAmountLimits = (minField = 'min_amount', maxField = 'max_amount') => {
    return (req, res, next) => {
        const amount = parseFloat(req.body.amount || req.body.requested_amount);
        
        if (minField && amount < config.security.minDepositAmount) {
            return res.status(400).json({
                error: 'amount_too_low',
                message: `Минимальная сумма: ${config.security.minDepositAmount} USDT`
            });
        }
        
        if (maxField && amount > config.security.maxWithdrawalAmount) {
            return res.status(400).json({
                error: 'amount_too_high',
                message: `Максимальная сумма: ${config.security.maxWithdrawalAmount} USDT`
            });
        }
        
        next();
    };
};

// Валидация для массовых начислений
const validateBulkAccruals = [
    body('accruals')
        .isArray({ min: 1, max: 100 })
        .withMessage('Должен быть массив от 1 до 100 начислений'),
    body('accruals.*.user_id')
        .isInt({ min: 1 })
        .withMessage('ID пользователя должен быть положительным числом'),
    body('accruals.*.amount')
        .isFloat({ min: -999999.99, max: 999999.99 })
        .withMessage('Сумма должна быть от -999999.99 до 999999.99'),
    body('accruals.*.reason')
        .notEmpty()
        .withMessage('Причина начисления обязательна')
        .isLength({ min: 5, max: 200 })
        .withMessage('Причина должна содержать от 5 до 200 символов'),
    handleValidationErrors
];

module.exports = {
    handleValidationErrors,
    validateWithdrawal,
    validateDeposit,
    validateDepositAdmin,
    validateReject,
    validateAccrual,
    validateMarkPaid,
    validateWebhookTx,
    validatePagination,
    validateListFilters,
    validateBulkAccruals,
    validateTronAddress,
    validateTxHash,
    checkAmountLimits
};
