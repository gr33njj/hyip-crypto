# 🚀 Быстрый старт на облачном сервере

Простая инструкция для развёртывания проекта на вашем Ubuntu сервере с Docker.

## 📋 Что у вас должно быть

✅ **Ubuntu 22.04 сервер** с Docker  
✅ **Домен** (например, `your-domain.com`)  
✅ **Telegram бот токен** от @BotFather  
✅ **SSH доступ** к серверу  

## 🛠 Установка за 5 минут

### 1️⃣ Подключитесь к серверу
```bash
ssh root@YOUR_SERVER_IP
```

### 2️⃣ Создайте пользователя
```bash
adduser deploy
usermod -aG sudo deploy
su - deploy
```

### 3️⃣ Загрузите проект
```bash
git clone https://github.com/your-username/usdt-miniapp.git
cd usdt-miniapp
chmod +x scripts/deploy.sh
```

### 4️⃣ Запустите автоматическую установку
```bash
./scripts/deploy.sh
```

Следуйте инструкциям скрипта:
- Введите ваш домен (например: `mydomain.com`)
- Введите email для SSL сертификата
- Дождитесь завершения установки

### 5️⃣ Настройте переменные окружения
```bash
cd /home/usdt-app/usdt-miniapp
nano .env
```

**Обязательно измените:**
```env
# Ваш Telegram бот токен
TELEGRAM_BOT_TOKEN=1234567890:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA

# Ваш домен
DOMAIN=mydomain.com
TELEGRAM_WEBHOOK_URL=https://mydomain.com/api/v1/webhook/telegram

# TRON кошельки (создайте в TronLink)
POOL_WALLET_ADDRESS=TRxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
HOT_WALLET_ADDRESS=TRyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy

# Надёжные пароли
DB_PASSWORD=ваш_сложный_пароль_123!
JWT_SECRET=очень_секретный_ключ_456!
ADMIN_PASSWORD=пароль_админа_789!
```

### 6️⃣ Перезапустите с новой конфигурацией
```bash
sudo systemctl restart usdt-app
```

### 7️⃣ Настройте Telegram бота

В чате с @BotFather:
```
/setmenubutton
# Выберите вашего бота
# Текст кнопки: 💰 Кошелёк
# URL: https://mydomain.com

/setcommands  
# Выберите вашего бота
# Команды:
start - Запуск бота
balance - Проверить баланс
support - Поддержка
```

## ✅ Проверка работы

### Откройте в браузере:
- **WebApp**: https://mydomain.com
- **Админка**: https://mydomain.com/admin  
- **API**: https://mydomain.com/api/docs

### Проверьте логи:
```bash
sudo -u usdt-app docker-compose -f docker-compose.prod.yml logs
```

### Проверьте статус:
```bash
sudo -u usdt-app docker-compose -f docker-compose.prod.yml ps
```

## 🔧 Полезные команды

```bash
# Перезапуск приложения
sudo systemctl restart usdt-app

# Просмотр логов
sudo -u usdt-app docker-compose -f docker-compose.prod.yml logs -f

# Обновление проекта
cd /home/usdt-app/usdt-miniapp
sudo -u usdt-app git pull
sudo systemctl restart usdt-app
```

## 🎯 Что дальше?

1. **Создайте TRON кошельки** в TronLink и добавьте адреса в конфигурацию
2. **Протестируйте** депозиты с небольшими суммами
3. **Настройте мониторинг** и резервное копирование
4. **Изучите** полную документацию в `docs/DEPLOYMENT.md`

## 🆘 Нужна помощь?

- 📚 **Полная документация**: `docs/DEPLOYMENT.md`
- 🐛 **Проблемы**: Проверьте логи командой выше
- 💬 **Поддержка**: Создайте issue в репозитории

---

🎉 **Готово!** Ваш USDT кошелёк запущен и готов к использованию!
