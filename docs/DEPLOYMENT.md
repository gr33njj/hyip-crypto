# 🚀 Руководство по развёртыванию в продакшене

Пошаговое руководство по развёртыванию USDT Deposits Management System на облачном сервере Ubuntu 22.04.

## 📋 Предварительные требования

### Сервер
- **OS**: Ubuntu 22.04 LTS или новее
- **RAM**: минимум 2GB (рекомендуется 4GB)
- **CPU**: минимум 2 ядра
- **Диск**: минимум 20GB SSD
- **Сеть**: публичный IP адрес

### Дополнительно
- **Домен**: зарегистрированный домен (для HTTPS)
- **Telegram Bot**: токен от @BotFather
- **TRON кошелёк**: адреса для пула и выплат

## 🛠 Автоматическое развёртывание

### Шаг 1: Подключение к серверу
```bash
# Подключитесь к серверу по SSH
ssh root@YOUR_SERVER_IP

# Создайте пользователя (если ещё не создан)
adduser deploy
usermod -aG sudo deploy
su - deploy
```

### Шаг 2: Загрузка проекта
```bash
# Клонируйте репозиторий
git clone https://github.com/your-username/usdt-miniapp.git
cd usdt-miniapp

# Сделайте скрипт исполняемым
chmod +x scripts/deploy.sh
```

### Шаг 3: Запуск развёртывания
```bash
# Запустите автоматическое развёртывание
./scripts/deploy.sh
```

Скрипт автоматически:
- ✅ Установит Docker и Docker Compose
- ✅ Настроит firewall
- ✅ Создаст пользователя приложения
- ✅ Настроит SSL сертификат (Let's Encrypt)
- ✅ Запустит все сервисы
- ✅ Настроит автозапуск и мониторинг

### Шаг 4: Настройка переменных окружения
```bash
# Перейдите в директорию приложения
cd /home/usdt-app/usdt-miniapp

# Отредактируйте конфигурацию
nano .env
```

**Обязательно измените следующие параметры:**

```env
# Замените на токен вашего бота
TELEGRAM_BOT_TOKEN=1234567890:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA

# Замените на ваш домен
DOMAIN=your-domain.com
TELEGRAM_WEBHOOK_URL=https://your-domain.com/api/v1/webhook/telegram

# Замените на адрес вашего TRON кошелька
POOL_WALLET_ADDRESS=TRNxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
HOT_WALLET_ADDRESS=TRNyyyyyyyyyyyyyyyyyyyyyyyyyyyyy

# Задайте надёжные пароли
DB_PASSWORD=ваш_очень_сложный_пароль_123!
REDIS_PASSWORD=ещё_один_сложный_пароль_456!
JWT_SECRET=супер_секретный_ключ_для_jwt_789!
ADMIN_PASSWORD=пароль_для_админ_панели_012!

# API ключ TronGrid (опционально, для лучшей производительности)
TRON_API_KEY=ваш_tron_api_ключ
```

### Шаг 5: Перезапуск с новой конфигурацией
```bash
# Перезапустите приложение
sudo systemctl restart usdt-app

# Проверьте статус
sudo -u usdt-app docker-compose -f docker-compose.prod.yml ps
```

## 🤖 Настройка Telegram бота

### Шаг 1: Создание бота
1. Откройте @BotFather в Telegram
2. Отправьте `/newbot`
3. Следуйте инструкциям
4. Сохраните токен бота

### Шаг 2: Настройка WebApp
```bash
# В чате с @BotFather
/setmenubutton

# Выберите вашего бота
# Введите текст кнопки: "💰 Открыть кошелёк"
# Введите URL: https://your-domain.com
```

### Шаг 3: Настройка команд
```bash
# В чате с @BotFather
/setcommands

# Выберите вашего бота
# Введите команды:
start - Запуск бота
balance - Проверить баланс
deposit - Пополнить счёт
withdraw - Вывести средства
history - История операций
support - Поддержка
```

### Шаг 4: Настройка webhook
```bash
# Установите webhook (выполните на сервере)
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://your-domain.com/api/v1/webhook/telegram"}'
```

## 💳 Настройка TRON кошельков

### Создание кошелька для пула
```bash
# Используйте TronLink или создайте через код
# Сохраните:
# 1. Публичный адрес (POOL_WALLET_ADDRESS)
# 2. Приватный ключ (храните в безопасности!)
```

### Настройка мониторинга
```bash
# Добавьте в .env файл
POOL_WALLET_ADDRESS=ваш_адрес_пула
HOT_WALLET_ADDRESS=ваш_адрес_для_выплат
```

## 🔒 Настройка безопасности

### Firewall
```bash
# Проверьте статус
sudo ufw status

# Должно быть открыто только:
# 22/tcp (SSH)
# 80/tcp (HTTP)
# 443/tcp (HTTPS)
```

### SSL сертификат
```bash
# Проверьте сертификат
sudo docker run --rm -v ssl_certs:/etc/letsencrypt certbot/certbot certificates

# Автообновление настроено через cron
```

### Backup базы данных
```bash
# Создайте скрипт бэкапа
cat > /home/usdt-app/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker exec usdt_postgres_prod pg_dump -U postgres usdt_deposits | gzip > /home/usdt-app/backups/db_backup_$DATE.sql.gz
find /home/usdt-app/backups -name "*.sql.gz" -mtime +7 -delete
EOF

chmod +x /home/usdt-app/backup.sh
mkdir -p /home/usdt-app/backups

# Добавьте в crontab (ежедневный бэкап в 2:00)
echo "0 2 * * * /home/usdt-app/backup.sh" | sudo -u usdt-app crontab -
```

## 📊 Мониторинг и логи

### Проверка статуса сервисов
```bash
# Статус всех контейнеров
sudo -u usdt-app docker-compose -f docker-compose.prod.yml ps

# Статус systemd службы
sudo systemctl status usdt-app
```

### Просмотр логов
```bash
# Все логи
sudo -u usdt-app docker-compose -f docker-compose.prod.yml logs

# Логи конкретного сервиса
sudo -u usdt-app docker-compose -f docker-compose.prod.yml logs backend
sudo -u usdt-app docker-compose -f docker-compose.prod.yml logs frontend
sudo -u usdt-app docker-compose -f docker-compose.prod.yml logs postgres

# Логи в реальном времени
sudo -u usdt-app docker-compose -f docker-compose.prod.yml logs -f
```

### Мониторинг ресурсов
```bash
# Использование Docker
docker stats

# Использование диска
df -h

# Использование памяти
free -h

# Загрузка процессора
htop
```

## 🔧 Обслуживание

### Обновление приложения
```bash
cd /home/usdt-app/usdt-miniapp

# Остановите сервисы
sudo -u usdt-app docker-compose -f docker-compose.prod.yml down

# Обновите код
sudo -u usdt-app git pull

# Пересоберите и запустите
sudo -u usdt-app docker-compose -f docker-compose.prod.yml up --build -d
```

### Перезапуск сервисов
```bash
# Полный перезапуск
sudo systemctl restart usdt-app

# Перезапуск конкретного сервиса
sudo -u usdt-app docker-compose -f docker-compose.prod.yml restart backend
```

### Очистка Docker
```bash
# Удаление неиспользуемых образов и контейнеров
docker system prune -a

# Очистка логов Docker
sudo sh -c 'echo "" > $(docker inspect --format="{{.LogPath}}" usdt_backend_prod)'
```

## 🆘 Решение проблем

### Проблема: Сайт недоступен
```bash
# Проверьте nginx
sudo -u usdt-app docker-compose -f docker-compose.prod.yml logs nginx

# Проверьте SSL сертификат
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# Проверьте DNS
nslookup your-domain.com
```

### Проблема: База данных не работает
```bash
# Проверьте статус PostgreSQL
sudo -u usdt-app docker-compose -f docker-compose.prod.yml exec postgres pg_isready

# Проверьте логи
sudo -u usdt-app docker-compose -f docker-compose.prod.yml logs postgres

# Восстановление из бэкапа
zcat /home/usdt-app/backups/db_backup_YYYYMMDD_HHMMSS.sql.gz | sudo -u usdt-app docker-compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -d usdt_deposits
```

### Проблема: Высокая нагрузка
```bash
# Проверьте использование ресурсов
docker stats

# Масштабирование backend (если нужно)
sudo -u usdt-app docker-compose -f docker-compose.prod.yml up -d --scale backend=2
```

## 📈 Производительность

### Рекомендации по серверу
- **Базовая нагрузка**: 2GB RAM, 2 CPU
- **Средняя нагрузка** (100+ пользователей): 4GB RAM, 4 CPU  
- **Высокая нагрузка** (1000+ пользователей): 8GB RAM, 8 CPU

### Оптимизация базы данных
```sql
-- Подключитесь к PostgreSQL
sudo -u usdt-app docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -d usdt_deposits

-- Анализ производительности
ANALYZE;

-- Проверка индексов
SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch FROM pg_stat_user_indexes;
```

### Настройка кэширования
```bash
# Проверьте статус Redis
sudo -u usdt-app docker-compose -f docker-compose.prod.yml exec redis redis-cli ping

# Мониторинг кэша
sudo -u usdt-app docker-compose -f docker-compose.prod.yml exec redis redis-cli info memory
```

## 🔐 Безопасность в продакшене

### Дополнительные меры
1. **Fail2ban** для защиты от брутфорса
2. **Регулярные обновления** системы
3. **Мониторинг подозрительной активности**
4. **Резервное копирование** данных
5. **Использование Vault** для секретов

### Пример настройки Fail2ban
```bash
sudo apt install fail2ban

cat > /etc/fail2ban/jail.local << EOF
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
EOF

sudo systemctl restart fail2ban
```

---

🎉 **Поздравляем!** Ваш USDT Deposits Management System успешно развёрнут в продакшене!
