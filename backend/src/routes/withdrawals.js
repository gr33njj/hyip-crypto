const express = require('express');
const router = express.Router();
const withdrawalController = require('../controllers/withdrawalController');
const { authenticateTelegramWebApp, requireActiveUser } = require('../middleware/auth');
const { validateWithdrawal, validatePagination, checkAmountLimits } = require('../middleware/validation');

// Все роуты защищены аутентификацией
router.use(authenticateTelegramWebApp);
router.use(requireActiveUser);

// Получение информации о лимитах и условиях вывода
router.get('/info', withdrawalController.getWithdrawalInfo);

// Получение заявок на вывод пользователя
router.get('/', validatePagination, withdrawalController.getUserWithdrawals);

// Создание заявки на вывод
router.post('/', validateWithdrawal, checkAmountLimits(), withdrawalController.createWithdrawal);

// Получение информации о конкретной заявке
router.get('/:id', withdrawalController.getWithdrawal);

// Отмена заявки пользователем
router.delete('/:id', withdrawalController.cancelWithdrawal);

module.exports = router;
