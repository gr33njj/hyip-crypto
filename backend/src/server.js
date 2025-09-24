const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('express-async-errors');

const config = require('./config');
const { testConnection } = require('./config/database');

const app = express();

// Настройка CORS
app.use(cors({
    origin: config.cors.origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Безопасность
app.use(helmet({
    contentSecurityPolicy: false, // Отключаем для Telegram WebApp
    crossOriginEmbedderPolicy: false
}));

// Парсинг JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Логирование
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
    windowMs: config.security.rateLimitWindowMs,
    max: config.security.rateLimitMaxRequests,
    message: {
        error: 'rate_limit_exceeded',
        message: 'Превышено количество запросов. Попробуйте позже.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: config.server.env
    });
});

// API роуты
const apiPrefix = config.server.apiPrefix;

app.use(`${apiPrefix}/auth`, require('./routes/auth'));
app.use(`${apiPrefix}/user`, require('./routes/user'));
app.use(`${apiPrefix}/deposits`, require('./routes/deposits'));
app.use(`${apiPrefix}/withdrawals`, require('./routes/withdrawals'));
app.use(`${apiPrefix}/admin`, require('./routes/admin'));
app.use(`${apiPrefix}/webhook`, require('./routes/webhook'));

// Swagger документация (в development режиме)
if (config.server.env === 'development') {
    const swaggerUi = require('swagger-ui-express');
    const swaggerJsdoc = require('swagger-jsdoc');

    const swaggerOptions = {
        definition: {
            openapi: '3.0.0',
            info: {
                title: 'USDT Deposits API',
                version: '1.0.0',
                description: 'API для управления депозитами USDT через Telegram WebApp'
            },
            servers: [
                {
                    url: `http://localhost:${config.server.port}${apiPrefix}`,
                    description: 'Development server'
                }
            ],
            components: {
                securitySchemes: {
                    TelegramWebApp: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'twa-init-data'
                    },
                    JWT: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT'
                    }
                }
            }
        },
        apis: ['./src/routes/*.js']
    };

    const swaggerSpec = swaggerJsdoc(swaggerOptions);
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'not_found',
        message: 'Endpoint не найден',
        path: req.path
    });
});

// Глобальный обработчик ошибок
app.use((error, req, res, next) => {
    console.error('Ошибка API:', error);

    // Ошибки валидации
    if (error.name === 'ValidationError') {
        return res.status(400).json({
            error: 'validation_error',
            message: 'Ошибка валидации данных',
            details: error.details
        });
    }

    // Ошибки базы данных
    if (error.code === '23505') { // Duplicate key
        return res.status(409).json({
            error: 'duplicate_error',
            message: 'Запись уже существует'
        });
    }

    if (error.code === '23503') { // Foreign key violation
        return res.status(400).json({
            error: 'reference_error',
            message: 'Ссылка на несуществующую запись'
        });
    }

    // Общие ошибки
    res.status(500).json({
        error: 'internal_error',
        message: 'Внутренняя ошибка сервера',
        requestId: req.headers['x-request-id'] || 'unknown'
    });
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} получен. Graceful shutdown...`);
    
    try {
        // Закрываем соединения с базой данных
        const { close } = require('./config/database');
        await close();
        
        console.log('✅ Все соединения закрыты');
        process.exit(0);
    } catch (error) {
        console.error('❌ Ошибка при graceful shutdown:', error);
        process.exit(1);
    }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Запуск сервера
const startServer = async () => {
    try {
        // Проверяем подключение к базе данных
        const dbConnected = await testConnection();
        if (!dbConnected) {
            console.error('❌ Не удалось подключиться к базе данных');
            process.exit(1);
        }

        // Инициализируем дополнительные сервисы
        const telegramBotService = require('./services/telegramBot');
        const tronService = require('./services/tronService');

        // Запускаем сервер
        const server = app.listen(config.server.port, async () => {
            console.log(`🚀 Сервер запущен на порту ${config.server.port}`);
            console.log(`📍 API доступно по адресу: http://localhost:${config.server.port}${apiPrefix}`);
            
            if (config.server.env === 'development') {
                console.log(`📚 Документация API: http://localhost:${config.server.port}/api/docs`);
            }
            
            console.log(`🔧 Окружение: ${config.server.env}`);
            console.log(`🌐 CORS origins: ${config.cors.origins.join(', ')}`);

            // Настраиваем Telegram webhook (только в продакшене)
            if (config.server.env === 'production') {
                try {
                    await telegramBotService.setWebhook();
                    const botInfo = await telegramBotService.getBotInfo();
                    if (botInfo) {
                        console.log(`🤖 Telegram бот: @${botInfo.username}`);
                    }
                } catch (error) {
                    console.error('⚠️ Ошибка настройки Telegram webhook:', error);
                }
            }

            // Запускаем мониторинг TRON блокчейна
            if (tronService.isConnected) {
                try {
                    await tronService.startBlockMonitoring();
                    console.log('🔍 Мониторинг TRON блокчейна запущен');
                } catch (error) {
                    console.error('⚠️ Ошибка запуска мониторинга TRON:', error);
                }
            }
        });

        // Настройки сервера
        server.timeout = 30000; // 30 секунд timeout
        server.keepAliveTimeout = 5000;
        server.headersTimeout = 6000;

        return server;
    } catch (error) {
        console.error('❌ Ошибка запуска сервера:', error);
        process.exit(1);
    }
};

// Запускаем сервер только если файл вызван напрямую
if (require.main === module) {
    startServer();
}

module.exports = app;
