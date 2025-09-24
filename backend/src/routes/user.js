const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateTelegramWebApp, requireActiveUser } = require('../middleware/auth');
const { validatePagination } = require('../middleware/validation');

// Все роуты защищены аутентификацией Telegram WebApp
router.use(authenticateTelegramWebApp);
router.use(requireActiveUser);

// Получение профиля пользователя
router.get('/profile', userController.getProfile);

// Получение баланса
router.get('/balance', userController.getBalance);

// Обновление профиля
router.put('/profile', userController.updateProfile);

// Получение истории операций
router.get('/history', validatePagination, userController.getUserHistory);

// Деактивация аккаунта
router.delete('/account', userController.deactivateAccount);

module.exports = router;
