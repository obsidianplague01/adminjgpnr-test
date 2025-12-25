import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import ComponentCard from "../../components/common/ComponentCard";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";
import ConfirmModal from "../../components/ui/ConfirmModal";
import { useModal } from "../../hooks/useModal";

interface Template {
  id: string;
  name: string;
  subject: string;
  category: string;
  body: string;
  status: "active" | "draft";
  lastModified: string;
  createdAt: string;
}

export default function ViewTemplate() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { isOpen, openModal, closeModal } = useModal();
  const [template, setTemplate] = useState<Template | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchTemplate = async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Mock data - replace with actual API call
      setTemplate({
        id: id || "1",
        name: "Welcome Email",
        subject: "Welcome to JGPNR Paintball!",
        category: "customer",
        body: `Dear {firstName} {lastName},

Welcome to JGPNR Paintball!

We're excited to have you as part of our community. Get ready for an amazing paintball experience!

If you have any questions, feel free to reach out to us anytime.

Best regards,
JGPNR Paintball Team

www.jgpnr.ng
support@jgpnr.ng`,
        status: "active",
        lastModified: "2024-12-20",
        createdAt: "2024-12-01",
      });
    };

    fetchTemplate();
  }, [id]);

  const handleDelete = async () => {
    setIsDeleting(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log("Deleted template:", id);

    setIsDeleting(false);
    closeModal();
    navigate("/email-templates");
  };

  if (!template) {
    return (
      <>
        <PageMeta title="View Template | JGPNR Admin Panel" description="View email template" />
        <PageBreadcrumb pageTitle="View Template" />
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta title="View Template | JGPNR Admin Panel" description="View email template" />
      <PageBreadcrumb pageTitle="Template Details" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ComponentCard title="Template Details" desc="View template information">
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white/90">
                    {template.name}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Created on {template.createdAt}
                  </p>
                </div>
                <Badge size="md" color={template.status === "active" ? "success" : "warning"}>
                  {template.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Category</p>
                  <p className="mt-1 font-medium text-gray-900 dark:text-white/90">
                    {template.category}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Last Modified</p>
                  <p className="mt-1 font-medium text-gray-900 dark:text-white/90">
                    {template.lastModified}
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6 dark:border-gray-800">
                <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white/90">
                  Email Subject
                </h3>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                  <p className="text-sm text-gray-900 dark:text-white/90">{template.subject}</p>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6 dark:border-gray-800">
                <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white/90">
                  Email Body
                </h3>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-900">
                  <pre className="whitespace-pre-wrap text-sm text-gray-900 dark:text-white/90">
                    {template.body}
                  </pre>
                </div>
              </div>
            </div>
          </ComponentCard>
        </div>

        <div className="space-y-6">
          <ComponentCard title="Actions" desc="Manage this template">
            <div className="space-y-3">
              <Button
                variant="primary"
                size="md"
                className="w-full"
                onClick={() => navigate(`/email-templates/edit/${id}`)}
              >
                <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Edit Template
              </Button>

              <Button
                variant="outline"
                size="md"
                className="w-full"
                onClick={() => navigate("/email-templates")}
              >
                Back to Templates
              </Button>

              <div className="border-t border-gray-200 pt-3 dark:border-gray-800">
                <Button
                  variant="outline"
                  size="md"
                  className="w-full border-error-300 text-error-600 hover:bg-error-50 dark:border-error-800 dark:text-error-500 dark:hover:bg-error-500/10"
                  onClick={openModal}
                >
                  <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Delete Template
                </Button>
              </div>
            </div>
          </ComponentCard>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h4 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white/90">
              Template Variables
            </h4>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <p>This template uses the following variables:</p>
              <ul className="mt-2 space-y-1">
                <li>• {"{firstName}"} - Customer first name</li>
                <li>• {"{lastName}"} - Customer last name</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={isOpen}
        onClose={closeModal}
        onConfirm={handleDelete}
        title="Delete Template"
        message="Are you sure you want to delete this email template? This action cannot be undone."
        confirmText="Delete"
        type="danger"
        isLoading={isDeleting}
      />
    </>
  );
}