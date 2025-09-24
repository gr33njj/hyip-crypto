# Build стадия
FROM node:18-alpine AS builder

# Рабочая директория
WORKDIR /app

# Копируем файлы зависимостей
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --silent

# Копируем исходный код
COPY . .

# Собираем приложение
RUN npm run build

# Production стадия с Nginx
FROM nginx:alpine AS production

# Удаляем дефолтную конфигурацию nginx
RUN rm /etc/nginx/conf.d/default.conf

# Копируем кастомную конфигурацию nginx
COPY docker/nginx.conf /etc/nginx/conf.d/

# Копируем собранное приложение
COPY --from=builder /app/build /usr/share/nginx/html

# Создаём non-root пользователя
RUN addgroup -g 1001 -S nginx && \
    adduser -D -S -u 1001 nginx nginx && \
    chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d

# Переключаемся на непривилегированного пользователя
USER nginx

# Открываем порт
EXPOSE 80

# Запускаем nginx
CMD ["nginx", "-g", "daemon off;"]
