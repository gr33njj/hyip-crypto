import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';

import { Card, CardHeader, CardTitle, CardContent, Button, Input, Loading } from '../components/ui';
import { TypedApiService, handleApiError } from '../services/api';
import { useTelegram } from '../services/telegram';
import { PoolInfo, DepositFormData } from '../types';
import { 
  Wallet, 
  Copy, 
  QrCode,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';

export const DepositPage: React.FC = () => {
  const { webApp } = useTelegram();
  const [poolInfo, setPoolInfo] = useState<PoolInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [showQR, setShowQR] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm<DepositFormData>();

  const txHash = watch('tx_hash');

  useEffect(() => {
    loadPoolInfo();
  }, []);

  const loadPoolInfo = async () => {
    try {
      const response = await TypedApiService.getPoolInfo();
      if (response.success && response.data) {
        setPoolInfo(response.data);
        
        // Генерируем QR код для адреса
        try {
          const qrUrl = await QRCode.toDataURL(response.data.pool_address, {
            width: 256,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
          setQrDataUrl(qrUrl);
        } catch (err) {
          console.error('Ошибка генерации QR кода:', err);
        }
      }
    } catch (err) {
      console.error('Ошибка загрузки информации о пуле:', err);
      toast.error(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: DepositFormData) => {
    try {
      setSubmitting(true);
      webApp.hapticFeedback('notification', 'success');

      const response = await TypedApiService.submitDeposit(data);
      
      if (response.success) {
        toast.success(response.message || 'Депозит отправлен на проверку');
        reset();
        
        // Показываем подтверждение
        webApp.showAlert(
          'Ваш депозит отправлен на проверку администратором. Вы получите уведомление о результате.',
          () => {
            // Возвращаемся на главную страницу
            window.history.back();
          }
        );
      }
    } catch (err) {
      console.error('Ошибка отправки депозита:', err);
      toast.error(handleApiError(err));
      webApp.hapticFeedback('notification', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      webApp.hapticFeedback('notification', 'success');
      toast.success(`${label} скопирован`);
    } catch (err) {
      console.error('Ошибка копирования:', err);
      toast.error('Не удалось скопировать');
    }
  };

  const openTronScan = (address: string) => {
    const url = `https://tronscan.org/#/address/${address}`;
    window.open(url, '_blank');
    webApp.hapticFeedback('selection');
  };

  const toggleQR = () => {
    setShowQR(!showQR);
    webApp.hapticFeedback('selection');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <Loading size="lg" text="Загрузка информации..." />
      </div>
    );
  }

  if (!poolInfo) {
    return (
      <div className="min-h-screen bg-primary p-4 flex items-center justify-center">
        <Card variant="telegram" className="w-full max-w-md text-center">
          <CardContent>
            <h3 className="text-lg font-semibold text-error-600 mb-2">Ошибка загрузки</h3>
            <p className="text-secondary mb-4">Не удалось получить информацию о депозитах</p>
            <Button onClick={loadPoolInfo} variant="primary" fullWidth>
              Попробовать снова
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary safe-area-top safe-area-bottom pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-primary z-10 border-b border-gray-100 p-4">
        <div className="flex items-center gap-3">
          <Wallet className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-primary">Пополнение</h1>
            <p className="text-sm text-secondary">USDT (TRC-20)</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Инструкции */}
        <Card variant="telegram">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              Как пополнить баланс
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {poolInfo.instructions.ru.map((instruction, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {index + 1}
                  </div>
                  <p className="text-sm text-primary">{instruction}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Адрес пула */}
        <Card variant="telegram">
          <CardHeader>
            <CardTitle>Адрес для перевода</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-secondary mb-2">TRON адрес (TRC-20):</p>
                <div className="bg-secondary rounded-lg p-3">
                  <p className="font-mono text-sm text-primary break-all">
                    {poolInfo.pool_address}
                  </p>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => copyToClipboard(poolInfo.pool_address, 'Адрес')}
                    icon={<Copy className="w-4 h-4" />}
                    fullWidth
                  >
                    Копировать
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={toggleQR}
                    icon={<QrCode className="w-4 h-4" />}
                  >
                    {showQR ? 'Скрыть QR' : 'QR код'}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openTronScan(poolInfo.pool_address)}
                    icon={<ExternalLink className="w-4 h-4" />}
                  >
                    TronScan
                  </Button>
                </div>
              </div>

              {/* QR код */}
              {showQR && qrDataUrl && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-center"
                >
                  <img 
                    src={qrDataUrl} 
                    alt="QR код адреса" 
                    className="mx-auto rounded-lg shadow-md"
                    style={{ maxWidth: '200px' }}
                  />
                  <p className="text-xs text-secondary mt-2">
                    Отсканируйте QR код в кошельке
                  </p>
                </motion.div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Важная информация */}
        <Card variant="telegram">
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-warning-600">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">Важно</span>
              </div>
              <div className="space-y-2 text-sm text-primary">
                <p>• Отправляйте только USDT по сети TRC-20</p>
                <p>• Минимальная сумма: {poolInfo.min_amount} USDT</p>
                <p>• Требуется {poolInfo.confirmations_required} подтверждений</p>
                <p>• Время зачисления: 5-30 минут</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Форма отправки транзакции */}
        <Card variant="telegram">
          <CardHeader>
            <CardTitle>Подтверждение перевода</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Hash транзакции"
                placeholder="Вставьте hash транзакции"
                error={errors.tx_hash?.message}
                helperText="Скопируйте hash из вашего кошелька после отправки"
                variant="telegram"
                {...register('tx_hash', {
                  required: 'Hash транзакции обязателен',
                  pattern: {
                    value: /^[a-fA-F0-9]{64}$/,
                    message: 'Неверный формат hash (должен содержать 64 символа)'
                  }
                })}
              />

              {txHash && txHash.length === 64 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-success-50 border border-success-200 rounded-lg p-3"
                >
                  <div className="flex items-center gap-2 text-success-700">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Hash принят</span>
                  </div>
                  <p className="text-xs text-success-600 mt-1">
                    Транзакция будет проверена администратором
                  </p>
                </motion.div>
              )}

              <Button
                type="submit"
                variant="telegram"
                fullWidth
                loading={submitting}
                disabled={!txHash || txHash.length !== 64}
              >
                {submitting ? 'Отправка...' : 'Подтвердить депозит'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DepositPage;
