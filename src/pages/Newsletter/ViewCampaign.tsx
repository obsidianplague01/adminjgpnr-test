import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import ComponentCard from "../../components/common/ComponentCard";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import Select from "../../components/form/Select";
import Button from "../../components/ui/button/Button";

const mockTemplates = [
  {
    id: "1",
    name: "Welcome Email",
    subject: "Welcome to JGPNR Paintball!",
    body: `Dear Subscriber,\n\nWelcome to JGPNR Paintball!\n\nBest regards,\nJGPNR Team`,
  },
  {
    id: "2",
    name: "Ticket Confirmation",
    subject: "Your JGPNR Ticket Confirmed",
    body: `Dear Subscriber,\n\nYour ticket has been confirmed!\n\nBest regards,\nJGPNR Team`,
  },
];

export default function SendCampaign() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    subject: "",
    body: "",
    sendTo: "all",
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    // Check if template ID is provided in URL
    const templateId = searchParams.get("templateId");
    if (templateId) {
      const template = mockTemplates.find((t) => t.id === templateId);
      if (template) {
        setFormData({
          subject: template.subject,
          body: template.body,
          sendTo: "all",
        });
      }
    }
  }, [searchParams]);

  const sendToOptions = [
    { value: "all", label: "All Subscribers" },
    { value: "active", label: "Active Subscribers Only" },
    { value: "recent", label: "Recently Subscribed" },
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

    if (!formData.subject.trim()) {
      newErrors.subject = "Subject is required";
    }

    if (!formData.body.trim()) {
      newErrors.body = "Email body is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log("Sending campaign:", formData);

    alert("Campaign sent successfully!");

    setIsLoading(false);
    navigate("/newsletter/history");
  };

  const loadTemplate = (templateId: string) => {
    const template = mockTemplates.find((t) => t.id === templateId);
    if (template) {
      setFormData({
        ...formData,
        subject: template.subject,
        body: template.body,
      });
    }
  };

  return (
    <>
      <PageMeta
        title="Send Campaign | JGPNR Admin Panel"
        description="Create and send email campaign"
      />
      <PageBreadcrumb pageTitle="Send Campaign" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ComponentCard title="Campaign Details" desc="Configure your email campaign">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="subject">Email Subject *</Label>
                <Input
                  type="text"
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => handleChange("subject", e.target.value)}
                  error={errors.subject}
                  placeholder="Enter email subject"
                />
              </div>

              <div>
                <Label htmlFor="sendTo">Send To *</Label>
                <Select
                  options={sendToOptions}
                  placeholder="Select recipients"
                  defaultValue={formData.sendTo}
                  onChange={(value) => handleChange("sendTo", value)}
                />
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
                      Campaign Preview
                    </p>
                    <p className="mt-1 text-sm text-blue-light-600 dark:text-blue-light-400">
                      This campaign will be sent via SMTP to all selected subscribers.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => navigate("/newsletter/subscribers")}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="md" disabled={isLoading}>
                  {isLoading ? "Sending..." : "Send Campaign"}
                </Button>
              </div>
            </form>
          </ComponentCard>
        </div>

        <div className="space-y-6">
          <ComponentCard title="Quick Templates" desc="Load a template">
            <div className="space-y-2">
              {mockTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => loadTemplate(template.id)}
                  className="w-full rounded-lg border border-gray-200 p-3 text-left hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.02]"
                >
                  <p className="text-sm font-medium text-gray-900 dark:text-white/90">
                    {template.name}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Click to load
                  </p>
                </button>
              ))}
              <button
                type="button"
                onClick={() => navigate("/newsletter/templates")}
                className="w-full rounded-lg border border-brand-300 bg-brand-50 p-3 text-left hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-500/10 dark:hover:bg-brand-500/20"
              >
                <p className="text-sm font-medium text-brand-700 dark:text-brand-400">
                  View All Templates
                </p>
                <p className="mt-1 text-xs text-brand-600 dark:text-brand-500">
                  Browse all available templates
                </p>
              </button>
            </div>
          </ComponentCard>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h4 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white/90">
              Campaign Tips
            </h4>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-start gap-2">
                <span className="text-brand-500">•</span>
                <span>Keep subject lines under 50 characters</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-500">•</span>
                <span>Personalize with subscriber data</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-500">•</span>
                <span>Include clear call-to-action</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-500">•</span>
                <span>Test before sending to all</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}