@echo off
setlocal enabledelayedexpansion

echo 🚀 Запуск USDT Deposits в режиме разработки...

:: Проверка .env файлов
if not exist "backend\.env" (
    echo ❌ Файл backend\.env не найден
    echo Запустите scripts\setup.bat сначала
    pause
    exit /b 1
)

:: Запуск PostgreSQL
echo 🗄️  Запуск PostgreSQL...
docker-compose up -d postgres
if errorlevel 1 (
    echo ❌ Ошибка запуска PostgreSQL
    pause
    exit /b 1
)

:: Ожидание готовности базы данных
echo ⏳ Ожидание готовности базы данных...
timeout /t 10 /nobreak >nul

:: Выполнение миграций
echo 🔄 Выполнение миграций базы данных...
cd backend
call npm run migrate
if errorlevel 1 (
    echo ❌ Ошибка выполнения миграций
    pause
    exit /b 1
)
cd ..

:: Открытие новых окон терминала для каждого сервиса
echo 🚀 Запуск сервисов...

:: Backend
start "USDT Backend" cmd /k "cd backend && npm run dev"

:: Frontend
start "USDT Frontend" cmd /k "cd frontend && npm start"

echo.
echo 🎉 Все сервисы запущены!
echo.
echo 🌐 URLs:
echo    - WebApp (Frontend): http://localhost:3000
echo    - API Backend: http://localhost:3000/api/v1
echo    - API Docs: http://localhost:3000/api/docs
echo.
echo ⚠️  Закройте окна терминалов для остановки сервисов
echo.
pause
