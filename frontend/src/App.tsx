import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

// Services
import { telegramService, useTelegram } from './services/telegram';
import { TypedApiService } from './services/api';

// Components
import { LoadingScreen } from './components/ui/Loading';
import { Navigation } from './components/Navigation';

// Pages
import Dashboard from './pages/Dashboard';
import DepositPage from './pages/Deposit';
import WithdrawalPage from './pages/Withdrawal';
import HistoryPage from './pages/History';
import { ErrorBoundary } from './components/ErrorBoundary';

// Styles
import './index.css';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

// Main App component
const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AppContent />
        </Router>
        <Toaster 
          position="top-center"
          toastOptions={{
            duration: 4000,
            className: 'toast',
            style: {
              background: 'var(--tg-theme-secondary-bg-color)',
              color: 'var(--tg-theme-text-color)',
              border: '1px solid var(--tg-theme-hint-color)',
            },
          }}
        />
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

const AppContent: React.FC = () => {
  const { webApp, isReady, user } = useTelegram();
  const [isLoading, setIsLoading] = useState(true);
  const [isApiAvailable, setIsApiAvailable] = useState(false);
  const [currentPath, setCurrentPath] = useState('/');

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Проверяем доступность API
        const apiAvailable = await TypedApiService.healthCheck();
        setIsApiAvailable(apiAvailable);

        if (!apiAvailable) {
          console.warn('⚠️ API недоступно');
        }

        // Устанавливаем тему
        webApp.applyTheme();

        // Настраиваем WebApp
        if (isReady) {
          webApp.enableClosingConfirmation();
          
          // Логируем информацию об окружении
          console.log('🚀 App initialized:', webApp.getEnvironmentInfo());
        }

        setIsLoading(false);
      } catch (error) {
        console.error('❌ Ошибка инициализации приложения:', error);
        setIsLoading(false);
      }
    };

    initializeApp();
  }, [webApp, isReady]);

  // Обработка изменения пути
  useEffect(() => {
    const path = window.location.pathname;
    setCurrentPath(path);

    // Настраиваем кнопку "Назад" для определённых страниц
    if (path !== '/') {
      webApp.showBackButton(() => {
        window.history.back();
      });
    } else {
      webApp.hideBackButton();
    }

    return () => {
      webApp.hideBackButton();
    };
  }, [webApp]);

  if (isLoading) {
    return <LoadingScreen text="Инициализация приложения..." />;
  }

  if (!isApiAvailable) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-primary mb-2">
            Сервис временно недоступен
          </h1>
          <p className="text-secondary mb-4">
            Мы работаем над устранением проблемы. Попробуйте позже.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="btn btn-primary"
          >
            Перезагрузить
          </button>
        </div>
      </div>
    );
  }

  if (!isReady || !user) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">📱</div>
          <h1 className="text-xl font-bold text-primary mb-2">
            Запустите в Telegram
          </h1>
          <p className="text-secondary">
            Это приложение работает только в Telegram WebApp
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary">
      <AnimatePresence mode="wait" initial={false}>
        <Routes>
          <Route 
            path="/" 
            element={
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <Dashboard />
              </motion.div>
            } 
          />
          <Route 
            path="/deposit" 
            element={
              <motion.div
                key="deposit"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <DepositPage />
              </motion.div>
            } 
          />
          <Route 
            path="/withdrawal" 
            element={
              <motion.div
                key="withdrawal"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <WithdrawalPage />
              </motion.div>
            } 
          />
          <Route 
            path="/history" 
            element={
              <motion.div
                key="history"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <HistoryPage />
              </motion.div>
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>

      {/* Нижняя навигация */}
      <Navigation currentPath={currentPath} />
    </div>
  );
};

export default App;
