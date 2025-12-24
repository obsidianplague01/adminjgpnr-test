// src/pages/Scanner/TicketScanner.tsx
import { useState } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import ComponentCard from "../../components/common/ComponentCard";
import Button from "../../components/ui/button/Button";
import Badge from "../../components/ui/badge/Badge";

interface ScanResult {
  success: boolean;
  ticketCode: string;
  customer: string;
  orderNumber: string;
  gameSession: string;
  message: string;
  timestamp: string;
}

export default function TicketScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [recentScans, setRecentScans] = useState<ScanResult[]>([
    {
      success: true,
      ticketCode: "JGPNR-2024-100",
      customer: "John Doe",
      orderNumber: "ORD-2024-050",
      gameSession: "Afternoon Session",
      message: "Ticket validated successfully",
      timestamp: "2024-12-22 10:30 AM",
    },
    {
      success: true,
      ticketCode: "JGPNR-2024-101",
      customer: "Jane Smith",
      orderNumber: "ORD-2024-051",
      gameSession: "Evening Session",
      message: "Ticket validated successfully",
      timestamp: "2024-12-22 10:25 AM",
    },
  ]);

  const handleStartScan = () => {
    setIsScanning(true);
    // Simulate scanning
    setTimeout(() => {
      const mockScan: ScanResult = {
        success: true,
        ticketCode: "JGPNR-2024-102",
        customer: "Mike Johnson",
        orderNumber: "ORD-2024-052",
        gameSession: "Weekend Session",
        message: "Ticket validated successfully",
        timestamp: new Date().toLocaleString(),
      };
      setScanResult(mockScan);
      setRecentScans([mockScan, ...recentScans]);
      setIsScanning(false);
    }, 2000);
  };

  const handleManualEntry = () => {
    // Handle manual ticket entry
    console.log("Manual entry");
  };

  return (
    <>
      <PageMeta
        title="Ticket Scanner | JGPNR Admin Panel"
        description="Scan and validate tickets for check-in"
      />
      <PageBreadcrumb pageTitle="Ticket Scanner" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Scanner Section */}
        <div className="lg:col-span-2">
          <ComponentCard title="Scan Ticket" desc="Scan QR code or barcode to validate ticket">
            <div className="space-y-6">
              {/* Scanner Area */}
              <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-900">
                {!isScanning && !scanResult && (
                  <div className="space-y-4">
                    <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-500/20">
                      <svg
                        className="h-12 w-12 text-brand-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
                        Ready to Scan
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Position the QR code in front of the camera
                      </p>
                    </div>
                  </div>
                )}

                {isScanning && (
                  <div className="space-y-4">
                    <div className="mx-auto flex h-24 w-24 items-center justify-center">
                      <div className="h-16 w-16 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
                        Scanning...
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Please wait while we validate the ticket
                      </p>
                    </div>
                  </div>
                )}

                {scanResult && !isScanning && (
                  <div className="space-y-4">
                    <div
                      className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full ${
                        scanResult.success
                          ? "bg-success-100 dark:bg-success-500/20"
                          : "bg-error-100 dark:bg-error-500/20"
                      }`}
                    >
                      {scanResult.success ? (
                        <svg
                          className="h-12 w-12 text-success-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="h-12 w-12 text-error-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      )}
                    </div>
                    <div>
                      <Badge
                        color={scanResult.success ? "success" : "error"}
                        size="md"
                      >
                        {scanResult.success ? "Valid Ticket" : "Invalid Ticket"}
                      </Badge>
                      <div className="mt-4 space-y-2 text-left">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            Ticket Code:
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white/90">
                            {scanResult.ticketCode}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            Customer:
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white/90">
                            {scanResult.customer}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            Session:
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white/90">
                            {scanResult.gameSession}
                          </span>
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                        {scanResult.message}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="primary"
                  size="md"
                  className="flex-1"
                  onClick={handleStartScan}
                  disabled={isScanning}
                >
                  {isScanning ? "Scanning..." : scanResult ? "Scan Next" : "Start Scanning"}
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  onClick={handleManualEntry}
                >
                  Manual Entry
                </Button>
              </div>
            </div>
          </ComponentCard>
        </div>

        {/* Recent Scans */}
        <div>
          <ComponentCard title="Recent Scans" desc="Last scanned tickets">
            <div className="space-y-3">
              {recentScans.map((scan, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-gray-200 p-4 dark:border-gray-800"
                >
                  <div className="mb-2 flex items-start justify-between">
                    <span className="text-sm font-medium text-gray-900 dark:text-white/90">
                      {scan.ticketCode}
                    </span>
                    <Badge
                      size="sm"
                      color={scan.success ? "success" : "error"}
                    >
                      {scan.success ? "Valid" : "Invalid"}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {scan.customer}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {scan.timestamp}
                  </p>
                </div>
              ))}
            </div>
          </ComponentCard>
        </div>
      </div>
    </>
  );
}
