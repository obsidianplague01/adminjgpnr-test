import { useState } from "react";
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

interface ScannedTicket {
  id: string;
  ticketCode: string;
  orderNumber: string;
  customer: string;
  gameSession: string;
  scannedAt: string;
  scannedBy: string;
}

const mockScannedTickets: ScannedTicket[] = [
  {
    id: "1",
    ticketCode: "JGPNR-2024-010",
    orderNumber: "ORD-2024-010",
    customer: "Alice Cooper",
    gameSession: "Morning Session",
    scannedAt: "2024-12-22 10:30 AM",
    scannedBy: "Admin User",
  },
  {
    id: "2",
    ticketCode: "JGPNR-2024-011",
    orderNumber: "ORD-2024-011",
    customer: "Bob Wilson",
    gameSession: "Afternoon Session",
    scannedAt: "2024-12-22 02:15 PM",
    scannedBy: "Admin User",
  },
  {
    id: "3",
    ticketCode: "JGPNR-2024-012",
    orderNumber: "ORD-2024-012",
    customer: "Carol Martinez",
    gameSession: "Evening Session",
    scannedAt: "2024-12-21 06:45 PM",
    scannedBy: "Admin User",
  },
  {
    id: "4",
    ticketCode: "JGPNR-2024-013",
    orderNumber: "ORD-2024-013",
    customer: "David Lee",
    gameSession: "Weekend Session",
    scannedAt: "2024-12-21 11:00 AM",
    scannedBy: "Staff User",
  },
];

export default function ScannedTickets() {
  const [tickets] = useState<ScannedTicket[]>(mockScannedTickets);

  return (
    <>
      <PageMeta
        title="Scanned Tickets | JGPNR Admin Panel"
        description="View all scanned and used tickets"
      />
      <PageBreadcrumb pageTitle="Scanned Tickets" />

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-4 border-b border-gray-200 px-6 py-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Scanned Tickets
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {tickets.length} tickets have been checked in
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]">
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
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              Date Range
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]">
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
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Export Report
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
                  Ticket Code
                </TableCell>
                <TableCell
                  isHeader
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Order Number
                </TableCell>
                <TableCell
                  isHeader
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Customer
                </TableCell>
                <TableCell
                  isHeader
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Game Session
                </TableCell>
                <TableCell
                  isHeader
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Scanned At
                </TableCell>
                <TableCell
                  isHeader
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Scanned By
                </TableCell>
                <TableCell
                  isHeader
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Status
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {tickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="px-6 py-4">
                    <span className="text-sm font-medium text-gray-900 dark:text-white/90">
                      {ticket.ticketCode}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {ticket.orderNumber}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-gray-900 dark:text-white/90">
                    {ticket.customer}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {ticket.gameSession}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {ticket.scannedAt}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {ticket.scannedBy}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <Badge size="sm" color="info">
                      Scanned
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}