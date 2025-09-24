require('dotenv').config();

const config = {
    // Конфигурация сервера
    server: {
        port: parseInt(process.env.PORT) || 3000,
        env: process.env.NODE_ENV || 'development',
        apiPrefix: process.env.API_PREFIX || '/api/v1'
    },

    // Конфигурация базы данных
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        name: process.env.DB_NAME || 'usdt_deposits',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        url: process.env.DATABASE_URL
    },

    // Конфигурация JWT
    jwt: {
        secret: process.env.JWT_SECRET || 'your-secret-key',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    },

    // Конфигурация Telegram
    telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN,
        webhookUrl: process.env.TELEGRAM_WEBHOOK_URL,
        secretToken: process.env.TELEGRAM_SECRET_TOKEN
    },

    // Конфигурация Tron сети
    tron: {
        network: process.env.TRON_NETWORK || 'shasta',
        apiKey: process.env.TRON_API_KEY,
        fullNode: process.env.TRON_FULL_NODE || 'https://api.shasta.trongrid.io',
        solidityNode: process.env.TRON_SOLIDITY_NODE || 'https://api.shasta.trongrid.io',
        eventServer: process.env.TRON_EVENT_SERVER || 'https://api.shasta.trongrid.io'
    },

    // Конфигурация USDT контракта
    usdt: {
        contractAddress: process.env.USDT_CONTRACT_ADDRESS || 'TG3XXyExBkPp9nzdajDZsozEu4BkaSJozs', // Shasta testnet
        decimals: 6
    },

    // Конфигурация кошельков
    wallets: {
        poolAddress: process.env.POOL_WALLET_ADDRESS,
        hotWalletAddress: process.env.HOT_WALLET_ADDRESS
    },

    // Настройки безопасности
    security: {
        confirmationsThreshold: parseInt(process.env.CONFIRMATIONS_THRESHOLD) || 20,
        minDepositAmount: parseFloat(process.env.MIN_DEPOSIT_AMOUNT) || 10,
        maxWithdrawalAmount: parseFloat(process.env.MAX_WITHDRAWAL_AMOUNT) || 10000,
        rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 минут
        rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
    },

    // Конфигурация Vault (для продакшена)
    vault: {
        url: process.env.VAULT_URL,
        token: process.env.VAULT_TOKEN,
        secretPath: process.env.VAULT_SECRET_PATH
    },

    // Конфигурация мониторинга
    monitoring: {
        prometheusPort: parseInt(process.env.PROMETHEUS_PORT) || 9090,
        logLevel: process.env.LOG_LEVEL || 'info'
    },

    // Конфигурация CORS
    cors: {
        origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
        adminPanelUrl: process.env.ADMIN_PANEL_URL || 'http://localhost:3001'
    },

    // Telegram Bot settings
    telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN,
        webhookUrl: process.env.TELEGRAM_WEBHOOK_URL,
        secretToken: process.env.TELEGRAM_SECRET_TOKEN,
        adminIds: process.env.ADMIN_TELEGRAM_IDS?.split(',') || []
    },

    // URLs
    urls: {
        webapp: process.env.WEBAPP_URL || 'https://your-domain.com',
        admin: process.env.ADMIN_URL || 'https://admin.your-domain.com'
    },

    // Конфигурация email (опционально)
    email: {
        smtp: {
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT) || 587,
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        },
        fromEmail: process.env.FROM_EMAIL
    }
};

// Валидация обязательных настроек
const validateConfig = () => {
    const required = [
        'telegram.botToken',
        'wallets.poolAddress'
    ];

    const missing = required.filter(path => {
        const value = path.split('.').reduce((obj, key) => obj?.[key], config);
        return !value;
    });

    if (missing.length > 0) {
        console.error('❌ Отсутствуют обязательные переменные окружения:', missing);
        if (config.server.env === 'production') {
            process.exit(1);
        }
    }
};

// Экспорт конфигурации
module.exports = config;

// Валидируем конфигурацию при загрузке
if (require.main !== module) {
    validateConfig();
}
