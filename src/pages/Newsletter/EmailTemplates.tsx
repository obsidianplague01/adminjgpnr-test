import { useState } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";
import { Modal } from "../../components/ui/modal";
import { useModal } from "../../hooks/useModal";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  description: string;
  lastModified: string;
  status: "active" | "draft";
  thumbnail: string;
}

const mockTemplates: EmailTemplate[] = [
  {
    id: "1",
    name: "Welcome Email",
    subject: "Welcome to JGPNR Paintball!",
    description: "Sent to new subscribers and customers",
    lastModified: "2024-12-20",
    status: "active",
    thumbnail: "welcome",
  },
  {
    id: "2",
    name: "Promotional Offer",
    subject: "Special Discount - 20% Off!",
    description: "Promotional campaigns and special offers",
    lastModified: "2024-12-18",
    status: "active",
    thumbnail: "promo",
  },
  {
    id: "3",
    name: "Event Announcement",
    subject: "Join Us for Our Special Event!",
    description: "Event invitations and announcements",
    lastModified: "2024-12-15",
    status: "draft",
    thumbnail: "event",
  },
  {
    id: "4",
    name: "Monthly Newsletter",
    subject: "Your Monthly Update from JGPNR",
    description: "Regular newsletter with updates and news",
    lastModified: "2024-12-10",
    status: "active",
    thumbnail: "newsletter",
  },
];

export default function EmailTemplates() {
  const [templates] = useState<EmailTemplate[]>(mockTemplates);
  const { isOpen, openModal, closeModal } = useModal();
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);

  const handleViewTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    openModal();
  };

  return (
    <>
      <PageMeta
        title="Email Templates | JGPNR Admin Panel"
        description="Manage email templates for campaigns"
      />
      <PageBreadcrumb pageTitle="Email Templates" />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Email Templates
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {templates.length} templates available
            </p>
          </div>
          <Button variant="primary" size="md">
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            Create Template
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"
            >
              {/* Template Preview */}
              <div className="aspect-video bg-gradient-to-br from-brand-50 to-brand-100 p-6 dark:from-brand-500/10 dark:to-brand-500/5">
                <div className="flex h-full items-center justify-center">
                  <svg
                    className="h-16 w-16 text-brand-500"
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
                </div>
              </div>

              {/* Template Info */}
              <div className="p-5">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white/90">
                      {template.name}
                    </h4>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {template.description}
                    </p>
                  </div>
                  <Badge
                    size="sm"
                    color={template.status === "active" ? "success" : "warning"}
                  >
                    {template.status}
                  </Badge>
                </div>

                <div className="mb-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Subject Line
                  </p>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white/90">
                    {template.subject}
                  </p>
                </div>

                <div className="mb-4 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Last modified: {template.lastModified}</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewTemplate(template)}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.03]"
                  >
                    View
                  </button>
                  <button className="flex-1 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
                    Edit
                  </button>
                  <button className="rounded-lg border border-gray-300 px-4 py-2 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.03]">
                    <svg
                      className="h-5 w-5"
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
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Template Preview Modal */}
      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[800px]">
        {selectedTemplate && (
          <div className="p-6">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">
                  {selectedTemplate.name}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {selectedTemplate.description}
                </p>
              </div>
              <Badge
                size="sm"
                color={selectedTemplate.status === "active" ? "success" : "warning"}
              >
                {selectedTemplate.status}
              </Badge>
            </div>

            <div className="mb-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
              <p className="text-xs text-gray-500 dark:text-gray-400">Subject Line</p>
              <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white/90">
                {selectedTemplate.subject}
              </p>
            </div>

            <div className="mb-6 rounded-lg border border-gray-200 p-6 dark:border-gray-800">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                This is a preview of the email template. The actual content would be
                displayed here with proper formatting, images, and styling.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={closeModal}>
                Close
              </Button>
              <Button variant="primary" size="sm">
                Use Template
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}