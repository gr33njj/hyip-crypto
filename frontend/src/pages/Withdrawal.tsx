import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui';
import { ArrowUpFromLine } from 'lucide-react';

export const WithdrawalPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-primary safe-area-top safe-area-bottom pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-primary z-10 border-b border-gray-100 p-4">
        <div className="flex items-center gap-3">
          <ArrowUpFromLine className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-primary">Вывод средств</h1>
            <p className="text-sm text-secondary">USDT (TRC-20)</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <Card variant="telegram">
          <CardHeader>
            <CardTitle>Скоро</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-secondary">
              Функция вывода средств находится в разработке
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WithdrawalPage;
