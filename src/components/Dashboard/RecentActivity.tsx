interface Activity {
  id: number;
  type: 'order' | 'scan' | 'customer' | 'newsletter' | 'payment';
  message: string;
  time: string;
  icon: string;
}

const RecentActivity: React.FC = () => {
  const activities: Activity[] = [
    { id: 1, type: 'order', message: 'New order #ORD-005 received', time: '2 minutes ago', icon: '🎫' },
    { id: 2, type: 'scan', message: 'Ticket JGPNR-2024-100 scanned', time: '15 minutes ago', icon: '📱' },
    { id: 3, type: 'customer', message: 'New customer registered', time: '1 hour ago', icon: '👤' },
    { id: 4, type: 'newsletter', message: 'Campaign sent to 234 subscribers', time: '2 hours ago', icon: '📧' },
    { id: 5, type: 'payment', message: 'Payment received ₦10,000', time: '3 hours ago', icon: '💰' },
    { id: 6, type: 'order', message: 'Order #ORD-004 completed', time: '4 hours ago', icon: '✅' },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">Recent Activity</h3>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xl dark:bg-gray-800">
                {activity.icon}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900 dark:text-white/90">{activity.message}</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RecentActivity;