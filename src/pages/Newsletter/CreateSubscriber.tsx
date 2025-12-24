// src/pages/Newsletter/CreateSubscriber.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import ComponentCard from "../../components/common/ComponentCard";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import Button from "../../components/ui/button/Button";
import { isValidEmail } from "../../utils/validation";

export default function CreateSubscriber() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    source: "manual",
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

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

    console.log("Created subscriber:", formData);

    setIsLoading(false);
    navigate("/newsletter/subscribers");
  };

  const handleCancel = () => {
    navigate("/newsletter/subscribers");
  };

  return (
    <>
      <PageMeta
        title="Add Subscriber | JGPNR Admin Panel"
        description="Add new newsletter subscriber"
      />
      <PageBreadcrumb pageTitle="Add Subscriber" />

      <ComponentCard title="New Subscriber" desc="Add a new subscriber to your newsletter list">
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

          <div className="rounded-lg bg-blue-light-50 p-4 dark:bg-blue-light-500/10">
            <div className="flex gap-3">
              <svg
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-light-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-blue-light-700 dark:text-blue-light-400">
                  Manual Subscription
                </p>
                <p className="mt-1 text-sm text-blue-light-600 dark:text-blue-light-400">
                  This subscriber is being added manually and will be marked as "Manual" source.
                </p>
              </div>
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
              {isLoading ? "Adding..." : "Add Subscriber"}
            </Button>
          </div>
        </form>
      </ComponentCard>
    </>
  );
}