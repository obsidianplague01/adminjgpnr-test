// src/pages/Dashboard/Home.tsx
import { useNavigate } from "react-router-dom";
import PageMeta from "../../components/common/PageMeta";
import StatsCard from "../../components/Dashboard/StatsCard";
import RecentActivity from "../../components/Dashboard/RecentActivity";
import QuickActions from "../../components/Dashboard/QuickActions";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";


interface Order {
  id: string;
  customer: string;
  tickets: number;
  amount: string;
  status: "completed" | "pending" | "cancelled";
  date: string;
}

export default function Home() {
  const navigate = useNavigate();

  const stats = [
    {
      title: "Total Revenue",
      value: "₦125,000",
      change: "12%",
      trend: "up" as const,
      icon: (
        <svg
          className="h-6 w-6 text-amber-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      title: "Active Tickets",
      value: "234",
      change: "8%",
      trend: "up" as const,
      icon: (
        <svg
          className="h-6 w-6 text-amber-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
          />
        </svg>
      ),
    },
    {
      title: "Total Customers",
      value: "156",
      change: "15%",
      trend: "up" as const,
      icon: (
        <svg
          className="h-6 w-6 text-amber-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ),
    },
    {
      title: "Scan Rate",
      value: "89%",
      change: "3%",
      trend: "down" as const,
      icon: (
        <svg
          className="h-6 w-6 text-amber-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
  ];

  const orders: Order[] = [
    {
      id: "1",
      customer: "John Doe",
      tickets: 2,
      amount: "₦5,000",
      status: "completed",
      date: "2024-12-22",
    },
    {
      id: "2",
      customer: "Jane Smith",
      tickets: 4,
      amount: "₦10,000",
      status: "completed",
      date: "2024-12-21",
    },
    {
      id: "3",
      customer: "Mike Johnson",
      tickets: 1,
      amount: "₦2,500",
      status: "pending",
      date: "2024-12-20",
    },
    {
      id: "4",
      customer: "Sarah Williams",
      tickets: 3,
      amount: "₦7,500",
      status: "completed",
      date: "2024-12-19",
    },
    {
      id: "5",
      customer: "David Brown",
      tickets: 2,
      amount: "₦5,000",
      status: "cancelled",
      date: "2024-12-18",
    },
  ];

  const getStatusColor = (status: Order["status"]) => {
    switch (status) {
      case "completed":
        return "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500";
      case "pending":
        return "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-500";
      case "cancelled":
        return "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500";
      default:
        return "bg-gray-50 text-gray-600";
    }
  };

  return (
    <>
      <PageMeta title="Dashboard | JGPNR Admin Panel" description="JGPNR Paintball Admin Dashboard" />

      {/* Welcome Section */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white/90">Welcome back, Admin</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Here's what's happening with JGPNR today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
        {stats.map((stat, index) => (
          <StatsCard
            key={index}
            title={stat.title}
            value={stat.value}
            change={stat.change}
            trend={stat.trend}
            icon={stat.icon}
          />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Orders */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
                  Recent Orders
                </h3>
                <button
                  onClick={() => navigate("/tickets/all-orders")}
                  className="text-sm font-medium text-brand-500 hover:text-brand-600"
                >
                  View all →
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-gray-800">
                  <TableRow>
                    <TableCell
                      isHeader
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      Customer
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      Tickets
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      Amount
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      Status
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {orders.map((order) => (
                    <TableRow key={order.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                      <TableCell className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white/90">
                        {order.customer}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {order.tickets}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white/90">
                        {order.amount}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(
                            order.status
                          )}`}
                        >
                          {order.status}
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/tickets/view/${order.id}`)}
                            className="text-brand-500 hover:text-brand-600"
                            title="View details"
                          >
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => navigate(`/tickets/edit/${order.id}`)}
                            className="text-gray-600 hover:text-brand-500 dark:text-gray-400"
                            title="Edit"
                          >
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <QuickActions />
          <RecentActivity />
        </div>
      </div>
    </>
  );
}