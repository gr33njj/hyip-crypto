#!/bin/bash

# Скрипт для развёртывания USDT Deposits Management System на продакшн сервере

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Проверка, что скрипт запущен с sudo
check_sudo() {
    if [[ $EUID -eq 0 ]]; then
        print_error "Не запускайте этот скрипт от root! Используйте sudo только когда необходимо."
        exit 1
    fi
}

# Проверка зависимостей
check_dependencies() {
    print_status "Проверка зависимостей системы..."
    
    # Обновляем пакеты
    sudo apt update
    
    # Устанавливаем необходимые пакеты
    sudo apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release
    
    # Проверяем Docker
    if ! command -v docker &> /dev/null; then
        print_status "Установка Docker..."
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
        sudo apt update
        sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
        sudo usermod -aG docker $USER
        print_success "Docker установлен"
    else
        print_success "Docker уже установлен"
    fi
    
    # Проверяем Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        print_status "Установка Docker Compose..."
        sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
        print_success "Docker Compose установлен"
    else
        print_success "Docker Compose уже установлен"
    fi
    
    # Устанавливаем Node.js (для локальных скриптов)
    if ! command -v node &> /dev/null; then
        print_status "Установка Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt install -y nodejs
        print_success "Node.js установлен"
    else
        print_success "Node.js уже установлен"
    fi
}

# Настройка firewall
setup_firewall() {
    print_status "Настройка firewall..."
    
    # Включаем UFW
    sudo ufw --force enable
    
    # Базовые правила
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    
    # Разрешаем SSH
    sudo ufw allow ssh
    
    # Разрешаем HTTP и HTTPS
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    
    # Показываем статус
    sudo ufw status
    
    print_success "Firewall настроен"
}

# Создание пользователя для приложения
create_app_user() {
    if ! id "usdt-app" &>/dev/null; then
        print_status "Создание пользователя приложения..."
        sudo useradd -m -s /bin/bash usdt-app
        sudo usermod -aG docker usdt-app
        print_success "Пользователь usdt-app создан"
    else
        print_success "Пользователь usdt-app уже существует"
    fi
}

# Клонирование репозитория
setup_application() {
    print_status "Настройка приложения..."
    
    APP_DIR="/home/usdt-app/usdt-miniapp"
    
    # Создаём директорию для приложения
    sudo -u usdt-app mkdir -p $APP_DIR
    
    # Если запускаем впервые, клонируем репозиторий
    if [ ! -d "$APP_DIR/.git" ]; then
        print_status "Клонирование репозитория..."
        # Здесь должен быть ваш реальный репозиторий
        # sudo -u usdt-app git clone YOUR_REPO_URL $APP_DIR
        
        # Временно копируем текущие файлы
        sudo cp -r . $APP_DIR/
        sudo chown -R usdt-app:usdt-app $APP_DIR
    else
        print_status "Обновление репозитория..."
        cd $APP_DIR
        sudo -u usdt-app git pull
    fi
    
    cd $APP_DIR
    
    # Копируем пример конфигурации
    if [ ! -f ".env" ]; then
        sudo -u usdt-app cp env.production .env
        print_warning "Не забудьте настроить переменные окружения в .env файле!"
    fi
    
    print_success "Приложение настроено в $APP_DIR"
}

# Настройка SSL сертификата
setup_ssl() {
    read -p "Введите ваш домен (например, your-domain.com): " DOMAIN
    read -p "Введите ваш email для Let's Encrypt: " EMAIL
    
    if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
        print_error "Домен и email обязательны для настройки SSL"
        return 1
    fi
    
    print_status "Настройка SSL для домена $DOMAIN..."
    
    APP_DIR="/home/usdt-app/usdt-miniapp"
    cd $APP_DIR
    
    # Обновляем конфигурацию nginx
    sudo sed -i "s/your-domain.com/$DOMAIN/g" docker/nginx.prod.conf
    sudo sed -i "s/your-email@domain.com/$EMAIL/g" .env
    sudo sed -i "s/your-domain.com/$DOMAIN/g" .env
    
    # Временно запускаем nginx для получения сертификата
    print_status "Получение SSL сертификата..."
    
    # Создаём временную конфигурацию nginx только для HTTP
    cat > /tmp/nginx-temp.conf << EOF
events {
    worker_connections 1024;
}
http {
    server {
        listen 80;
        server_name $DOMAIN;
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        location / {
            return 200 'SSL setup in progress';
            add_header Content-Type text/plain;
        }
    }
}
EOF
    
    # Запускаем временный nginx и certbot
    sudo docker run -d --name nginx-temp -p 80:80 -v /tmp/nginx-temp.conf:/etc/nginx/nginx.conf:ro -v certbot_data:/var/www/certbot nginx:alpine
    
    # Получаем сертификат
    sudo docker run --rm -v certbot_data:/var/www/certbot -v ssl_certs:/etc/letsencrypt certbot/certbot certonly --webroot --webroot-path=/var/www/certbot --email $EMAIL --agree-tos --no-eff-email -d $DOMAIN
    
    # Останавливаем временный nginx
    sudo docker stop nginx-temp
    sudo docker rm nginx-temp
    
    print_success "SSL сертификат получен для домена $DOMAIN"
}

# Запуск приложения
start_application() {
    print_status "Запуск приложения..."
    
    APP_DIR="/home/usdt-app/usdt-miniapp"
    cd $APP_DIR
    
    # Останавливаем старые контейнеры
    sudo -u usdt-app docker-compose -f docker-compose.prod.yml down
    
    # Собираем и запускаем новые
    sudo -u usdt-app docker-compose -f docker-compose.prod.yml up --build -d
    
    # Ждём запуска
    print_status "Ожидание запуска сервисов..."
    sleep 30
    
    # Проверяем статус
    sudo -u usdt-app docker-compose -f docker-compose.prod.yml ps
    
    print_success "Приложение запущено!"
}

# Настройка systemd службы для автозапуска
setup_systemd() {
    print_status "Настройка автозапуска..."
    
    cat > /tmp/usdt-app.service << EOF
[Unit]
Description=USDT Deposits Management System
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/usdt-app/usdt-miniapp
ExecStart=/usr/local/bin/docker-compose -f docker-compose.prod.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.prod.yml down
User=usdt-app
Group=usdt-app

[Install]
WantedBy=multi-user.target
EOF
    
    sudo mv /tmp/usdt-app.service /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl enable usdt-app.service
    
    print_success "Автозапуск настроен"
}

# Настройка мониторинга
setup_monitoring() {
    print_status "Настройка базового мониторинга..."
    
    # Создаём скрипт проверки здоровья
    cat > /tmp/health-check.sh << 'EOF'
#!/bin/bash
HEALTH_URL="http://localhost/health"
if curl -f -s $HEALTH_URL > /dev/null; then
    echo "$(date): Application is healthy"
else
    echo "$(date): Application is unhealthy"
    # Перезапускаем приложение
    cd /home/usdt-app/usdt-miniapp
    docker-compose -f docker-compose.prod.yml restart
fi
EOF
    
    sudo mv /tmp/health-check.sh /home/usdt-app/health-check.sh
    sudo chmod +x /home/usdt-app/health-check.sh
    sudo chown usdt-app:usdt-app /home/usdt-app/health-check.sh
    
    # Добавляем в crontab
    sudo -u usdt-app crontab -l > /tmp/crontab.bak 2>/dev/null || true
    echo "*/5 * * * * /home/usdt-app/health-check.sh >> /home/usdt-app/health.log 2>&1" >> /tmp/crontab.bak
    sudo -u usdt-app crontab /tmp/crontab.bak
    rm /tmp/crontab.bak
    
    print_success "Мониторинг настроен"
}

# Отображение итоговой информации
show_final_info() {
    print_success "🎉 Развёртывание завершено!"
    echo ""
    echo "📋 Итоговая информация:"
    echo "  🌐 Домен: https://$DOMAIN"
    echo "  📱 Telegram WebApp: https://$DOMAIN"
    echo "  🛠  Админ-панель: https://$DOMAIN/admin"
    echo "  🔌 API: https://$DOMAIN/api/v1"
    echo "  📚 Документация API: https://$DOMAIN/api/docs"
    echo ""
    echo "📝 Что нужно сделать дальше:"
    echo "  1. Настройте переменные окружения в /home/usdt-app/usdt-miniapp/.env"
    echo "  2. Создайте TRON кошелёк и добавьте адрес в POOL_WALLET_ADDRESS"
    echo "  3. Настройте Telegram бота с WebApp URL: https://$DOMAIN"
    echo "  4. Проверьте логи: docker-compose -f docker-compose.prod.yml logs"
    echo ""
    echo "🔧 Полезные команды:"
    echo "  • Перезапуск: sudo systemctl restart usdt-app"
    echo "  • Логи: sudo -u usdt-app docker-compose -f docker-compose.prod.yml logs"
    echo "  • Статус: sudo -u usdt-app docker-compose -f docker-compose.prod.yml ps"
    echo ""
    print_warning "Не забудьте настроить все переменные окружения в .env файле!"
}

# Главная функция
main() {
    echo "🚀 USDT Deposits Management System - Production Deployment"
    echo "============================================================"
    
    check_sudo
    check_dependencies
    setup_firewall
    create_app_user
    setup_application
    
    # Спрашиваем, нужно ли настраивать SSL
    read -p "Настроить SSL сертификат? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        setup_ssl
    else
        print_warning "SSL не настроен. Приложение будет доступно только по HTTP."
        DOMAIN="localhost"
    fi
    
    start_application
    setup_systemd
    setup_monitoring
    show_final_info
}

# Проверяем, что скрипт вызван напрямую
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
