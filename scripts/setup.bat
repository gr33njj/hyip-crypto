@echo off
setlocal enabledelayedexpansion

echo 🚀 Настройка проекта USDT Deposits Management System...

:: Проверка Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js не установлен
    echo Пожалуйста, установите Node.js с https://nodejs.org/
    pause
    exit /b 1
)

:: Проверка npm
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm не найден
    pause
    exit /b 1
)

:: Проверка Docker
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker не установлен
    echo Пожалуйста, установите Docker Desktop
    pause
    exit /b 1
)

echo ✅ Все зависимости найдены

:: Создание .env файлов
echo 📝 Создание файлов окружения...

if not exist "backend\.env" (
    copy "backend\env.example" "backend\.env" >nul
    echo ✅ Создан backend\.env
) else (
    echo ℹ️  backend\.env уже существует
)

if not exist "frontend\.env" (
    echo REACT_APP_API_URL=http://localhost:3000/api/v1 > "frontend\.env"
    echo REACT_APP_ENVIRONMENT=development >> "frontend\.env"
    echo ✅ Создан frontend\.env
) else (
    echo ℹ️  frontend\.env уже существует
)

:: Создание директорий
echo 📁 Создание директорий...
if not exist "backend\logs" mkdir "backend\logs"
if not exist "docker\ssl" mkdir "docker\ssl"
if not exist "docs\api" mkdir "docs\api"
if not exist "docs\deployment" mkdir "docs\deployment"

:: Установка зависимостей
echo 📦 Установка зависимостей...

echo - Backend...
cd backend
call npm install
if errorlevel 1 (
    echo ❌ Ошибка установки зависимостей backend
    pause
    exit /b 1
)
cd ..

echo - Frontend...
cd frontend
call npm install
if errorlevel 1 (
    echo ❌ Ошибка установки зависимостей frontend
    pause
    exit /b 1
)
cd ..

echo.
echo 🎉 Настройка завершена!
echo.
echo 📖 Следующие шаги:
echo    1. Настройте переменные окружения в backend\.env
echo    2. Запустите проект: scripts\dev.bat
echo    3. Откройте http://localhost:3001 для WebApp
echo    4. Откройте http://localhost:3002 для админ-панели
echo.
echo ⚠️  Не забудьте настроить Telegram бота и получить токены!
echo.
pause
