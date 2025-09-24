# 🎯 Ваши следующие шаги

Итак, у вас есть Telegram бот и облачный сервер Ubuntu 22.04 с Docker. Вот точный план действий для запуска проекта.

## 📋 Чек-лист подготовки

### ✅ Что у вас есть:
- [ ] Ubuntu 22.04 сервер с Docker
- [ ] Telegram бот токен от @BotFather  
- [ ] Доменное имя (например: `mydomain.com`)
- [ ] SSH доступ к серверу

### ⚠️ Что нужно подготовить:
- [ ] Направить домен на IP сервера (A-запись в DNS)
- [ ] Создать TRON кошельки для пула и выплат
- [ ] Получить API ключ TronGrid (опционально)

---

## 🚀 Пошаговая инструкция

### Шаг 1: Настройка DNS
```bash
# В панели управления доменом создайте A-запись:
# mydomain.com → IP_ВАШЕГО_СЕРВЕРА
# www.mydomain.com → IP_ВАШЕГО_СЕРВЕРА

# Проверьте DNS:
nslookup mydomain.com
```

### Шаг 2: Подключение к серверу
```bash
# Подключитесь по SSH
ssh root@YOUR_SERVER_IP

# Обновите систему
apt update && apt upgrade -y

# Создайте пользователя
adduser deploy
usermod -aG sudo deploy
su - deploy
```

### Шаг 3: Загрузка и установка проекта
```bash
# Установите git
sudo apt install -y git

# Клонируйте проект (замените URL на ваш репозиторий)
git clone https://github.com/your-username/usdt-miniapp.git
cd usdt-miniapp

# Запустите автоматическую установку
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

**Во время установки вас спросят:**
- Домен: введите `mydomain.com`
- Email: введите ваш email для SSL сертификата

### Шаг 4: Создание TRON кошельков

1. **Установите TronLink**: https://www.tronlink.org/
2. **Создайте 2 кошелька:**
   - **Пул-кошелёк** - для приёма депозитов
   - **Горячий кошелёк** - для выплат
3. **Сохраните адреса** (они начинаются с `T...`)

### Шаг 5: Настройка переменных окружения
```bash
# Перейдите в директорию приложения
cd /home/usdt-app/usdt-miniapp

# Отредактируйте конфигурацию
nano .env
```

**Замените следующие значения:**
```env
# 🤖 Ваш Telegram бот
TELEGRAM_BOT_TOKEN=1234567890:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA

# 🌐 Ваш домен  
DOMAIN=mydomain.com
TELEGRAM_WEBHOOK_URL=https://mydomain.com/api/v1/webhook/telegram
FRONTEND_API_URL=https://mydomain.com/api/v1
ADMIN_API_URL=https://mydomain.com/api/v1
CORS_ORIGINS=https://mydomain.com,https://t.me

# 💳 TRON кошельки
POOL_WALLET_ADDRESS=TRxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
HOT_WALLET_ADDRESS=TRyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy

# 🔐 Пароли (придумайте сложные!)
DB_PASSWORD=ваш_очень_сложный_пароль_для_БД_123!
REDIS_PASSWORD=сложный_пароль_для_Redis_456!
JWT_SECRET=супер_секретный_ключ_для_JWT_789!
ADMIN_PASSWORD=пароль_для_админ_панели_012!

# 🔗 TronGrid API (опционально, для лучшей производительности)
TRON_API_KEY=ваш_api_ключ_от_trongrid
```

### Шаг 6: Перезапуск с новой конфигурацией
```bash
# Перезапустите приложение
sudo systemctl restart usdt-app

# Дождитесь запуска (30-60 секунд)
sleep 30

# Проверьте статус
sudo -u usdt-app docker-compose -f docker-compose.prod.yml ps
```

### Шаг 7: Настройка Telegram бота

**7.1. Настройте меню WebApp:**
- Откройте @BotFather в Telegram
- Отправьте `/setmenubutton`
- Выберите вашего бота
- Введите:
  - **Текст кнопки**: `💰 Открыть кошелёк`
  - **URL**: `https://mydomain.com`

**7.2. Настройте команды:**
- Отправьте `/setcommands`
- Выберите вашего бота  
- Введите команды:
```
start - 🚀 Запуск бота
balance - 💰 Проверить баланс  
deposit - 📥 Пополнить счёт
withdraw - 📤 Вывести средства
history - 📊 История операций
support - 🆘 Поддержка
```

**7.3. Установите webhook:**
```bash
# На сервере выполните:
curl -X POST "https://api.telegram.org/bot<ВАШ_ТОКЕН>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://mydomain.com/api/v1/webhook/telegram"}'
```

### Шаг 8: Проверка работы

**8.1. Откройте в браузере:**
- ✅ **WebApp**: https://mydomain.com
- ✅ **Админка**: https://mydomain.com/admin
- ✅ **API документация**: https://mydomain.com/api/docs

**8.2. Проверьте логи:**
```bash
sudo -u usdt-app docker-compose -f docker-compose.prod.yml logs
```

**8.3. Протестируйте бота:**
- Найдите вашего бота в Telegram
- Нажмите `/start`
- Нажмите кнопку `💰 Открыть кошелёк`

---

## 🔧 Дополнительные настройки

### Настройка TronGrid API (рекомендуется)
1. Зайдите на https://www.trongrid.io/
2. Зарегистрируйтесь и создайте API ключ
3. Добавьте ключ в `.env` файл: `TRON_API_KEY=your_key`

### Резервное копирование
```bash
# Создайте скрипт бэкапа
cat > /home/usdt-app/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p /home/usdt-app/backups
docker exec usdt_postgres_prod pg_dump -U postgres usdt_deposits | gzip > /home/usdt-app/backups/db_backup_$DATE.sql.gz
find /home/usdt-app/backups -name "*.sql.gz" -mtime +7 -delete
echo "Backup completed: db_backup_$DATE.sql.gz"
EOF

chmod +x /home/usdt-app/backup.sh

# Добавьте в crontab (бэкап каждые 6 часов)
echo "0 */6 * * * /home/usdt-app/backup.sh >> /home/usdt-app/backup.log 2>&1" | sudo -u usdt-app crontab -
```

### Мониторинг
```bash
# Проверка статуса сервисов
sudo -u usdt-app docker-compose -f docker-compose.prod.yml ps

# Просмотр логов в реальном времени
sudo -u usdt-app docker-compose -f docker-compose.prod.yml logs -f

# Использование ресурсов
docker stats
```

---

## 🎯 Тестирование системы

### 1. Тест депозита
1. Получите адрес пула из WebApp
2. Отправьте небольшую сумму USDT (TRC-20) на этот адрес
3. Скопируйте hash транзакции
4. Вставьте hash в WebApp
5. Проверьте в админке появление депозита для одобрения

### 2. Тест одобрения
1. Откройте админку: https://mydomain.com/admin
2. Войдите с паролем из `ADMIN_PASSWORD`
3. Найдите ваш тестовый депозит
4. Одобрите его
5. Проверьте обновление баланса в WebApp

### 3. Тест вывода
1. Создайте заявку на вывод в WebApp
2. Проверьте появление заявки в админке
3. Одобрите заявку
4. Отметьте как выплаченную с hash транзакции

---

## 🆘 Решение проблем

### Проблема: Сайт недоступен
```bash
# Проверьте статус nginx
sudo -u usdt-app docker-compose -f docker-compose.prod.yml logs nginx

# Проверьте DNS
nslookup mydomain.com

# Проверьте сертификат
openssl s_client -connect mydomain.com:443
```

### Проблема: База данных не работает
```bash
# Проверьте PostgreSQL
sudo -u usdt-app docker-compose -f docker-compose.prod.yml logs postgres

# Перезапустите БД
sudo -u usdt-app docker-compose -f docker-compose.prod.yml restart postgres
```

### Проблема: Telegram бот не отвечает
```bash
# Проверьте webhook
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"

# Проверьте логи backend
sudo -u usdt-app docker-compose -f docker-compose.prod.yml logs backend
```

---

## 📞 Что делать, если застряли?

1. **Проверьте логи**: `sudo -u usdt-app docker-compose -f docker-compose.prod.yml logs`
2. **Перезапустите**: `sudo systemctl restart usdt-app`
3. **Изучите документацию**: `docs/DEPLOYMENT.md`
4. **Создайте issue** в репозитории с описанием проблемы

---

## 🎉 Готово!

После выполнения всех шагов у вас будет:

✅ **Рабочий USDT кошелёк** в Telegram WebApp  
✅ **Админ-панель** для управления  
✅ **Автоматический мониторинг** TRON блокчейна  
✅ **SSL сертификат** и безопасность  
✅ **Резервное копирование** и мониторинг  

**Удачи с запуском! 🚀**
