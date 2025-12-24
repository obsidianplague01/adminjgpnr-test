// src/pages/Tickets/CreateTicket.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import ComponentCard from "../../components/common/ComponentCard";
import TicketForm from "../../components/Tickets/TicketForm";
import QRCodeDisplay from "../../components/Tickets/QRCodeDisplay";
import Button from "../../components/ui/button/Button";
import { Modal } from "../../components/ui/modal";
import { generateTicketCode } from "../../utils/barcodeScanner";
import { generateQRCode } from "../../utils/qrCodeGenerator";
import { downloadTicket } from "../../utils/ticketDownload";
import { useModal } from "../../hooks/useModal";

interface CreatedTicket {
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
  purchaseDate: string;
  validUntil: string;
  qrCodeDataURL: string;
}

export default function CreateTicket() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [createdTicket, setCreatedTicket] = useState<CreatedTicket | null>(null);
  const { isOpen, openModal, closeModal } = useModal();

  const handleSubmit = async (data: any) => {
    setIsLoading(true);

    try {
      // Generate ticket codes for each quantity
      const ticketCode = generateTicketCode();
      const orderNumber = `ORD-${Date.now()}`;
      const ticketPrice = 2500; // Base price per ticket
      const totalAmount = ticketPrice * data.quantity;

      // Calculate dates
      const purchaseDate = new Date().toISOString().split('T')[0];
      const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      // Generate QR code
      const qrCodeDataURL = await generateQRCode({
        ticketCode,
        orderNumber,
        customerName: `${data.firstName} ${data.lastName}`,
        gameSession: data.gameSession,
        validUntil,
      });

      // Create ticket object
      const newTicket: CreatedTicket = {
        id: ticketCode,
        ticketCode,
        orderNumber,
        customer: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          whatsapp: data.whatsapp,
          location: data.location,
        },
        gameSession: data.gameSession,
        quantity: data.quantity,
        amount: `₦${totalAmount.toLocaleString()}`,
        purchaseDate,
        validUntil,
        qrCodeDataURL,
      };

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      console.log("Created ticket:", newTicket);

      setCreatedTicket(newTicket);
      setIsLoading(false);
      openModal();
    } catch (error) {
      console.error("Error creating ticket:", error);
      alert("Failed to create ticket. Please try again.");
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/tickets/all-orders");
  };

  const handleDownloadTicket = () => {
    if (!createdTicket) return;

    downloadTicket({
      ticketCode: createdTicket.ticketCode,
      orderNumber: createdTicket.orderNumber,
      customerName: `${createdTicket.customer.firstName} ${createdTicket.customer.lastName}`,
      email: createdTicket.customer.email,
      phone: createdTicket.customer.phone,
      gameSession: createdTicket.gameSession,
      quantity: createdTicket.quantity,
      amount: createdTicket.amount,
      purchaseDate: createdTicket.purchaseDate,
      validUntil: createdTicket.validUntil,
      qrCodeDataURL: createdTicket.qrCodeDataURL,
    });
  };

  const handleViewTicket = () => {
    if (createdTicket) {
      closeModal();
      navigate(`/tickets/view/${createdTicket.id}`);
    }
  };

  const handleCreateAnother = () => {
    setCreatedTicket(null);
    closeModal();
  };

  return (
    <>
      <PageMeta
        title="Create Ticket | JGPNR Admin Panel"
        description="Create new ticket order"
      />
      <PageBreadcrumb pageTitle="Create Ticket" />

      <ComponentCard
        title="New Ticket Order"
        desc="Fill in customer details to create a new ticket order"
      >
        <TicketForm onSubmit={handleSubmit} onCancel={handleCancel} isLoading={isLoading} />
      </ComponentCard>

      {/* Success Modal with QR Code */}
      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-2xl">
        {createdTicket && (
          <div className="p-6">
            <div className="mb-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-100 dark:bg-success-500/20">
                <svg
                  className="h-8 w-8 text-success-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white/90">
                Ticket Created Successfully!
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Your ticket has been generated and is ready to use.
              </p>
            </div>

            <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-900">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Order Number</p>
                  <p className="mt-1 font-medium text-gray-900 dark:text-white/90">
                    {createdTicket.orderNumber}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Ticket Code</p>
                  <p className="mt-1 font-medium text-gray-900 dark:text-white/90">
                    {createdTicket.ticketCode}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Customer</p>
                  <p className="mt-1 font-medium text-gray-900 dark:text-white/90">
                    {createdTicket.customer.firstName} {createdTicket.customer.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Quantity</p>
                  <p className="mt-1 font-medium text-gray-900 dark:text-white/90">
                    {createdTicket.quantity} ticket(s)
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Amount</p>
                  <p className="mt-1 font-medium text-gray-900 dark:text-white/90">
                    {createdTicket.amount}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Valid Until</p>
                  <p className="mt-1 font-medium text-gray-900 dark:text-white/90">
                    {createdTicket.validUntil}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-6 flex justify-center">
              <QRCodeDisplay ticketCode={createdTicket.ticketCode} size="lg" showDownload={false} />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="outline" size="md" className="flex-1" onClick={handleDownloadTicket}>
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
              <Button variant="outline" size="md" className="flex-1" onClick={handleViewTicket}>
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
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                View Details
              </Button>
              <Button variant="primary" size="md" className="flex-1" onClick={handleCreateAnother}>
                Create Another
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}