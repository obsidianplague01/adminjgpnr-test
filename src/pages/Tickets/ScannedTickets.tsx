import { useState, useEffect, useRef } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { Modal } from "../../components/ui/modal";
import Button from "../../components/ui/button/Button";
import Label from "../../components/form/Label";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import Badge from "../../components/ui/badge/Badge";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";

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
  {
    id: "5",
    ticketCode: "JGPNR-2024-014",
    orderNumber: "ORD-2024-014",
    customer: "Emma Brown",
    gameSession: "Morning Session",
    scannedAt: "2024-12-20 09:15 AM",
    scannedBy: "Admin User",
  },
  {
    id: "6",
    ticketCode: "JGPNR-2024-015",
    orderNumber: "ORD-2024-015",
    customer: "Frank Miller",
    gameSession: "Evening Session",
    scannedAt: "2024-12-19 07:30 PM",
    scannedBy: "Staff User",
  },
];

export default function ScannedTickets() {
  const [allTickets] = useState<ScannedTicket[]>(mockScannedTickets);
  const [filteredTickets, setFilteredTickets] = useState<ScannedTicket[]>(mockScannedTickets);
  const [showDateModal, setShowDateModal] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isFiltered, setIsFiltered] = useState(false);
  
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);
  const startPickerRef = useRef<any>(null);
  const endPickerRef = useRef<any>(null);

  useEffect(() => {
    if (showDateModal && startDateRef.current && endDateRef.current) {
      // Initialize start date picker
      startPickerRef.current = flatpickr(startDateRef.current, {
        dateFormat: "Y-m-d",
        maxDate: endDate || undefined,
        onChange: (selectedDates) => {
          if (selectedDates[0]) {
            setStartDate(flatpickr.formatDate(selectedDates[0], "Y-m-d"));
          }
        },
      });

      // Initialize end date picker
      endPickerRef.current = flatpickr(endDateRef.current, {
        dateFormat: "Y-m-d",
        minDate: startDate || undefined,
        onChange: (selectedDates) => {
          if (selectedDates[0]) {
            setEndDate(flatpickr.formatDate(selectedDates[0], "Y-m-d"));
          }
        },
      });
    }

    return () => {
      if (startPickerRef.current) {
        startPickerRef.current.destroy();
      }
      if (endPickerRef.current) {
        endPickerRef.current.destroy();
      }
    };
  }, [showDateModal]);

  // Update max/min dates when dates change
  useEffect(() => {
    if (startPickerRef.current && endDate) {
      startPickerRef.current.set("maxDate", endDate);
    }
    if (endPickerRef.current && startDate) {
      endPickerRef.current.set("minDate", startDate);
    }
  }, [startDate, endDate]);

  const parseDate = (dateString: string): Date => {
    const [datePart] = dateString.split(' ');
    return new Date(datePart);
  };

  const handleApplyFilter = () => {
    if (!startDate || !endDate) {
      alert("Please select both start and end dates");
      return;
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (start > end) {
      alert("Start date must be before end date");
      return;
    }

    const filtered = allTickets.filter((ticket) => {
      const scanDate = parseDate(ticket.scannedAt);
      return scanDate >= start && scanDate <= end;
    });

    setFilteredTickets(filtered);
    setIsFiltered(true);
    setShowDateModal(false);
  };

  const handleClearFilter = () => {
    setFilteredTickets(allTickets);
    setStartDate("");
    setEndDate("");
    setIsFiltered(false);
  };

  const handleExport = () => {
    const headers = ["Ticket Code", "Order Number", "Customer", "Game Session", "Scanned At", "Scanned By"];
    const rows = filteredTickets.map((ticket) => [
      ticket.ticketCode,
      ticket.orderNumber,
      ticket.customer,
      ticket.gameSession,
      ticket.scannedAt,
      ticket.scannedBy,
    ]);

    let csvContent = headers.join(",") + "\n";
    rows.forEach((row) => {
      csvContent += row.map(val => `"${val}"`).join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `scanned-tickets-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
              {isFiltered ? `${filteredTickets.length} of ${allTickets.length}` : allTickets.length} tickets {isFiltered && '(filtered)'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isFiltered && (
              <button
                onClick={handleClearFilter}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear Filter
              </button>
            )}
            <button
              onClick={() => setShowDateModal(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
            >
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
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
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
              {filteredTickets.length > 0 ? (
                filteredTickets.map((ticket) => (
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
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="px-6 py-8 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No tickets found for the selected date range
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Date Range Modal */}
      <Modal isOpen={showDateModal} onClose={() => setShowDateModal(false)} className="max-w-md">
        <div className="p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white/90">
            Filter by Date Range
          </h3>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="start-date">Start Date</Label>
              <div className="relative">
                <input
                  ref={startDateRef}
                  type="text"
                  id="start-date"
                  placeholder="Select start date"
                  value={startDate}
                  readOnly
                  className="h-11 w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-10 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="end-date">End Date</Label>
              <div className="relative">
                <input
                  ref={endDateRef}
                  type="text"
                  id="end-date"
                  placeholder="Select end date"
                  value={endDate}
                  readOnly
                  className="h-11 w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-10 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </span>
              </div>
            </div>

            <div className="rounded-lg bg-blue-light-50 p-3 dark:bg-blue-light-500/10">
              <p className="text-xs text-blue-light-700 dark:text-blue-light-400">
                💡 Click on the date fields to open calendar picker
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button
              variant="outline"
              size="md"
              onClick={() => setShowDateModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleApplyFilter}
              disabled={!startDate || !endDate}
            >
              Apply Filter
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}