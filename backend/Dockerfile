# Multi-stage build для оптимизации размера образа
FROM node:18-alpine AS builder

# Установка зависимостей для native модулей
RUN apk add --no-cache python3 make g++

# Рабочая директория
WORKDIR /app

# Копируем файлы зависимостей
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production && npm cache clean --force

# Production образ
FROM node:18-alpine AS production

# Создаём пользователя для безопасности
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Устанавливаем необходимые пакеты
RUN apk add --no-cache \
    curl \
    tzdata \
    && rm -rf /var/cache/apk/*

# Устанавливаем timezone
ENV TZ=Europe/Moscow

# Рабочая директория
WORKDIR /app

# Копируем node_modules из builder стадии
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Копируем исходный код
COPY --chown=nodejs:nodejs . .

# Создаём директории для логов
RUN mkdir -p logs && chown nodejs:nodejs logs

# Переключаемся на непривилегированного пользователя
USER nodejs

# Открываем порт
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Запускаем приложение
CMD ["node", "src/server.js"]
