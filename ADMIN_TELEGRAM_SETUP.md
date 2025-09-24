# 🤖 Настройка Telegram бота и админ-панели

## 📋 Обзор

Проект теперь включает:

1. **💰 Frontend WebApp** - кошелёк для пользователей
2. **⚙️ Admin Panel** - веб-интерфейс для администраторов  
3. **🤖 Telegram Bot** - уведомления и интерфейс через Telegram
4. **🔗 Backend API** - единая система обработки

---

## 🌐 URL адреса после деплоя

- **Пользовательский кошелёк**: https://your-domain.com
- **Админ-панель**: https://admin.your-domain.com (или http://localhost:3002)
- **API документация**: https://your-domain.com/api/docs

---

## 🤖 Настройка Telegram бота

### 1. Регистрация бота (уже сделано)

Вы уже зарегистрировали бота. Вам понадобится:
- `TELEGRAM_BOT_TOKEN` - токен от @BotFather
- `TELEGRAM_WEBHOOK_URL` - URL для webhook (https://your-domain.com/api/v1/webhook/telegram)

### 2. Переменные окружения для бота

Добавьте в `.env` файл на сервере:

```bash
# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_WEBHOOK_URL=https://your-domain.com/api/v1/webhook/telegram
TELEGRAM_SECRET_TOKEN=random_secret_for_webhook_security

# Админы (Telegram ID через запятую)
ADMIN_TELEGRAM_IDS=123456789,987654321

# Настройки WebApp
WEBAPP_URL=https://your-domain.com
ADMIN_URL=https://admin.your-domain.com
```

### 3. Настройка WebApp в Telegram

1. Откройте @BotFather
2. Выберите вашего бота
3. Нажмите "Bot Settings" → "Menu Button"  
4. Выберите "Configure menu button"
5. Введите:
   - **Text**: "💰 Открыть кошелёк"
   - **URL**: https://your-domain.com

### 4. Настройка команд бота

Отправьте @BotFather команду `/setcommands` и выберите вашего бота.
Вставьте следующий список команд:

```
start - 🎉 Начать работу с ботом
balance - 💰 Проверить баланс
deposit - 📥 Пополнить счёт
support - 🆘 Связаться с поддержкой
```

---

## ⚙️ Админ-панель

### Доступ к админ-панели

1. **URL**: http://localhost:3002 (в разработке) или https://admin.your-domain.com
2. **Логин**: Ваш Telegram ID
3. **Пароль**: Значение переменной `ADMIN_PASSWORD` из .env

### Как узнать Telegram ID

1. Напишите боту @userinfobot
2. Отправьте любое сообщение
3. Он пришлёт ваш Telegram ID

### Функции админ-панели

- 📊 **Дашборд** - общая статистика и уведомления
- 📥 **Депозиты** - одобрение/отклонение депозитов
- 📤 **Выводы** - обработка заявок на вывод
- 👥 **Пользователи** - управление пользователями
- 💰 **Начисления** - ручные начисления и бонусы

---

## 🔧 Технические детали

### Уведомления пользователей

Бот автоматически отправляет уведомления о:
- ✅ Новых депозитах (обнаружение → подтверждение → зачисление)
- 📤 Статусе заявок на вывод
- ❌ Отклонённых операциях

### API endpoints для бота

- `POST /api/v1/webhook/telegram` - Telegram webhook
- `POST /api/v1/webhook/notification` - Внутренние уведомления

### Интеграция с админ-панелью

При действиях в админ-панели автоматически отправляются уведомления через бота:

```javascript
// Пример: одобрение депозита отправит уведомление пользователю
await telegramBotService.notifyDepositReceived(userId, amount, txHash, 'approved');
```

---

## 🚀 Запуск в разработке

### Локальная разработка

```bash
# Запуск всех сервисов
docker-compose up -d

# Доступные адреса:
# - Кошелёк: http://localhost:3001
# - Админ-панель: http://localhost:3002  
# - API: http://localhost:3000
```

### Сборка админ-панели отдельно

```bash
cd admin-panel
npm install
npm start  # development
npm run build  # production
```

---

## 📁 Структура проекта

```
usdt-miniapp/
├── frontend/           # Пользовательский WebApp
├── admin-panel/        # 🆕 Админ-панель
├── backend/           
│   ├── src/services/
│   │   ├── telegramBot.js    # 🆕 Telegram бот
│   │   └── tronService.js    # Мониторинг TRON
│   └── routes/
│       └── webhook.js        # 🆕 Webhook роуты
└── docker-compose.yml  # Включает admin-panel сервис
```

---

## ⚠️ Важные замечания

### Безопасность
- Админ-панель должна быть доступна только администраторам
- Используйте HTTPS в продакшене
- Webhook URL должен быть защищён (используйте TELEGRAM_SECRET_TOKEN)

### Ограничения
- Админ-панель пока включает только дашборд и депозиты
- Остальные страницы (выводы, пользователи) требуют доработки
- Рекомендуется настроить мониторинг логов

### Следующие шаги
1. Разверните проект на сервере
2. Настройте домен и SSL
3. Добавьте переменные окружения для Telegram
4. Протестируйте работу бота и админ-панели

---

## 🆘 Поддержка

Если возникли проблемы:

1. Проверьте логи: `docker-compose logs backend`
2. Убедитесь что все переменные окружения настроены
3. Проверьте webhook: перейдите на https://your-domain.com/api/v1/webhook/telegram

**Готово! 🎉 Telegram бот и админ-панель настроены и готовы к работе.**
