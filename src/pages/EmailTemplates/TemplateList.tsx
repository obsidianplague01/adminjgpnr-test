import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";
import ConfirmModal from "../../components/ui/ConfirmModal";
import { useModal } from "../../hooks/useModal";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  category: string;
  lastModified: string;
  status: "active" | "draft";
}

const mockTemplates: EmailTemplate[] = [
  {
    id: "1",
    name: "Welcome Email",
    subject: "Welcome to JGPNR Paintball!",
    category: "Customer",
    lastModified: "2024-12-20",
    status: "active",
  },
  {
    id: "2",
    name: "Ticket Confirmation",
    subject: "Your JGPNR Ticket - {ticketCode}",
    category: "Tickets",
    lastModified: "2024-12-19",
    status: "active",
  },
  {
    id: "3",
    name: "Session Reminder",
    subject: "Reminder: Your Session is Tomorrow",
    category: "Reminders",
    lastModified: "2024-12-18",
    status: "active",
  },
  {
    id: "4",
    name: "Order Cancelled",
    subject: "Order Cancellation Confirmation",
    category: "Tickets",
    lastModified: "2024-12-15",
    status: "draft",
  },
];

export default function TemplateList() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<EmailTemplate[]>(mockTemplates);
  const { isOpen, openModal, closeModal } = useModal();
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (templateId: string) => {
    setTemplateToDelete(templateId);
    openModal();
  };

  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return;

    setIsDeleting(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setTemplates(templates.filter((t) => t.id !== templateToDelete));

    setIsDeleting(false);
    setTemplateToDelete(null);
    closeModal();
  };

  return (
    <>
      <PageMeta
        title="Email Templates | JGPNR Admin Panel"
        description="Manage email templates"
      />
      <PageBreadcrumb pageTitle="Email Templates" />

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-4 border-b border-gray-200 px-6 py-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Email Templates
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {templates.length} templates available
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate("/email-templates/create")}
          >
            <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Template
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                  Template Name
                </TableCell>
                <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                  Subject
                </TableCell>
                <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                  Category
                </TableCell>
                <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                  Last Modified
                </TableCell>
                <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                  Status
                </TableCell>
                <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                  Actions
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white/90">
                    {template.name}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {template.subject}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {template.category}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {template.lastModified}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <Badge size="sm" color={template.status === "active" ? "success" : "warning"}>
                      {template.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/email-templates/edit/${template.id}`)}
                        className="text-gray-600 hover:text-brand-500 dark:text-gray-400"
                        title="Edit"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteClick(template.id)}
                        className="text-gray-600 hover:text-error-500 dark:text-gray-400"
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <ConfirmModal
        isOpen={isOpen}
        onClose={closeModal}
        onConfirm={handleDeleteConfirm}
        title="Delete Template"
        message="Are you sure you want to delete this email template? This action cannot be undone."
        confirmText="Delete"
        type="danger"
        isLoading={isDeleting}
      />
    </>
  );
}