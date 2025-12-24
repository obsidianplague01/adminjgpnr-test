// src/pages/Newsletter/EditSubscriber.tsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import ComponentCard from "../../components/common/ComponentCard";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import Button from "../../components/ui/button/Button";
import { isValidEmail } from "../../utils/validation";

export default function EditSubscriber() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    // Simulate fetching subscriber data
    const fetchSubscriber = async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));

      setFormData({
        name: "John Doe",
        email: "john@example.com",
      });
    };

    fetchSubscriber();
  }, [id]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    console.log("Updated subscriber:", formData);

    setIsLoading(false);
    navigate("/newsletter/subscribers");
  };

  const handleCancel = () => {
    navigate("/newsletter/subscribers");
  };

  return (
    <>
      <PageMeta
        title="Edit Subscriber | JGPNR Admin Panel"
        description="Edit newsletter subscriber"
      />
      <PageBreadcrumb pageTitle="Edit Subscriber" />

      <ComponentCard title="Edit Subscriber" desc="Update subscriber information">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                error={errors.name}
                placeholder="Enter subscriber name"
              />
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                error={errors.email}
                placeholder="email@example.com"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" disabled={isLoading}>
              {isLoading ? "Updating..." : "Update Subscriber"}
            </Button>
          </div>
        </form>
      </ComponentCard>
    </>
  );
}