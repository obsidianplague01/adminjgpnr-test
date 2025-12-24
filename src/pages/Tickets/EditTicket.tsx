// src/pages/Tickets/EditTicket.tsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import ComponentCard from "../../components/common/ComponentCard";
import TicketForm from "../../components/Tickets/TicketForm";

export default function EditTicket() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [isLoading, setIsLoading] = useState(false);
  const [ticketData, setTicketData] = useState<any>(null);

  useEffect(() => {
    // Simulate fetching ticket data
    const fetchTicket = async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Mock data
      setTicketData({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "+234 801 234 5678",
        whatsapp: "+234 801 234 5678",
        location: "Lagos, Nigeria",
        quantity: 2,
        gameSession: "afternoon",
      });
    };

    fetchTicket();
  }, [id]);

  const handleSubmit = async (data: any) => {
    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    console.log("Updated ticket:", data);

    setIsLoading(false);

    // Navigate back
    navigate("/tickets/all-orders");
  };

  const handleCancel = () => {
    navigate("/tickets/all-orders");
  };

  if (!ticketData) {
    return (
      <>
        <PageMeta title="Edit Ticket | JGPNR Admin Panel" description="Edit ticket order" />
        <PageBreadcrumb pageTitle="Edit Ticket" />
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta title="Edit Ticket | JGPNR Admin Panel" description="Edit ticket order" />
      <PageBreadcrumb pageTitle="Edit Ticket" />

      <ComponentCard title="Edit Ticket Order" desc="Update customer and ticket details">
        <TicketForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          initialData={ticketData}
          isLoading={isLoading}
        />
      </ComponentCard>
    </>
  );
}