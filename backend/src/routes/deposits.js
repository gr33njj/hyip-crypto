const express = require('express');
const router = express.Router();
const depositController = require('../controllers/depositController');
const { authenticateTelegramWebApp, requireActiveUser } = require('../middleware/auth');
const { validateDeposit, validatePagination, validateWebhookTx } = require('../middleware/validation');

// Публичные роуты

// Получение адреса пула для депозитов
router.get('/pool-address', depositController.getPoolAddress);

// Webhook для обработки транзакций от мониторинга
router.post('/webhook/tx', validateWebhookTx, depositController.webhookTransaction);

// Защищённые роуты для пользователей
router.use(authenticateTelegramWebApp);
router.use(requireActiveUser);

// Получение депозитов пользователя
router.get('/', validatePagination, depositController.getUserDeposits);

// Подача депозита (ручной ввод tx_hash)
router.post('/submit', validateDeposit, depositController.submitDeposit);

// Получение информации о конкретном депозите
router.get('/:id', depositController.getDeposit);

module.exports = router;
