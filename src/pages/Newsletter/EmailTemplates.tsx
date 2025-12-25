import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";
import Pagination from "../../components/ui/Pagination";
import ConfirmModal from "../../components/ui/ConfirmModal";
import { useModal } from "../../hooks/useModal";

interface Template {
  id: string;
  name: string;
  subject: string;
  category: string;
  body: string;
  lastModified: string;
  status: "active" | "draft";
}

const mockTemplates: Template[] = [
  {
    id: "1",
    name: "Welcome Email",
    subject: "Welcome to JGPNR Paintball!",
    category: "Customer",
    body: `Dear {firstName} {lastName},\n\nWelcome to JGPNR Paintball!\n\nBest regards,\nJGPNR Team`,
    lastModified: "2024-12-20",
    status: "active",
  },
  {
    id: "2",
    name: "Ticket Confirmation",
    subject: "Your JGPNR Ticket - {ticketCode}",
    category: "Tickets",
    body: `Dear {firstName} {lastName},\n\nYour ticket {ticketCode} has been confirmed!\n\nBest regards,\nJGPNR Team`,
    lastModified: "2024-12-19",
    status: "active",
  },
  {
    id: "3",
    name: "Session Reminder",
    subject: "Reminder: Your Session Tomorrow",
    category: "Reminders",
    body: `Dear {firstName} {lastName},\n\nThis is a reminder about your session tomorrow.\n\nBest regards,\nJGPNR Team`,
    lastModified: "2024-12-18",
    status: "active",
  },
  {
    id: "4",
    name: "Newsletter Promotion",
    subject: "Special Offer - 20% Off!",
    category: "Newsletter",
    body: `Dear Subscriber,\n\nGet 20% off this weekend!\n\nBest regards,\nJGPNR Team`,
    lastModified: "2024-12-17",
    status: "draft",
  },
];

export default function EmailTemplates() {
  const navigate = useNavigate();
  const [allTemplates, setAllTemplates] = useState<Template[]>(mockTemplates);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);
  const { isOpen: isDeleteOpen, openModal: openDeleteModal, closeModal: closeDeleteModal } = useModal();
  const { isOpen: isUseOpen, openModal: openUseModal, closeModal: closeUseModal } = useModal();
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [templateToUse, setTemplateToUse] = useState<Template | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const totalPages = Math.ceil(allTemplates.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTemplates = allTemplates.slice(startIndex, endIndex);

  const handleView = (templateId: string) => {
    navigate(`/email-templates/view/${templateId}`);
  };

  const handleEdit = (templateId: string) => {
    navigate(`/email-templates/edit/${templateId}`);
  };

  const handleDeleteClick = (templateId: string) => {
    setTemplateToDelete(templateId);
    openDeleteModal();
  };

  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return;

    setIsDeleting(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setAllTemplates(allTemplates.filter((t) => t.id !== templateToDelete));

    setIsDeleting(false);
    setTemplateToDelete(null);
    closeDeleteModal();
  };

  const handleUseTemplate = (template: Template) => {
    setTemplateToUse(template);
    openUseModal();
  };

  const handleConfirmUseTemplate = () => {
    if (!templateToUse) return;

    // Navigate to send campaign page with template pre-filled
    navigate(`/newsletter/send-campaign?templateId=${templateToUse.id}`);
    closeUseModal();
  };

  const handleCreateTemplate = () => {
    navigate("/email-templates/create");
  };

  return (
    <>
      <PageMeta
        title="Email Templates | JGPNR Admin Panel"
        description="Manage newsletter email templates"
      />
      <PageBreadcrumb pageTitle="Email Templates" />

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Email Templates
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {allTemplates.length} templates available
          </p>
        </div>
        <Button variant="primary" size="md" onClick={handleCreateTemplate}>
          <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Template
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {currentTemplates.map((template) => (
          <div
            key={template.id}
            className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <div className="p-6">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white/90">
                    {template.name}
                  </h4>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {template.subject}
                  </p>
                </div>
                <Badge size="sm" color={template.status === "active" ? "success" : "warning"}>
                  {template.status}
                </Badge>
              </div>

              <div className="mb-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Category:</span>
                  <span className="font-medium text-gray-900 dark:text-white/90">
                    {template.category}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Modified:</span>
                  <span className="font-medium text-gray-900 dark:text-white/90">
                    {template.lastModified}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => handleUseTemplate(template)}
                  className="w-full rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
                >
                  Use Template
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleView(template.id)}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleEdit(template.id)}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteClick(template.id)}
                    className="rounded-lg border border-error-300 px-3 py-2 text-sm font-medium text-error-600 hover:bg-error-50 dark:border-error-800 dark:text-error-500 dark:hover:bg-error-500/10"
                    title="Delete"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={allTemplates.length}
          />
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={closeDeleteModal}
        onConfirm={handleDeleteConfirm}
        title="Delete Template"
        message="Are you sure you want to delete this email template? This action cannot be undone."
        confirmText="Delete"
        type="danger"
        isLoading={isDeleting}
      />

      {/* Use Template Confirmation Modal */}
      <ConfirmModal
        isOpen={isUseOpen}
        onClose={closeUseModal}
        onConfirm={handleConfirmUseTemplate}
        title="Use Template"
        message={`Do you want to use "${templateToUse?.name}" template for your campaign? This will take you to the Send Campaign page with the template pre-filled.`}
        confirmText="Use Template"
        type="info"
        isLoading={false}
      />
    </>
  );
}