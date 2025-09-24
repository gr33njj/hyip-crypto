import React, { useEffect, useState } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Alert,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AccountBalance,
  People,
  Warning,
  CheckCircle,
  Schedule,
  Cancel,
} from '@mui/icons-material';
import { DashboardStats } from '../types';
import { adminApi } from '../services/api';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, color, trend }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography color="text.secondary" variant="h6" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" component="div" color={`${color}.main`}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
          {trend && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              {trend.isPositive ? (
                <TrendingUp color="success" fontSize="small" />
              ) : (
                <TrendingDown color="error" fontSize="small" />
              )}
              <Typography
                variant="caption"
                color={trend.isPositive ? 'success.main' : 'error.main'}
                sx={{ ml: 0.5 }}
              >
                {trend.value}%
              </Typography>
            </Box>
          )}
        </Box>
        <Box sx={{ color: `${color}.main` }}>{icon}</Box>
      </Box>
    </CardContent>
  </Card>
);

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getDashboard();
      if (response.success) {
        setStats(response.data);
      }
    } catch (err: any) {
      setError(adminApi.handleError(err));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <LinearProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Загрузка данных...
        </Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!stats) {
    return null;
  }

  const { statistics, pending_operations, pool_info, alerts } = stats;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Дашборд
      </Typography>

      {/* Алерты */}
      {alerts.length > 0 && (
        <Box sx={{ mb: 3 }}>
          {alerts.map((alert, index) => (
            <Alert
              key={index}
              severity={alert.type}
              sx={{ mb: 1 }}
              icon={<Warning />}
            >
              <Typography variant="subtitle1">{alert.message}</Typography>
              <Typography variant="body2">{alert.details}</Typography>
            </Alert>
          ))}
        </Box>
      )}

      {/* Основная статистика */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Всего пользователей"
            value={statistics.users.total_users}
            subtitle={`Активных: ${statistics.users.active_users}`}
            icon={<People />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pending операций"
            value={pending_operations.deposits_count + pending_operations.withdrawals_count}
            subtitle="Требуют внимания"
            icon={<Schedule />}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Баланс пула"
            value={`${parseFloat(pool_info.balance).toFixed(2)} USDT`}
            subtitle={`Свободно: ${parseFloat(pool_info.free_balance).toFixed(2)}`}
            icon={<AccountBalance />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Коэффициент"
            value={`${(parseFloat(pool_info.ratio) * 100).toFixed(1)}%`}
            subtitle="Свободный баланс / Общий"
            icon={<TrendingUp />}
            color={parseFloat(pool_info.ratio) > 0.3 ? 'success' : 'error'}
          />
        </Grid>
      </Grid>

      {/* Операции */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Депозиты */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Депозиты
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Всего:</Typography>
                <Chip label={statistics.deposits.total_deposits} size="small" />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Pending:</Typography>
                <Chip label={statistics.deposits.pending_count} color="warning" size="small" />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Одобрено:</Typography>
                <Chip label={statistics.deposits.approved_count} color="success" size="small" />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Отклонено:</Typography>
                <Chip label={statistics.deposits.rejected_count} color="error" size="small" />
              </Box>
              <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                <Typography variant="body2" color="text.secondary">
                  Одобренная сумма:
                </Typography>
                <Typography variant="h6" color="success.main">
                  {parseFloat(statistics.deposits.approved_amount).toFixed(2)} USDT
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Выводы */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Выводы
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Всего:</Typography>
                <Chip label={statistics.withdrawals.total_withdrawals} size="small" />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Pending:</Typography>
                <Chip label={statistics.withdrawals.pending_count} color="warning" size="small" />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Выплачено:</Typography>
                <Chip label={statistics.withdrawals.paid_count} color="success" size="small" />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Отклонено:</Typography>
                <Chip label={statistics.withdrawals.rejected_count} color="error" size="small" />
              </Box>
              <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                <Typography variant="body2" color="text.secondary">
                  Выплаченная сумма:
                </Typography>
                <Typography variant="h6" color="primary.main">
                  {parseFloat(statistics.withdrawals.paid_amount).toFixed(2)} USDT
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Начисления */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Начисления
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Всего:</Typography>
                <Chip label={statistics.accruals.total_accruals} size="small" />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Ручные:</Typography>
                <Chip label={statistics.accruals.manual_count} size="small" />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Проценты:</Typography>
                <Chip label={statistics.accruals.interest_count} color="primary" size="small" />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Бонусы:</Typography>
                <Chip label={statistics.accruals.bonus_count} color="secondary" size="small" />
              </Box>
              <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                <Typography variant="body2" color="text.secondary">
                  Общая сумма:
                </Typography>
                <Typography variant="h6" color="secondary.main">
                  {parseFloat(statistics.accruals.total_amount).toFixed(2)} USDT
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Быстрые действия */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Требуют внимания
        </Typography>
        <Grid container spacing={2}>
          {pending_operations.deposits_count > 0 && (
            <Grid item>
              <Chip
                label={`${pending_operations.deposits_count} депозитов на проверке`}
                color="warning"
                icon={<Schedule />}
                clickable
                onClick={() => window.location.href = '/deposits?status=pending'}
              />
            </Grid>
          )}
          {pending_operations.withdrawals_count > 0 && (
            <Grid item>
              <Chip
                label={`${pending_operations.withdrawals_count} выводов на сумму ${parseFloat(pending_operations.withdrawals_amount).toFixed(2)} USDT`}
                color="error"
                icon={<Warning />}
                clickable
                onClick={() => window.location.href = '/withdrawals?status=pending'}
              />
            </Grid>
          )}
          {pending_operations.deposits_count === 0 && pending_operations.withdrawals_count === 0 && (
            <Grid item>
              <Chip
                label="Все операции обработаны"
                color="success"
                icon={<CheckCircle />}
              />
            </Grid>
          )}
        </Grid>
      </Paper>
    </Container>
  );
};
