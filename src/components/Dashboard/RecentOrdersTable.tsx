interface Order {
  id: string;
  customer: string;
  tickets: number;
  amount: string;
  status: 'completed' | 'pending' | 'cancelled';
  date: string;
}

const RecentOrdersTable: React.FC = () => {
  const orders: Order[] = [
    { id: 'ORD-001', customer: 'John Doe', tickets: 2, amount: '₦5,000', status: 'completed', date: '2024-12-22' },
    { id: 'ORD-002', customer: 'Jane Smith', tickets: 4, amount: '₦10,000', status: 'completed', date: '2024-12-21' },
    { id: 'ORD-003', customer: 'Mike Johnson', tickets: 1, amount: '₦2,500', status: 'pending', date: '2024-12-20' },
    { id: 'ORD-004', customer: 'Sarah Williams', tickets: 3, amount: '₦7,500', status: 'completed', date: '2024-12-19' },
    { id: 'ORD-005', customer: 'David Brown', tickets: 2, amount: '₦5,000', status: 'cancelled', date: '2024-12-18' },
  ];

  const getStatusColor = (status: Order['status']) => {
    switch(status) {
      case 'completed': return 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500';
      case 'pending': return 'bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-500';
      case 'cancelled': return 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500';
      default: return 'bg-gray-50 text-gray-600';
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">Recent Orders</h3>
          <button className="text-sm font-medium text-brand-500 hover:text-brand-600">View all →</button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-100 dark:border-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Order ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Tickets</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white/90">{order.id}</td>
                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{order.customer}</td>
                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{order.tickets}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white/90">{order.amount}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button className="text-brand-500 hover:text-brand-600" title="View details">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecentOrdersTable;