import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import ComponentCard from "../../components/common/ComponentCard";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import Select from "../../components/form/Select";
import Button from "../../components/ui/button/Button";

export default function EditTemplate() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    category: "",
    body: "",
    status: "draft",
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const fetchTemplate = async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));

      setFormData({
        name: "Welcome Email",
        subject: "Welcome to JGPNR Paintball!",
        category: "customer",
        body: `Dear {firstName} {lastName},

Welcome to JGPNR Paintball!

We're excited to have you as part of our community. Get ready for an amazing paintball experience!

If you have any questions, feel free to reach out to us anytime.

Best regards,
JGPNR Paintball Team`,
        status: "active",
      });
    };

    fetchTemplate();
  }, [id]);

  const categoryOptions = [
    { value: "customer", label: "Customer" },
    { value: "tickets", label: "Tickets" },
    { value: "reminders", label: "Reminders" },
    { value: "newsletter", label: "Newsletter" },
  ];

  const statusOptions = [
    { value: "draft", label: "Draft" },
    { value: "active", label: "Active" },
  ];

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

    if (!formData.name.trim()) newErrors.name = "Template name is required";
    if (!formData.subject.trim()) newErrors.subject = "Subject is required";
    if (!formData.category) newErrors.category = "Category is required";
    if (!formData.body.trim()) newErrors.body = "Email body is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log("Updated template:", formData);

    setIsLoading(false);
    navigate("/email-templates");
  };

  const insertVariable = (variable: string) => {
    setFormData((prev) => ({
      ...prev,
      body: prev.body + `{${variable}}`,
    }));
  };

  return (
    <>
      <PageMeta title="Edit Email Template | JGPNR Admin Panel" description="Edit email template" />
      <PageBreadcrumb pageTitle="Edit Email Template" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ComponentCard title="Template Details" desc="Update your email template">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  error={errors.name}
                  placeholder="e.g., Welcome Email"
                />
              </div>

              <div>
                <Label htmlFor="subject">Email Subject *</Label>
                <Input
                  id="subject"
                  type="text"
                  value={formData.subject}
                  onChange={(e) => handleChange("subject", e.target.value)}
                  error={errors.subject}
                  placeholder="e.g., Welcome to JGPNR!"
                />
              </div>

              <div className="grid grid-cols-2 gap-5">
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

              <div>
                <Label htmlFor="body">Email Body *</Label>
                <textarea
                  id="body"
                  rows={15}
                  value={formData.body}
                  onChange={(e) => handleChange("body", e.target.value)}
                  className={`w-full rounded-lg border bg-transparent px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 ${
                    errors.body
                      ? "border-error-300 focus:border-error-300 focus:ring-error-500/10"
                      : "border-gray-300 focus:border-brand-300 focus:ring-brand-500/10 dark:border-gray-700"
                  }`}
                  placeholder="Type your email content here..."
                />
                {errors.body && (
                  <p className="mt-1 text-xs text-error-600 dark:text-error-500">{errors.body}</p>
                )}
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
                  {isLoading ? "Updating..." : "Update Template"}
                </Button>
              </div>
            </form>
          </ComponentCard>
        </div>

        <div className="space-y-6">
          <ComponentCard title="Variables" desc="Insert dynamic content">
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Click to insert variables:
              </p>
              <div className="flex flex-wrap gap-2">
                {["firstName", "lastName", "email", "ticketCode", "orderNumber", "gameSession"].map(
                  (variable) => (
                    <button
                      key={variable}
                      type="button"
                      onClick={() => insertVariable(variable)}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                    >
                      {`{${variable}}`}
                    </button>
                  )
                )}
              </div>
            </div>
          </ComponentCard>
        </div>
      </div>
    </>
  );
}