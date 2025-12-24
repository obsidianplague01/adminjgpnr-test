// src/pages/Customers/ViewCustomer.tsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import ComponentCard from "../../components/common/ComponentCard";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";
import ConfirmModal from "../../components/ui/ConfirmModal";
import { useModal } from "../../hooks/useModal";
import { navigateToSendMail } from "../../utils/emailService";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  whatsapp: string;
  location: string;
  totalOrders: number;
  totalSpent: string;
  lastPurchase: string;
  status: "active" | "inactive";
  notes?: string;
  joinDate: string;
}

interface Order {
  id: string;
  orderNumber: string;
  date: string;
  tickets: number;
  amount: string;
  status: string;
}

export default function ViewCustomer() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { isOpen, openModal, closeModal } = useModal();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // Simulate fetching customer data
    const fetchCustomer = async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));

      setCustomer({
        id: id || "1",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "+234 801 234 5678",
        whatsapp: "+234 801 234 5678",
        location: "Lagos, Nigeria",
        totalOrders: 5,
        totalSpent: "₦12,500",
        lastPurchase: "2024-12-20",
        status: "active",
        notes: "Regular customer, prefers afternoon sessions",
        joinDate: "2024-01-15",
      });

      setOrders([
        {
          id: "1",
          orderNumber: "ORD-2024-001",
          date: "2024-12-20",
          tickets: 2,
          amount: "₦5,000",
          status: "completed",
        },
        {
          id: "2",
          orderNumber: "ORD-2024-002",
          date: "2024-11-15",
          tickets: 3,
          amount: "₦7,500",
          status: "completed",
        },
      ]);
    };

    fetchCustomer();
  }, [id]);

  const handleDelete = async () => {
    setIsDeleting(true);

    await new Promise((resolve) => setTimeout(resolve, 1500));

    console.log("Deleted customer:", id);

    setIsDeleting(false);
    closeModal();
    navigate("/customers");
  };

  const handleEmailCustomer = () => {
    if (customer) {
      const emailUrl = navigateToSendMail({
        to: customer.email,
        subject: `Message from JGPNR Paintball`,
        body: `Dear ${customer.firstName} ${customer.lastName},\n\n`,
      });
      navigate(emailUrl);
    }
  };

  if (!customer) {
    return (
      <>
        <PageMeta title="View Customer | JGPNR Admin Panel" description="View customer details" />
        <PageBreadcrumb pageTitle="View Customer" />
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta title="View Customer | JGPNR Admin Panel" description="View customer details" />
      <PageBreadcrumb pageTitle="Customer Details" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <ComponentCard title="Customer Information" desc="Personal details and contact info">
            <div className="space-y-6">
              {/* Header with Avatar */}
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-500/20">
                  <span className="text-3xl font-bold text-brand-600 dark:text-brand-400">
                    {customer.firstName.charAt(0)}
                    {customer.lastName.charAt(0)}
                  </span>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white/90">
                    {customer.firstName} {customer.lastName}
                  </h2>
                  <div className="mt-1">
                    <Badge size="sm" color={customer.status === "active" ? "success" : "error"}>
                      {customer.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Contact Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                  <p className="mt-1 font-medium text-gray-900 dark:text-white/90">
                    {customer.email}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                  <p className="mt-1 font-medium text-gray-900 dark:text-white/90">
                    {customer.phone}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">WhatsApp</p>
                  <p className="mt-1 font-medium text-gray-900 dark:text-white/90">
                    {customer.whatsapp}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Location</p>
                  <p className="mt-1 font-medium text-gray-900 dark:text-white/90">
                    {customer.location}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Join Date</p>
                  <p className="mt-1 font-medium text-gray-900 dark:text-white/90">
                    {customer.joinDate}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Last Purchase</p>
                  <p className="mt-1 font-medium text-gray-900 dark:text-white/90">
                    {customer.lastPurchase}
                  </p>
                </div>
              </div>

              {/* Notes */}
              {customer.notes && (
                <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Notes</p>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white/90">
                    {customer.notes}
                  </p>
                </div>
              )}
            </div>
          </ComponentCard>

          {/* Purchase History */}
          <ComponentCard title="Purchase History" desc="Order history for this customer">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell
                      isHeader
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      Order Number
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      Date
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      Tickets
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      Amount
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      Status
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white/90">
                        {order.orderNumber}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {order.date}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {order.tickets}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white/90">
                        {order.amount}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge size="sm" color="success">
                          {order.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </ComponentCard>
        </div>

        {/* Actions Sidebar */}
        <div className="space-y-6">
          <ComponentCard title="Actions" desc="Manage this customer">
            <div className="space-y-3">
              <Button
                variant="primary"
                size="md"
                className="w-full"
                onClick={() => navigate(`/customers/edit/${id}`)}
              >
                <svg
                  className="mr-2 h-5 w-5"
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
                Edit Customer
              </Button>

              <Button
                variant="outline"
                size="md"
                className="w-full"
                onClick={handleEmailCustomer}
              >
                <svg
                  className="mr-2 h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                Email Customer
              </Button>

              <Button 
                variant="outline" 
                size="md" 
                className="w-full"
                onClick={() => navigate('/tickets/create')}
              >
                <svg
                  className="mr-2 h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Create Ticket
              </Button>

              <div className="border-t border-gray-200 pt-3 dark:border-gray-800">
                <Button
                  variant="outline"
                  size="md"
                  className="w-full border-error-300 text-error-600 hover:bg-error-50 dark:border-error-800 dark:text-error-500 dark:hover:bg-error-500/10"
                  onClick={openModal}
                >
                  <svg
                    className="mr-2 h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Delete Customer
                </Button>
              </div>
            </div>
          </ComponentCard>

          {/* Stats */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h4 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white/90">
              Customer Stats
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Orders</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white/90">
                  {customer.totalOrders}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Spent</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white/90">
                  {customer.totalSpent}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Average Order</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white/90">
                  ₦2,500
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isOpen}
        onClose={closeModal}
        onConfirm={handleDelete}
        title="Delete Customer"
        message="Are you sure you want to delete this customer? This will also delete all associated orders and tickets."
        confirmText="Delete"
        type="danger"
        isLoading={isDeleting}
      />
    </>
  );
}