import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui';
import { History } from 'lucide-react';

export const HistoryPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-primary safe-area-top safe-area-bottom pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-primary z-10 border-b border-gray-100 p-4">
        <div className="flex items-center gap-3">
          <History className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-primary">История</h1>
            <p className="text-sm text-secondary">Все операции</p>
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
              История операций находится в разработке
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HistoryPage;
