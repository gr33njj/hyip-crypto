#!/bin/bash

# Скрипт для первоначальной настройки проекта USDT Deposits Management System

set -e

echo "🚀 Настройка проекта USDT Deposits Management System..."

# Функция для вывода цветного текста
print_status() {
    echo -e "\033[1;34m[INFO]\033[0m $1"
}

print_success() {
    echo -e "\033[1;32m[SUCCESS]\033[0m $1"
}

print_error() {
    echo -e "\033[1;31m[ERROR]\033[0m $1"
}

print_warning() {
    echo -e "\033[1;33m[WARNING]\033[0m $1"
}

# Проверка зависимостей
check_dependencies() {
    print_status "Проверка зависимостей..."
    
    commands=("node" "npm" "docker" "docker-compose")
    missing_commands=()
    
    for cmd in "${commands[@]}"; do
        if ! command -v $cmd &> /dev/null; then
            missing_commands+=($cmd)
        fi
    done
    
    if [ ${#missing_commands[@]} -ne 0 ]; then
        print_error "Отсутствуют следующие зависимости: ${missing_commands[*]}"
        print_status "Пожалуйста, установите их перед продолжением"
        exit 1
    fi
    
    print_success "Все зависимости установлены"
}

# Создание файлов окружения
setup_env_files() {
    print_status "Создание файлов окружения..."
    
    # Backend .env
    if [ ! -f "backend/.env" ]; then
        cp backend/env.example backend/.env
        print_success "Создан backend/.env"
        print_warning "Не забудьте настроить переменные окружения в backend/.env"
    else
        print_status "backend/.env уже существует"
    fi
    
    # Frontend .env
    if [ ! -f "frontend/.env" ]; then
        cat > frontend/.env << EOF
REACT_APP_API_URL=http://localhost:3000/api/v1
REACT_APP_ENVIRONMENT=development
EOF
        print_success "Создан frontend/.env"
    else
        print_status "frontend/.env уже существует"
    fi
    
    # Admin Panel .env
    if [ ! -f "admin-panel/.env" ]; then
        cat > admin-panel/.env << EOF
REACT_APP_API_URL=http://localhost:3000/api/v1
REACT_APP_ENVIRONMENT=development
EOF
        print_success "Создан admin-panel/.env"
    else
        print_status "admin-panel/.env уже существует"
    fi
}

# Установка зависимостей Node.js
install_dependencies() {
    print_status "Установка зависимостей Node.js..."
    
    # Backend
    if [ -d "backend" ]; then
        print_status "Установка зависимостей backend..."
        cd backend
        npm install
        cd ..
        print_success "Зависимости backend установлены"
    fi
    
    # Frontend
    if [ -d "frontend" ]; then
        print_status "Установка зависимостей frontend..."
        cd frontend
        npm install
        cd ..
        print_success "Зависимости frontend установлены"
    fi
    
    # Admin Panel
    if [ -d "admin-panel" ]; then
        print_status "Установка зависимостей admin-panel..."
        cd admin-panel
        npm install
        cd ..
        print_success "Зависимости admin-panel установлены"
    fi
}

# Создание директорий
create_directories() {
    print_status "Создание необходимых директорий..."
    
    directories=(
        "backend/logs"
        "docker/ssl"
        "docs/api"
        "docs/deployment"
    )
    
    for dir in "${directories[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            print_success "Создана директория: $dir"
        fi
    done
}

# Настройка базы данных
setup_database() {
    print_status "Настройка базы данных..."
    
    # Запуск PostgreSQL в Docker
    print_status "Запуск PostgreSQL..."
    docker-compose up -d postgres
    
    # Ожидание готовности базы данных
    print_status "Ожидание готовности базы данных..."
    sleep 10
    
    # Выполнение миграций
    print_status "Выполнение миграций..."
    cd backend
    npm run migrate
    cd ..
    
    print_success "База данных настроена"
}

# Генерация документации
generate_docs() {
    print_status "Генерация документации..."
    
    cat > README.md << 'EOF'
# USDT Deposits Management System

Система управления депозитами USDT (TRC-20) с Telegram WebApp и административной панелью.

## Быстрый старт

1. Установите зависимости:
   ```bash
   ./scripts/setup.sh
   ```

2. Запустите в development режиме:
   ```bash
   ./scripts/dev.sh
   ```

3. Запустите в production режиме:
   ```bash
   docker-compose up -d
   ```

## URLs

- **Frontend (WebApp)**: http://localhost:3001
- **Admin Panel**: http://localhost:3002  
- **API**: http://localhost:3000/api/v1
- **API Docs**: http://localhost:3000/api/docs

## Архитектура

- **Backend**: Node.js/Express + PostgreSQL
- **Frontend**: React Telegram WebApp
- **Admin Panel**: React SPA
- **Telegram Bot**: Уведомления
- **Blockchain**: TronWeb для USDT TRC-20

## Разработка

См. документацию в папке `docs/`

EOF
    
    print_success "Документация создана"
}

# Проверка конфигурации
validate_config() {
    print_status "Проверка конфигурации..."
    
    # Проверка портов
    ports=(3000 3001 3002 5432 6379)
    for port in "${ports[@]}"; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            print_warning "Порт $port уже используется"
        fi
    done
    
    print_success "Конфигурация проверена"
}

# Главная функция
main() {
    echo "🎯 USDT Deposits Management System Setup"
    echo "========================================"
    
    check_dependencies
    create_directories
    setup_env_files
    install_dependencies
    generate_docs
    validate_config
    
    if [ "$1" == "--with-db" ]; then
        setup_database
    fi
    
    echo ""
    print_success "🎉 Настройка завершена!"
    echo ""
    echo "📖 Следующие шаги:"
    echo "   1. Настройте переменные окружения в backend/.env"
    echo "   2. Запустите проект: ./scripts/dev.sh"
    echo "   3. Откройте http://localhost:3001 для WebApp"
    echo "   4. Откройте http://localhost:3002 для админ-панели"
    echo ""
    print_warning "Не забудьте настроить Telegram бота и получить токены!"
}

# Запуск
main "$@"
