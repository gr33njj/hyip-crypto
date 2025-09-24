const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');

// Middleware для аутентификации через Telegram WebApp
const authenticateTelegramWebApp = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('twa-init-data ')) {
            return res.status(401).json({ 
                error: 'missing_auth_header',
                message: 'Отсутствует заголовок аутентификации Telegram WebApp' 
            });
        }

        const initData = authHeader.substring('twa-init-data '.length);
        
        // Проверяем подпись Telegram WebApp
        const isValid = validateTelegramWebAppData(initData, config.telegram.botToken);
        if (!isValid) {
            return res.status(401).json({ 
                error: 'invalid_signature',
                message: 'Неверная подпись Telegram WebApp' 
            });
        }

        // Парсим данные пользователя
        const urlParams = new URLSearchParams(initData);
        const userString = urlParams.get('user');
        
        if (!userString) {
            return res.status(401).json({ 
                error: 'missing_user_data',
                message: 'Отсутствуют данные пользователя' 
            });
        }

        const userData = JSON.parse(userString);
        
        // Находим или создаём пользователя
        const user = await User.findOrCreate({
            telegram_id: userData.id,
            username: userData.username,
            first_name: userData.first_name,
            last_name: userData.last_name,
            language_code: userData.language_code
        });

        req.user = user;
        next();
    } catch (error) {
        console.error('Ошибка аутентификации Telegram WebApp:', error);
        res.status(401).json({ 
            error: 'auth_error',
            message: 'Ошибка аутентификации' 
        });
    }
};

// Функция для проверки подписи Telegram WebApp
function validateTelegramWebAppData(initData, botToken) {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');

    // Сортируем параметры и создаём строку для проверки
    const sortedParams = Array.from(urlParams.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

    // Создаём секретный ключ
    const secretKey = crypto.createHash('sha256').update(botToken).digest();
    
    // Создаём подпись
    const calculatedHash = crypto
        .createHmac('sha256', secretKey)
        .update(sortedParams)
        .digest('hex');

    return calculatedHash === hash;
}

// Middleware для проверки JWT токена (для админов)
const authenticateJWT = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                error: 'missing_token',
                message: 'Отсутствует токен авторизации' 
            });
        }

        const token = authHeader.substring('Bearer '.length);
        const decoded = jwt.verify(token, config.jwt.secret);
        
        // Для простоты, храним админов как обычных пользователей с флагом
        // В продакшене можно использовать отдельную таблицу admins
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({ 
                error: 'user_not_found',
                message: 'Пользователь не найден' 
            });
        }

        req.user = user;
        req.isAdmin = decoded.isAdmin || false;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                error: 'invalid_token',
                message: 'Неверный токен' 
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                error: 'token_expired',
                message: 'Токен истёк' 
            });
        }
        
        console.error('Ошибка аутентификации JWT:', error);
        res.status(500).json({ 
            error: 'auth_error',
            message: 'Ошибка аутентификации' 
        });
    }
};

// Middleware для проверки прав администратора
const requireAdmin = (req, res, next) => {
    if (!req.isAdmin) {
        return res.status(403).json({ 
            error: 'access_denied',
            message: 'Недостаточно прав доступа' 
        });
    }
    next();
};

// Генерация JWT токена
const generateToken = (userId, isAdmin = false) => {
    return jwt.sign(
        { userId, isAdmin },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
    );
};

// Middleware для проверки активности пользователя
const requireActiveUser = (req, res, next) => {
    if (!req.user.is_active) {
        return res.status(403).json({ 
            error: 'user_inactive',
            message: 'Аккаунт заблокирован' 
        });
    }
    next();
};

module.exports = {
    authenticateTelegramWebApp,
    authenticateJWT,
    requireAdmin,
    requireActiveUser,
    generateToken,
    validateTelegramWebAppData
};
