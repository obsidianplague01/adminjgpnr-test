// src/pages/Tickets/ViewTicket.tsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import ComponentCard from "../../components/common/ComponentCard";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";
import ConfirmModal from "../../components/ui/ConfirmModal";
import { useModal } from "../../hooks/useModal";
import { emailCustomer } from "../../utils/emailService";
import QRCodeDisplay from "../../components/Tickets/QRCodeDisplay";
import { Modal } from "../../components/ui/modal";

interface Ticket {
  id: string;
  ticketCode: string;
  orderNumber: string;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    whatsapp: string;
    location: string;
  };
  gameSession: string;
  quantity: number;
  amount: string;
  status: "active" | "scanned" | "cancelled";
  purchaseDate: string;
  validUntil: string;
}

export default function ViewTicket() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { isOpen, openModal, closeModal } = useModal();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  useEffect(() => {
    // Simulate fetching ticket data
    const fetchTicket = async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Mock data
      setTicket({
        id: id || "1",
        ticketCode: "JGPNR-2024-001",
        orderNumber: "ORD-2024-001",
        customer: {
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          phone: "+234 801 234 5678",
          whatsapp: "+234 801 234 5678",
          location: "Lagos, Nigeria",
        },
        gameSession: "Afternoon Session",
        quantity: 2,
        amount: "₦5,000",
        status: "active",
        purchaseDate: "2024-12-20",
        validUntil: "2024-12-31",
      });
    };

    fetchTicket();
  }, [id]);

  const handleDelete = async () => {
    setIsDeleting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    console.log("Deleted ticket:", id);

    setIsDeleting(false);
    closeModal();
    navigate("/tickets/all-orders");
  };

  const handleEmailCustomer = () => {
  if (ticket) {
    navigate(`/mail/send?to=${encodeURIComponent(ticket.customer.email)}&subject=${encodeURIComponent(`Regarding Ticket ${ticket.ticketCode}`)}&body=${encodeURIComponent(`Dear ${ticket.customer.firstName} ${ticket.customer.lastName},\n\n`)}`);
  }
};


  if (!ticket) {
    return (
      <>
        <PageMeta title="View Ticket | JGPNR Admin Panel" description="View ticket details" />
        <PageBreadcrumb pageTitle="View Ticket" />
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta title="View Ticket | JGPNR Admin Panel" description="View ticket details" />
      <PageBreadcrumb pageTitle="Ticket Details" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Details */}
        <div className="lg:col-span-2">
          <ComponentCard title="Ticket Information" desc="Complete ticket and order details">
            <div className="space-y-6">
              {/* Status Banner */}
              <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                  <div className="mt-1">
                    <Badge
                      size="md"
                      color={
                        ticket.status === "active"
                          ? "success"
                          : ticket.status === "scanned"
                          ? "info"
                          : "error"
                      }
                    >
                      {ticket.status}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Order Number</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white/90">
                    {ticket.orderNumber}
                  </p>
                </div>
              </div>

              {/* Ticket Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Ticket Code</p>
                  <p className="mt-1 font-medium text-gray-900 dark:text-white/90">
                    {ticket.ticketCode}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Game Session</p>
                  <p className="mt-1 font-medium text-gray-900 dark:text-white/90">
                    {ticket.gameSession}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Quantity</p>
                  <p className="mt-1 font-medium text-gray-900 dark:text-white/90">
                    {ticket.quantity} ticket(s)
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Amount</p>
                  <p className="mt-1 font-medium text-gray-900 dark:text-white/90">
                    {ticket.amount}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Purchase Date</p>
                  <p className="mt-1 font-medium text-gray-900 dark:text-white/90">
                    {ticket.purchaseDate}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Valid Until</p>
                  <p className="mt-1 font-medium text-gray-900 dark:text-white/90">
                    {ticket.validUntil}
                  </p>
                </div>
              </div>

              {/* Customer Details */}
              <div className="border-t border-gray-200 pt-6 dark:border-gray-800">
                <h4 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white/90">
                  Customer Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Name</p>
                    <p className="mt-1 font-medium text-gray-900 dark:text-white/90">
                      {ticket.customer.firstName} {ticket.customer.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                    <p className="mt-1 font-medium text-gray-900 dark:text-white/90">
                      {ticket.customer.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                    <p className="mt-1 font-medium text-gray-900 dark:text-white/90">
                      {ticket.customer.phone}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">WhatsApp</p>
                    <p className="mt-1 font-medium text-gray-900 dark:text-white/90">
                      {ticket.customer.whatsapp}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Location</p>
                    <p className="mt-1 font-medium text-gray-900 dark:text-white/90">
                      {ticket.customer.location}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </ComponentCard>
        </div>

        {/* Actions Sidebar */}
        <div className="space-y-6">
          <ComponentCard title="Actions" desc="Manage this ticket">
            <div className="space-y-3">
              <Button
                variant="primary"
                size="md"
                className="w-full"
                onClick={() => navigate(`/tickets/edit/${id}`)}
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
                Edit Ticket
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
                onClick={() => setShowQRModal(true)}
              >
                <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                View QR Code
              </Button>

              <Button variant="outline" size="md" className="w-full">
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
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download Ticket
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
                  Delete Ticket
                </Button>
              </div>
            </div>
          </ComponentCard>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h4 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white/90">
              Quick Stats
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Days Until Expiry</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white/90">8 days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Scan Status</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white/90">
                  Not Scanned
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
        title="Delete Ticket"
        message="Are you sure you want to delete this ticket? This action cannot be undone."
        confirmText="Delete"
        type="danger"
        isLoading={isDeleting}
      />
      <Modal isOpen={showQRModal} onClose={() => setShowQRModal(false)} className="max-w-md">
  <div className="p-6">
    <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white/90">Ticket QR Code</h3>
    <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-2 flex justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">Ticket Code:</span>
        <span className="font-medium text-gray-900 dark:text-white/90">{ticket.ticketCode}</span>
      </div>
      <div className="mb-2 flex justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">Customer:</span>
        <span className="font-medium text-gray-900 dark:text-white/90">
          {ticket.customer.firstName} {ticket.customer.lastName}
        </span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">Status:</span>
        <Badge size="sm" color={ticket.status === "active" ? "success" : ticket.status === "scanned" ? "info" : "error"}>
          {ticket.status}
        </Badge>
      </div>
    </div>
    <div className="flex justify-center">
      <QRCodeDisplay ticketCode={ticket.ticketCode} size="lg" showDownload={true} />
    </div>
    <div className="mt-6 flex justify-end">
      <button
        onClick={() => setShowQRModal(false)}
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
      >
        Close
      </button>
    </div>
  </div>
</Modal>
    </>
  );
}