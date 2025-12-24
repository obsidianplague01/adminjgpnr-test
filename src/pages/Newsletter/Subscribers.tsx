// src/pages/Newsletter/Subscribers.tsx
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
import ConfirmModal from "../../components/ui/ConfirmModal";
import { useModal } from "../../hooks/useModal";

interface Subscriber {
  id: string;
  email: string;
  name: string;
  subscribedDate: string;
  status: "active" | "unsubscribed";
  source: string;
}

const mockSubscribers: Subscriber[] = [
  {
    id: "1",
    email: "john@example.com",
    name: "John Doe",
    subscribedDate: "2024-12-01",
    status: "active",
    source: "Website",
  },
  {
    id: "2",
    email: "jane@example.com",
    name: "Jane Smith",
    subscribedDate: "2024-11-28",
    status: "active",
    source: "Checkout",
  },
  {
    id: "3",
    email: "mike@example.com",
    name: "Mike Johnson",
    subscribedDate: "2024-11-25",
    status: "unsubscribed",
    source: "Website",
  },
  {
    id: "4",
    email: "sarah@example.com",
    name: "Sarah Williams",
    subscribedDate: "2024-11-20",
    status: "active",
    source: "Manual",
  },
];

export default function Subscribers() {
  const navigate = useNavigate();
  const [subscribers, setSubscribers] = useState<Subscriber[]>(mockSubscribers);
  const { isOpen, openModal, closeModal } = useModal();
  const [subscriberToDelete, setSubscriberToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (subscriberId: string) => {
    setSubscriberToDelete(subscriberId);
    openModal();
  };

  const handleDeleteConfirm = async () => {
    if (!subscriberToDelete) return;

    setIsDeleting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setSubscribers(subscribers.filter((s) => s.id !== subscriberToDelete));

    setIsDeleting(false);
    setSubscriberToDelete(null);
    closeModal();
  };

  return (
    <>
      <PageMeta
        title="Newsletter Subscribers | JGPNR Admin Panel"
        description="Manage newsletter subscribers"
      />
      <PageBreadcrumb pageTitle="Newsletter Subscribers" />

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-4 border-b border-gray-200 px-6 py-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Newsletter Subscribers
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {subscribers.filter((s) => s.status === "active").length} active subscribers
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Export List
            </button>
            <button
              onClick={() => navigate("/newsletter/subscribers/create")}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Subscriber
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell
                  isHeader
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Email
                </TableCell>
                <TableCell
                  isHeader
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Name
                </TableCell>
                <TableCell
                  isHeader
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Subscribed Date
                </TableCell>
                <TableCell
                  isHeader
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Source
                </TableCell>
                <TableCell
                  isHeader
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Status
                </TableCell>
                <TableCell
                  isHeader
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {subscribers.map((subscriber) => (
                <TableRow key={subscriber.id}>
                  <TableCell className="px-6 py-4 text-sm text-gray-900 dark:text-white/90">
                    {subscriber.email}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {subscriber.name}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {subscriber.subscribedDate}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {subscriber.source}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <Badge size="sm" color={subscriber.status === "active" ? "success" : "error"}>
                      {subscriber.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/newsletter/subscribers/edit/${subscriber.id}`)}
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
                        onClick={() => handleDeleteClick(subscriber.id)}
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

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isOpen}
        onClose={closeModal}
        onConfirm={handleDeleteConfirm}
        title="Delete Subscriber"
        message="Are you sure you want to delete this subscriber? This action cannot be undone."
        confirmText="Delete"
        type="danger"
        isLoading={isDeleting}
      />
    </>
  );
}