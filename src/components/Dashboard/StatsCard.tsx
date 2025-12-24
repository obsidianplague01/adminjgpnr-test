interface StatsCardProps {
  title: string;
  value: string;
  change: string;
  icon: React.ReactNode;
  trend: 'up' | 'down';
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, change, icon, trend }) => {
  const trendColor = trend === 'up' ? 'text-success-600 dark:text-success-500' : 'text-error-600 dark:text-error-500';
  const bgColor = trend === 'up' ? 'bg-success-50 dark:bg-success-500/15' : 'bg-error-50 dark:bg-error-500/15';
  
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-500/20">
          {icon}
        </div>
        <div className={`rounded-full px-2.5 py-1 text-xs font-medium ${bgColor} ${trendColor}`}>
          {trend === 'up' ? '↑' : '↓'} {change}
        </div>
      </div>
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white/90">{value}</h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{title}</p>
    </div>
  );
};

export default StatsCard;