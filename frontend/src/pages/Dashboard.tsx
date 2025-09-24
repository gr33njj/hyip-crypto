import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent, Button, Loading } from '../components/ui';
import { TypedApiService, handleApiError } from '../services/api';
import { useTelegram } from '../services/telegram';
import { Balance, UserProfile } from '../types';
import { 
  Wallet, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  Copy,
  RefreshCw
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { webApp } = useTelegram();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      setError(null);

      const response = await TypedApiService.getUserProfile();
      if (response.success && response.data) {
        setProfile(response.data);
      }
    } catch (err) {
      setError(handleApiError(err));
      console.error('Ошибка загрузки профиля:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleRefresh = () => {
    webApp.hapticFeedback('selection');
    loadProfile(true);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      webApp.hapticFeedback('notification', 'success');
      webApp.showAlert('Скопировано в буфер обмена');
    } catch (err) {
      console.error('Ошибка копирования:', err);
    }
  };

  const formatBalance = (balance: string): string => {
    const num = parseFloat(balance);
    return num.toFixed(6).replace(/\.?0+$/, '');
  };

  const getBalanceColor = (balance: string): string => {
    const num = parseFloat(balance);
    if (num > 0) return 'text-success-600';
    if (num < 0) return 'text-error-600';
    return 'text-secondary';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <Loading size="lg" text="Загрузка профиля..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-primary p-4 flex items-center justify-center">
        <Card variant="telegram" className="w-full max-w-md text-center">
          <CardContent>
            <h3 className="text-lg font-semibold text-error-600 mb-2">Ошибка загрузки</h3>
            <p className="text-secondary mb-4">{error}</p>
            <Button onClick={() => loadProfile()} variant="primary" fullWidth>
              Попробовать снова
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-primary p-4 flex items-center justify-center">
        <Card variant="telegram" className="w-full max-w-md text-center">
          <CardContent>
            <h3 className="text-lg font-semibold text-primary mb-2">Данные не найдены</h3>
            <p className="text-secondary mb-4">Не удалось загрузить информацию о профиле</p>
            <Button onClick={() => loadProfile()} variant="primary" fullWidth>
              Обновить
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary safe-area-top safe-area-bottom">
      {/* Header */}
      <div className="sticky top-0 bg-primary z-10 border-b border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-primary">Мой кошелёк</h1>
            <p className="text-sm text-secondary">
              Добро пожаловать, {profile.user.first_name || profile.user.username}!
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            icon={<RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />}
          >
            {refreshing ? 'Обновление...' : 'Обновить'}
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Основной баланс */}
        <Card variant="telegram">
          <CardHeader>
            <CardTitle size="lg" className="flex items-center gap-2">
              <Wallet className="w-6 h-6" />
              Общий баланс
            </CardTitle>
          </CardHeader>
          <CardContent>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              <div className="text-3xl font-bold text-primary mb-2">
                {formatBalance(profile.balance.total_balance)} USDT
              </div>
              <div className="text-sm text-secondary">
                ≈ ${formatBalance(profile.balance.total_balance)} USD
              </div>
            </motion.div>
          </CardContent>
        </Card>

        {/* Детализация баланса */}
        <div className="grid grid-cols-1 gap-3">
          <Card variant="telegram">
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-success-100 rounded-lg">
                    <ArrowDownRight className="w-5 h-5 text-success-600" />
                  </div>
                  <div>
                    <p className="font-medium text-primary">Депозиты</p>
                    <p className="text-sm text-secondary">Подтверждённые</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-success-600">
                    +{formatBalance(profile.balance.on_chain_balance)} USDT
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="telegram">
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-medium text-primary">Начисления</p>
                    <p className="text-sm text-secondary">Проценты и бонусы</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${getBalanceColor(profile.balance.accrued_balance)}`}>
                    {parseFloat(profile.balance.accrued_balance) >= 0 ? '+' : ''}
                    {formatBalance(profile.balance.accrued_balance)} USDT
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="telegram">
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-warning-100 rounded-lg">
                    <ArrowUpRight className="w-5 h-5 text-warning-600" />
                  </div>
                  <div>
                    <p className="font-medium text-primary">Выводы</p>
                    <p className="text-sm text-secondary">Выплаченные средства</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-warning-600">
                    -{formatBalance(profile.balance.withdrawn_balance)} USDT
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Статистика */}
        <Card variant="telegram">
          <CardHeader>
            <CardTitle>Статистика</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{profile.stats.approved_deposits}</p>
                <p className="text-sm text-secondary">Депозитов</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{profile.stats.paid_withdrawals}</p>
                <p className="text-sm text-secondary">Выводов</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{profile.stats.total_accruals}</p>
                <p className="text-sm text-secondary">Начислений</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">
                  {Math.ceil((Date.now() - new Date(profile.stats.registration_date).getTime()) / (1000 * 60 * 60 * 24))}
                </p>
                <p className="text-sm text-secondary">Дней с нами</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Информация о пользователе */}
        <Card variant="telegram">
          <CardHeader>
            <CardTitle>Информация профиля</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-secondary">Telegram ID:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">{profile.user.telegram_id}</span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => copyToClipboard(profile.user.telegram_id.toString())}
                    icon={<Copy className="w-3 h-3" />}
                  />
                </div>
              </div>
              
              {profile.user.username && (
                <div className="flex justify-between">
                  <span className="text-secondary">Username:</span>
                  <span className="font-medium">@{profile.user.username}</span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-secondary">Регистрация:</span>
                <span className="font-medium">
                  {new Date(profile.user.created_at).toLocaleDateString('ru-RU')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
