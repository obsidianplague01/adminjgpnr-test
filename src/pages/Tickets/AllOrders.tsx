import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";
import ConfirmModal from "../../components/ui/ConfirmModal";
import Pagination from "../../components/ui/Pagination";
import { useModal } from "../../hooks/useModal";
import { navigateToSendMail } from "../../utils/emailService";

interface Order {
  id: string;
  orderNumber: string;
  customer: string;
  email: string;
  tickets: number;
  amount: string;
  date: string;
  status: "pending" | "completed" | "cancelled";
}

const generateMockOrders = (count: number): Order[] => {
  const statuses: Array<"pending" | "completed" | "cancelled"> = ["pending", "completed", "cancelled"];
  const orders: Order[] = [];

  for (let i = 1; i <= count; i++) {
    orders.push({
      id: `${i}`,
      orderNumber: `ORD-2024-${String(i).padStart(4, "0")}`,
      customer: `Customer ${i}`,
      email: `customer${i}@example.com`,
      tickets: Math.floor(Math.random() * 5) + 1,
      amount: `₦${(Math.floor(Math.random() * 10) + 1) * 2500}`,
      date: `2024-12-${String(Math.floor(Math.random() * 28) + 1).padStart(2, "0")}`,
      status: statuses[Math.floor(Math.random() * statuses.length)],
    });
  }

  return orders;
};

export default function AllOrders() {
  const navigate = useNavigate();
  const [allOrders] = useState<Order[]>(generateMockOrders(150));
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const { isOpen, openModal, closeModal } = useModal();
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const totalPages = Math.ceil(allOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentOrders = allOrders.slice(startIndex, endIndex);

  const handleDeleteClick = (orderId: string) => {
    setOrderToDelete(orderId);
    openModal();
  };

  const handleDeleteConfirm = async () => {
    if (!orderToDelete) return;

    setIsDeleting(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setIsDeleting(false);
    setOrderToDelete(null);
    closeModal();
  };

  const handleEmailCustomer = (order: Order) => {
    const emailUrl = navigateToSendMail({
      to: order.email,
      subject: `Regarding Order ${order.orderNumber}`,
      body: `Dear ${order.customer},\n\n`,
    });
    navigate(emailUrl);
  };

  return (
    <>
      <PageMeta title="All Orders | JGPNR Admin Panel" description="View and manage all ticket orders" />
      <PageBreadcrumb pageTitle="All Orders" />

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-4 border-b border-gray-200 px-6 py-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">All Orders</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {allOrders.length} total orders
            </p>
          </div>
          <Button variant="primary" size="md" onClick={() => navigate("/tickets/create")}>
            <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Order
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                  Order Number
                </TableCell>
                <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                  Customer
                </TableCell>
                <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                  Tickets
                </TableCell>
                <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                  Amount
                </TableCell>
                <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                  Date
                </TableCell>
                <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                  Status
                </TableCell>
                <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                  Actions
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {currentOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white/90">
                    {order.orderNumber}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white/90">{order.customer}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{order.email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {order.tickets}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white/90">
                    {order.amount}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {order.date}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <Badge size="sm" color={order.status === "completed" ? "success" : order.status === "pending" ? "warning" : "error"}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => navigate(`/tickets/view/${order.id}`)} className="text-brand-500 hover:text-brand-600" title="View">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button onClick={() => navigate(`/tickets/edit/${order.id}`)} className="text-gray-600 hover:text-brand-500 dark:text-gray-400" title="Edit">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => handleEmailCustomer(order)} className="text-gray-600 hover:text-brand-500 dark:text-gray-400" title="Email">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button onClick={() => handleDeleteClick(order.id)} className="text-gray-600 hover:text-error-500 dark:text-gray-400" title="Delete">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          totalItems={allOrders.length}
        />
      </div>

      <ConfirmModal
        isOpen={isOpen}
        onClose={closeModal}
        onConfirm={handleDeleteConfirm}
        title="Delete Order"
        message="Are you sure you want to delete this order? This will also delete all associated tickets."
        confirmText="Delete"
        type="danger"
        isLoading={isDeleting}
      />
    </>
  );
}