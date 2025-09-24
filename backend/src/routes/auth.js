const express = require('express');
const router = express.Router();
const { generateToken } = require('../middleware/auth');
const User = require('../models/User');
const config = require('../config');

// Аутентификация админа (простая реализация для демо)
router.post('/admin/login', async (req, res) => {
    try {
        const { telegram_id, admin_password } = req.body;

        // В продакшене здесь должна быть более сложная логика
        // Например, проверка админов в отдельной таблице или через внешний сервис
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
        
        if (admin_password !== adminPassword) {
            return res.status(401).json({
                error: 'invalid_credentials',
                message: 'Неверные учётные данные'
            });
        }

        // Находим или создаём админа как обычного пользователя
        const user = await User.findOrCreate({
            telegram_id,
            username: 'admin',
            first_name: 'Admin',
            last_name: 'User'
        });

        // Генерируем JWT токен с флагом админа
        const token = generateToken(user.id, true);

        res.json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    telegram_id: user.telegram_id,
                    username: user.username,
                    is_admin: true
                }
            },
            message: 'Успешная авторизация администратора'
        });
    } catch (error) {
        console.error('Ошибка авторизации админа:', error);
        res.status(500).json({
            error: 'internal_error',
            message: 'Внутренняя ошибка сервера'
        });
    }
});

// Получение информации о текущем пользователе по токену
router.get('/me', require('../middleware/auth').authenticateJWT, async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                user: {
                    id: req.user.id,
                    telegram_id: req.user.telegram_id,
                    username: req.user.username,
                    first_name: req.user.first_name,
                    last_name: req.user.last_name,
                    is_admin: req.isAdmin
                }
            }
        });
    } catch (error) {
        console.error('Ошибка получения информации о пользователе:', error);
        res.status(500).json({
            error: 'internal_error',
            message: 'Внутренняя ошибка сервера'
        });
    }
});

// Обновление токена
router.post('/refresh', require('../middleware/auth').authenticateJWT, async (req, res) => {
    try {
        // Генерируем новый токен
        const token = generateToken(req.user.id, req.isAdmin);

        res.json({
            success: true,
            data: { token },
            message: 'Токен обновлён'
        });
    } catch (error) {
        console.error('Ошибка обновления токена:', error);
        res.status(500).json({
            error: 'internal_error',
            message: 'Внутренняя ошибка сервера'
        });
    }
});

// Выход (для админов - в WebApp выход происходит автоматически при закрытии)
router.post('/logout', (req, res) => {
    res.json({
        success: true,
        message: 'Выход выполнен'
    });
});

module.exports = router;
