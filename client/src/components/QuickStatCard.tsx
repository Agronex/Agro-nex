import React from 'react';
import Card from './Card';

interface QuickStatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  change?: string;
  changeType?: 'increase' | 'decrease';
}

const QuickStatCard: React.FC<QuickStatCardProps> = ({
  label,
  value,
  icon,
  change,
  changeType = 'increase',
}) => {
  const changeColor = changeType === 'increase' ? 'text-green-600' : 'text-red-600';

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
        <div className="p-3 bg-gray-100 rounded-lg">
          {icon}
        </div>
      </div>
      {change && (
        <div className="mt-4 text-sm text-gray-600">
          <span className={changeColor}>
            {changeType === 'increase' ? '↑' : '↓'} {change}
          </span>
        </div>
      )}
    </Card>
  );
};

export default React.memo(QuickStatCard);
