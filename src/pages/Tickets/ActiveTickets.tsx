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
import Pagination from "../../components/ui/Pagination";
import { Modal } from "../../components/ui/modal";
import { useModal } from "../../hooks/useModal";
import QRCodeDisplay from "../../components/Tickets/QRCodeDisplay";

interface Ticket {
  id: string;
  ticketCode: string;
  customer: string;
  email: string;
  gameSession: string;
  validUntil: string;
  scanCount: number;
  maxScans: number;
}

const generateMockTickets = (count: number): Ticket[] => {
  const sessions = ["Morning", "Afternoon", "Evening", "Weekend"];
  const tickets: Ticket[] = [];

  for (let i = 1; i <= count; i++) {
    tickets.push({
      id: `${i}`,
      ticketCode: `JGPNR-2024-${String(i).padStart(4, "0")}`,
      customer: `Customer ${i}`,
      email: `customer${i}@example.com`,
      gameSession: sessions[Math.floor(Math.random() * sessions.length)],
      validUntil: `2025-01-${String(Math.floor(Math.random() * 28) + 1).padStart(2, "0")}`,
      scanCount: Math.floor(Math.random() * 2),
      maxScans: 2,
    });
  }

  return tickets;
};

export default function ActiveTickets() {
  const navigate = useNavigate();
  const [allTickets] = useState<Ticket[]>(generateMockTickets(100));
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const { isOpen, openModal, closeModal } = useModal();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const totalPages = Math.ceil(allTickets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTickets = allTickets.slice(startIndex, endIndex);

  const handleViewQR = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    openModal();
  };

  return (
    <>
      <PageMeta title="Active Tickets | JGPNR Admin Panel" description="View all active tickets" />
      <PageBreadcrumb pageTitle="Active Tickets" />

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-4 border-b border-gray-200 px-6 py-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Active Tickets</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{allTickets.length} active tickets</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Ticket Code</TableCell>
                <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Customer</TableCell>
                <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Game Session</TableCell>
                <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Valid Until</TableCell>
                <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Scans</TableCell>
                <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">QR Code</TableCell>
                <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Actions</TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {currentTickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white/90">{ticket.ticketCode}</TableCell>
                  <TableCell className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white/90">{ticket.customer}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{ticket.email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{ticket.gameSession}</TableCell>
                  <TableCell className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{ticket.validUntil}</TableCell>
                  <TableCell className="px-6 py-4">
                    <Badge size="sm" color={ticket.scanCount === 0 ? "warning" : "info"}>
                      {ticket.scanCount}/{ticket.maxScans}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <button onClick={() => handleViewQR(ticket)} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                      View QR
                    </button>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <button onClick={() => navigate(`/tickets/view/${ticket.id}`)} className="text-brand-500 hover:text-brand-600" title="View Details">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} totalItems={allTickets.length} />
      </div>

      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-md">
        {selectedTicket && (
          <div className="p-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white/90">Ticket QR Code</h3>
            <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Ticket Code:</span>
                <span className="font-medium text-gray-900 dark:text-white/90">{selectedTicket.ticketCode}</span>
              </div>
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Customer:</span>
                <span className="font-medium text-gray-900 dark:text-white/90">{selectedTicket.customer}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Scans Used:</span>
                <Badge size="sm" color={selectedTicket.scanCount === 0 ? "warning" : "info"}>
                  {selectedTicket.scanCount}/{selectedTicket.maxScans}
                </Badge>
              </div>
            </div>
            <div className="flex justify-center">
              <QRCodeDisplay ticketCode={selectedTicket.ticketCode} size="lg" showDownload={true} />
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={closeModal} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800">
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}