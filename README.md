# USDT Deposits Management System 💰

Полнофункциональная система управления депозитами USDT (TRC-20) с Telegram WebApp и административной панелью.

## 🚀 Возможности

### Для пользователей (Telegram WebApp)
- 📱 Современный интерфейс, оптимизированный для мобильных устройств
- 💰 Просмотр баланса в реальном времени
- 📥 Пополнение депозитов с автоматической проверкой
- 📤 Создание заявок на вывод средств
- 📊 История всех операций
- 🔔 Push-уведомления через Telegram бота

### Для администраторов
- 🛠 Веб-панель для управления системой
- ✅ Одобрение/отклонение депозитов
- 💸 Обработка заявок на вывод
- 📈 Начисление процентов и бонусов
- 👥 Управление пользователями
- 📊 Детальная аналитика и отчёты

### Технические особенности
- 🔐 Безопасное хранение приватных ключей
- ⚡ Автоматический мониторинг TRON блокчейна
- 🔄 Система подтверждений транзакций
- 🚨 Алерты при критических событиях
- 📝 Полное логирование всех действий

## 🏗 Архитектура

```
┌─────────────────┐    ┌─────────────────┐
│   Telegram      │    │   Admin Panel   │
│   WebApp        │    │   (React SPA)   │
│   (React)       │    │                 │
└─────────┬───────┘    └─────────┬───────┘
          │                      │
          └──────────┬───────────┘
                     │
            ┌─────────▼───────┐
            │   API Gateway   │
            │   (Express.js)  │
            └─────────┬───────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
┌───────▼──────┐ ┌───▼───┐ ┌──────▼──────┐
│ PostgreSQL   │ │ Redis │ │ TronWeb     │
│ Database     │ │ Cache │ │ Blockchain  │
└──────────────┘ └───────┘ └─────────────┘
```

## 📦 Компоненты

### Backend (`/backend`)
- **Framework**: Node.js + Express.js
- **Database**: PostgreSQL с миграциями
- **Cache**: Redis для сессий и кэширования
- **Blockchain**: TronWeb для работы с TRON
- **Auth**: Telegram WebApp аутентификация
- **API**: RESTful API с Swagger документацией

### Frontend (`/frontend`)
- **Framework**: React 18 + TypeScript
- **UI**: Tailwind CSS + Framer Motion
- **State**: React Query для кэширования
- **Routing**: React Router
- **Build**: Create React App

### Admin Panel (`/admin-panel`)
- **Framework**: React 18 + TypeScript
- **UI**: Material-UI или аналогичная библиотека
- **Charts**: Chart.js для аналитики
- **Auth**: JWT токены

### DevOps (`/docker`)
- **Containerization**: Docker + Docker Compose
- **Reverse Proxy**: Nginx
- **SSL**: Let's Encrypt поддержка
- **Monitoring**: Health checks

## 🛠 Быстрый запуск

### Автоматическая установка (Windows)
```batch
# Клонируйте репозиторий
git clone <repository-url>
cd usdt-miniapp

# Запустите автоматическую настройку
scripts\setup.bat

# Запустите в режиме разработки
scripts\dev.bat
```

### Автоматическая установка (Linux/macOS)
```bash
# Клонируйте репозиторий
git clone <repository-url>
cd usdt-miniapp

# Запустите автоматическую настройку
chmod +x scripts/setup.sh
./scripts/setup.sh --with-db

# Запустите в режиме разработки
./scripts/dev.sh
```

### Ручная установка

1. **Установка зависимостей**
```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install

# Admin Panel
cd ../admin-panel && npm install
```

2. **Настройка окружения**
```bash
# Скопируйте и настройте env файлы
cp backend/env.example backend/.env
cp frontend/.env.example frontend/.env
cp admin-panel/.env.example admin-panel/.env
```

3. **Запуск базы данных**
```bash
docker-compose up -d postgres redis
```

4. **Выполнение миграций**
```bash
cd backend && npm run migrate
```

5. **Запуск сервисов**
```bash
# В отдельных терминалах:
cd backend && npm run dev
cd frontend && npm start
cd admin-panel && npm start
```

## 🌐 URLs после запуска

- **Telegram WebApp**: http://localhost:3000
- **Admin Panel**: http://localhost:3001
- **API Backend**: http://localhost:3000/api/v1
- **API Documentation**: http://localhost:3000/api/docs
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## ⚙️ Конфигурация

### Обязательные переменные окружения

```env
# Backend (.env)
TELEGRAM_BOT_TOKEN=your_bot_token
POOL_WALLET_ADDRESS=your_tron_address
USDT_CONTRACT_ADDRESS=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t
DB_PASSWORD=your_db_password
JWT_SECRET=your_jwt_secret
```

### Настройка Telegram бота

1. Создайте бота через @BotFather
2. Получите токен бота
3. Настройте WebApp URL
4. Добавьте токен в переменные окружения

### Настройка TRON

1. Создайте TRON кошелёк для пула
2. Получите API ключ TronGrid (опционально)
3. Настройте мониторинг блокчейна

## 🔒 Безопасность

### Хранение приватных ключей
- Используйте HashiCorp Vault в продакшене
- Никогда не храните ключи в коде
- Настройте MFA для админов

### Rate Limiting
- API: 100 запросов/15 минут
- WebApp: 30 запросов/15 минут
- Защита от DDoS атак

### Аудит
- Логирование всех админских действий
- Мониторинг подозрительной активности
- Бэкапы базы данных

## 📊 База данных

### Основные таблицы
- `users` - пользователи Telegram
- `deposits` - депозиты USDT
- `withdrawals` - заявки на вывод
- `accruals` - начисления процентов
- `admin_actions` - действия администраторов

### Миграции
```bash
# Создание новой миграции
cd backend
node scripts/create-migration.js migration_name

# Выполнение миграций
npm run migrate

# Откат последней миграции
npm run migrate:rollback
```

## 🚀 Деплой в продакшен

### Docker Compose (рекомендуется)
```bash
# Настройте prod окружение
cp .env.example .env.production

# Соберите и запустите
docker-compose -f docker-compose.prod.yml up -d
```

### Kubernetes
```bash
# Примените конфигурации
kubectl apply -f k8s/
```

## 📈 Мониторинг

### Метрики
- Prometheus на порту 9090
- Grafana дашборды
- Алерты в Telegram

### Health Checks
- `/health` - основное приложение
- `/api/health` - API статус
- Проверка подключения к БД

### Логи
- Структурированные JSON логи
- Ротация файлов
- Централизованный сбор (ELK Stack)

## 🧪 Тестирование

```bash
# Unit тесты
npm test

# Integration тесты
npm run test:integration

# E2E тесты
npm run test:e2e

# Coverage
npm run test:coverage
```

## 📚 API Документация

Полная документация API доступна по адресу `/api/docs` после запуска сервера.

### Основные endpoints

#### Пользовательские
- `GET /api/v1/user/profile` - профиль пользователя
- `GET /api/v1/user/balance` - баланс
- `POST /api/v1/deposits/submit` - подача депозита
- `POST /api/v1/withdrawals` - создание заявки на вывод

#### Административные
- `GET /api/v1/admin/dashboard` - дашборд
- `POST /api/v1/admin/deposits/{id}/approve` - одобрение депозита
- `POST /api/v1/admin/withdrawals/{id}/paid` - отметка как выплачено

## 🤝 Участие в разработке

1. Форкните репозиторий
2. Создайте feature ветку
3. Внесите изменения
4. Добавьте тесты
5. Отправьте Pull Request

## 📄 Лицензия

MIT License - см. файл [LICENSE](LICENSE)

## 🆘 Поддержка

- 📧 Email: support@yourdomain.com
- 💬 Telegram: @your_support_bot
- 📚 Документация: [docs/](docs/)
- 🐛 Issues: [GitHub Issues](../../issues)

## 🗺 Roadmap

- [ ] ✅ Базовая функциональность (v1.0)
- [ ] 📱 Мобильное приложение (v1.1)
- [ ] 🔄 Автоматические выплаты (v1.2)
- [ ] 📊 Расширенная аналитика (v1.3)
- [ ] 🌍 Мультиязычность (v1.4)
- [ ] 🔗 Интеграция с другими блокчейнами (v2.0)

---

**⚠️ Важно**: Это демонстрационный проект. Перед использованием в продакшене обязательно проведите security audit и настройте все необходимые меры безопасности.
