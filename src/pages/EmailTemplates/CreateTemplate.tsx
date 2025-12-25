import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import ComponentCard from "../../components/common/ComponentCard";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import Select from "../../components/form/Select";
import TextArea from "../../components/form/input/TextArea";
import Button from "../../components/ui/button/Button";

export default function CreateTemplate() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    category: "",
    body: "",
    status: "draft",
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const categoryOptions = [
    { value: "customer", label: "Customer" },
    { value: "ticket", label: "Ticket" },
    { value: "newsletter", label: "Newsletter" },
    { value: "notification", label: "Notification" },
  ];

  const statusOptions = [
    { value: "draft", label: "Draft" },
    { value: "active", label: "Active" },
  ];

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = "Template name is required";
    }

    if (!formData.subject.trim()) {
      newErrors.subject = "Subject is required";
    }

    if (!formData.category) {
      newErrors.category = "Category is required";
    }

    if (!formData.body.trim()) {
      newErrors.body = "Email body is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      console.log("Template created:", formData);

      navigate("/email-templates");
    } catch (error) {
      console.error("Error creating template:", error);
      alert("Failed to create template. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

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

  return (
    <>
      <PageMeta
        title="Create Template | JGPNR Admin Panel"
        description="Create new email template"
      />
      <PageBreadcrumb pageTitle="Create Template" />

      <ComponentCard
        title="New Email Template"
        desc="Create a reusable email template"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <Label htmlFor="name">Template Name *</Label>
              <Input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                error={errors.name}
                placeholder="e.g., Welcome Email"
              />
            </div>

            <div>
              <Label htmlFor="category">Category *</Label>
              <Select
                options={categoryOptions}
                placeholder="Select category"
                defaultValue={formData.category}
                onChange={(value) => handleChange("category", value)}
              />
              {errors.category && (
                <p className="mt-1 text-xs text-error-600 dark:text-error-500">
                  {errors.category}
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="subject">Email Subject *</Label>
              <Input
                type="text"
                id="subject"
                value={formData.subject}
                onChange={(e) => handleChange("subject", e.target.value)}
                error={errors.subject}
                placeholder="e.g., Welcome to JGPNR Paintball"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="body">Email Body *</Label>
              <TextArea
                placeholder="Enter email content here. Use {firstName}, {lastName}, {email} as variables."
                rows={10}
                value={formData.body}
                onChange={(value) => handleChange("body", value)}
                error={!!errors.body}
                hint={errors.body || "You can use variables like {firstName}, {lastName}, {email}"}
              />
            </div>

            <div>
              <Label htmlFor="status">Status *</Label>
              <Select
                options={statusOptions}
                placeholder="Select status"
                defaultValue={formData.status}
                onChange={(value) => handleChange("status", value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => navigate("/email-templates")}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Template"}
            </Button>
          </div>
        </form>
      </ComponentCard>
    </>
  );
}