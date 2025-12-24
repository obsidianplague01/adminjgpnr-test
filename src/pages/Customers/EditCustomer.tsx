// src/pages/Customers/EditCustomer.tsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import ComponentCard from "../../components/common/ComponentCard";
import CustomerForm from "../../components/Customers/CustomerForm";

export default function EditCustomer() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [isLoading, setIsLoading] = useState(false);
  const [customerData, setCustomerData] = useState<any>(null);

  useEffect(() => {
    // Simulate fetching customer data
    const fetchCustomer = async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Mock data
      setCustomerData({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "+234 801 234 5678",
        whatsapp: "+234 801 234 5678",
        location: "Lagos, Nigeria",
        notes: "Regular customer, prefers afternoon sessions",
      });
    };

    fetchCustomer();
  }, [id]);

  const handleSubmit = async (data: any) => {
    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    console.log("Updated customer:", data);

    setIsLoading(false);

    // Navigate back
    navigate("/customers");
  };

  const handleCancel = () => {
    navigate("/customers");
  };

  if (!customerData) {
    return (
      <>
        <PageMeta title="Edit Customer | JGPNR Admin Panel" description="Edit customer details" />
        <PageBreadcrumb pageTitle="Edit Customer" />
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta title="Edit Customer | JGPNR Admin Panel" description="Edit customer details" />
      <PageBreadcrumb pageTitle="Edit Customer" />

      <ComponentCard title="Edit Customer" desc="Update customer information">
        <CustomerForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          initialData={customerData}
          isLoading={isLoading}
        />
      </ComponentCard>
    </>
  );
}