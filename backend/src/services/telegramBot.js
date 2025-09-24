const TelegramBot = require('node-telegram-bot-api');
const config = require('../config');
const User = require('../models/User');

class TelegramBotService {
    constructor() {
        this.bot = null;
        this.isRunning = false;
        this.init();
    }

    // Инициализация бота
    init() {
        if (!config.telegram.botToken) {
            console.error('❌ TELEGRAM_BOT_TOKEN не настроен');
            return;
        }

        try {
            this.bot = new TelegramBot(config.telegram.botToken, { 
                polling: false // Используем webhook вместо polling
            });

            console.log('✅ Telegram бот инициализирован');
            this.setupCommands();
        } catch (error) {
            console.error('❌ Ошибка инициализации Telegram бота:', error);
        }
    }

    // Настройка команд бота
    setupCommands() {
        if (!this.bot) return;

        // Команда /start
        this.bot.onText(/\/start/, async (msg) => {
            const chatId = msg.chat.id;
            const user = msg.from;

            try {
                // Создаём или обновляем пользователя в базе данных
                await User.findOrCreate({
                    telegram_id: user.id,
                    username: user.username,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    language_code: user.language_code
                });

                const welcomeMessage = `
🎉 *Добро пожаловать в USDT Кошелёк!*

Я помогу вам управлять депозитами USDT (TRC-20).

*Доступные команды:*
💰 /balance - Проверить баланс
📥 /deposit - Пополнить счёт  
📤 /withdraw - Вывести средства
📊 /history - История операций
🆘 /support - Связаться с поддержкой

*Для удобства используйте кнопку меню ниже* ⬇️
                `;

                const options = {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: '💰 Открыть кошелёк',
                                    web_app: {
                                        url: config.cors.origins[0] || 'https://your-domain.com'
                                    }
                                }
                            ],
                            [
                                { text: '📊 Баланс', callback_data: 'balance' },
                                { text: '🆘 Поддержка', callback_data: 'support' }
                            ]
                        ]
                    }
                };

                await this.bot.sendMessage(chatId, welcomeMessage, options);
            } catch (error) {
                console.error('Ошибка обработки команды /start:', error);
                await this.sendErrorMessage(chatId);
            }
        });

        // Команда /balance
        this.bot.onText(/\/balance/, async (msg) => {
            const chatId = msg.chat.id;
            const userId = msg.from.id;

            try {
                const user = await User.findByTelegramId(userId);
                if (!user) {
                    await this.bot.sendMessage(chatId, '❌ Пользователь не найден. Нажмите /start');
                    return;
                }

                const balance = await User.getBalance(user.id);
                
                const balanceMessage = `
💰 *Ваш баланс:*

💵 *Общий баланс:* ${parseFloat(balance.total_balance).toFixed(6)} USDT

📈 *Детализация:*
• Депозиты: +${parseFloat(balance.on_chain_balance).toFixed(6)} USDT
• Начисления: ${parseFloat(balance.accrued_balance) >= 0 ? '+' : ''}${parseFloat(balance.accrued_balance).toFixed(6)} USDT
• Выведено: -${parseFloat(balance.withdrawn_balance).toFixed(6)} USDT

_Обновлено: ${new Date().toLocaleString('ru-RU')}_
                `;

                const options = {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '📥 Пополнить', callback_data: 'deposit' },
                                { text: '📤 Вывести', callback_data: 'withdraw' }
                            ],
                            [
                                { text: '💰 Открыть кошелёк', web_app: { url: config.cors.origins[0] } }
                            ]
                        ]
                    }
                };

                await this.bot.sendMessage(chatId, balanceMessage, options);
            } catch (error) {
                console.error('Ошибка обработки команды /balance:', error);
                await this.sendErrorMessage(chatId);
            }
        });

        // Команда /deposit
        this.bot.onText(/\/deposit/, async (msg) => {
            const chatId = msg.chat.id;

            const depositMessage = `
📥 *Пополнение счёта*

*Адрес для перевода USDT (TRC-20):*
\`${config.wallets.poolAddress}\`

*Инструкция:*
1️⃣ Отправьте USDT по сети TRC-20 на адрес выше
2️⃣ Минимальная сумма: ${config.security.minDepositAmount} USDT
3️⃣ После перевода откройте кошелёк и вставьте hash транзакции
4️⃣ Дождитесь подтверждения администратора

⚠️ *Важно:* Отправляйте только USDT по сети TRC-20!
            `;

            const options = {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '💰 Открыть кошелёк', web_app: { url: config.cors.origins[0] } }
                        ],
                        [
                            { text: '📋 Копировать адрес', callback_data: `copy_address_${config.wallets.poolAddress}` }
                        ]
                    ]
                }
            };

            await this.bot.sendMessage(chatId, depositMessage, options);
        });

        // Команда /support
        this.bot.onText(/\/support/, async (msg) => {
            const chatId = msg.chat.id;

            const supportMessage = `
🆘 *Поддержка*

Если у вас возникли вопросы или проблемы:

📧 Email: support@yourdomain.com
💬 Telegram: @your_support_bot
📞 Время работы: 24/7

*Часто задаваемые вопросы:*

❓ *Сколько времени зачисляется депозит?*
➡️ Обычно 5-30 минут после ${config.security.confirmationsThreshold} подтверждений

❓ *Минимальная сумма депозита?*
➡️ ${config.security.minDepositAmount} USDT

❓ *Как долго обрабатываются выводы?*
➡️ До 24 часов в рабочие дни

❓ *Какие сети поддерживаются?*
➡️ Только TRON (TRC-20) для USDT
            `;

            await this.bot.sendMessage(chatId, supportMessage, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '💰 Открыть кошелёк', web_app: { url: config.cors.origins[0] } }
                        ]
                    ]
                }
            });
        });

        // Обработка callback запросов
        this.bot.on('callback_query', async (callbackQuery) => {
            const msg = callbackQuery.message;
            const chatId = msg.chat.id;
            const data = callbackQuery.data;

            try {
                await this.bot.answerCallbackQuery(callbackQuery.id);

                if (data === 'balance') {
                    // Перенаправляем на команду balance
                    this.bot.emit('message', { ...msg, text: '/balance', from: callbackQuery.from });
                } else if (data === 'deposit') {
                    this.bot.emit('message', { ...msg, text: '/deposit', from: callbackQuery.from });
                } else if (data === 'withdraw') {
                    await this.bot.sendMessage(chatId, '📤 Для создания заявки на вывод откройте кошелёк:', {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '💰 Открыть кошелёк', web_app: { url: config.cors.origins[0] } }]
                            ]
                        }
                    });
                } else if (data === 'support') {
                    this.bot.emit('message', { ...msg, text: '/support', from: callbackQuery.from });
                } else if (data.startsWith('copy_address_')) {
                    const address = data.replace('copy_address_', '');
                    await this.bot.sendMessage(chatId, `📋 Скопируйте адрес:\n\`${address}\``, {
                        parse_mode: 'Markdown'
                    });
                }
            } catch (error) {
                console.error('Ошибка обработки callback:', error);
            }
        });
    }

    // Отправка сообщения об ошибке
    async sendErrorMessage(chatId) {
        try {
            await this.bot.sendMessage(chatId, '❌ Произошла ошибка. Попробуйте позже или обратитесь в поддержку.');
        } catch (error) {
            console.error('Ошибка отправки сообщения об ошибке:', error);
        }
    }

    // Уведомление о новом депозите
    async notifyDepositReceived(userId, amount, txHash, status) {
        try {
            const user = await User.findById(userId);
            if (!user) return;

            let message = '';
            let emoji = '';

            switch (status) {
                case 'detected':
                    emoji = '🔍';
                    message = `${emoji} *Депозит обнаружен*\n\nСумма: ${amount} USDT\nСтатус: Ожидание подтверждений\nТранзакция: \`${txHash}\`\n\n_Ожидайте подтверждения администратора_`;
                    break;
                case 'pending':
                    emoji = '⏳';
                    message = `${emoji} *Депозит готов к проверке*\n\nСумма: ${amount} USDT\nСтатус: На проверке у администратора\nТранзакция: \`${txHash}\`\n\n_Обычно проверка занимает до 30 минут_`;
                    break;
                case 'approved':
                    emoji = '✅';
                    message = `${emoji} *Депозит зачислен!*\n\nСумма: ${amount} USDT\nСтатус: Успешно зачислен\nТранзакция: \`${txHash}\`\n\n🎉 Средства добавлены на ваш баланс!`;
                    break;
                case 'rejected':
                    emoji = '❌';
                    message = `${emoji} *Депозит отклонён*\n\nСумма: ${amount} USDT\nТранзакция: \`${txHash}\`\n\n📞 Обратитесь в поддержку для уточнения причины`;
                    break;
            }

            const options = {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '💰 Открыть кошелёк', web_app: { url: config.cors.origins[0] } }
                        ],
                        [
                            { text: '📊 Баланс', callback_data: 'balance' },
                            { text: '🆘 Поддержка', callback_data: 'support' }
                        ]
                    ]
                }
            };

            await this.bot.sendMessage(user.telegram_id, message, options);
        } catch (error) {
            console.error('Ошибка отправки уведомления о депозите:', error);
        }
    }

    // Уведомление о выводе
    async notifyWithdrawal(userId, amount, status, txHash = null, comment = null) {
        try {
            const user = await User.findById(userId);
            if (!user) return;

            let message = '';
            let emoji = '';

            switch (status) {
                case 'approved':
                    emoji = '✅';
                    message = `${emoji} *Заявка на вывод одобрена*\n\nСумма: ${amount} USDT\nСтатус: Одобрено к выплате\n\n💳 Средства будут переведены в течение 24 часов`;
                    break;
                case 'paid':
                    emoji = '🎉';
                    message = `${emoji} *Вывод выполнен!*\n\nСумма: ${amount} USDT\nСтатус: Успешно выплачено\nТранзакция: \`${txHash}\`\n\n💰 Средства отправлены на ваш адрес`;
                    break;
                case 'rejected':
                    emoji = '❌';
                    message = `${emoji} *Заявка отклонена*\n\nСумма: ${amount} USDT\nПричина: ${comment || 'Не указана'}\n\n📞 Обратитесь в поддержку для уточнения`;
                    break;
            }

            const options = {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '💰 Открыть кошелёк', web_app: { url: config.cors.origins[0] } }
                        ],
                        [
                            { text: '📊 Баланс', callback_data: 'balance' }
                        ]
                    ]
                }
            };

            await this.bot.sendMessage(user.telegram_id, message, options);
        } catch (error) {
            console.error('Ошибка отправки уведомления о выводе:', error);
        }
    }

    // Уведомление администраторов
    async notifyAdmins(message) {
        try {
            // Здесь должен быть список telegram_id администраторов
            const adminIds = process.env.ADMIN_TELEGRAM_IDS?.split(',') || [];
            
            for (const adminId of adminIds) {
                try {
                    await this.bot.sendMessage(parseInt(adminId), `🔔 *Уведомление администратора*\n\n${message}`, {
                        parse_mode: 'Markdown'
                    });
                } catch (error) {
                    console.error(`Ошибка отправки уведомления админу ${adminId}:`, error);
                }
            }
        } catch (error) {
            console.error('Ошибка отправки уведомлений админам:', error);
        }
    }

    // Обработка webhook
    async handleWebhook(req, res) {
        try {
            const update = req.body;
            
            if (update.message) {
                this.bot.processUpdate(update);
            }
            
            res.sendStatus(200);
        } catch (error) {
            console.error('Ошибка обработки webhook:', error);
            res.sendStatus(500);
        }
    }

    // Установка webhook
    async setWebhook() {
        try {
            if (!config.telegram.webhookUrl) {
                console.warn('⚠️ TELEGRAM_WEBHOOK_URL не настроен');
                return;
            }

            await this.bot.setWebHook(config.telegram.webhookUrl, {
                secret_token: config.telegram.secretToken
            });

            console.log('✅ Telegram webhook установлен:', config.telegram.webhookUrl);
        } catch (error) {
            console.error('❌ Ошибка установки webhook:', error);
        }
    }

    // Получение информации о боте
    async getBotInfo() {
        try {
            if (!this.bot) return null;
            return await this.bot.getMe();
        } catch (error) {
            console.error('Ошибка получения информации о боте:', error);
            return null;
        }
    }
}

// Экспорт синглтона
const telegramBotService = new TelegramBotService();

module.exports = telegramBotService;
