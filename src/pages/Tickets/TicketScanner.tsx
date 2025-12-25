import { useState } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import ComponentCard from "../../components/common/ComponentCard";
import Button from "../../components/ui/button/Button";
import Badge from "../../components/ui/badge/Badge";
import BarcodeScanner from "../../components/Scanner/BarcodeScanner";
import Input from "../../components/form/input/InputField";

interface ScanRecord {
  ticketCode: string;
  timestamp: string;
  customerName: string;
  status: "valid" | "invalid";
  reason: string;
  allowEntry: boolean;
}

export default function TicketScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanRecord | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [recentScans, setRecentScans] = useState<ScanRecord[]>([]);
  const [showCamera, setShowCamera] = useState(false);

  const validateTicket = (ticketCode: string): ScanRecord => {
    // Simple validation logic
    const isValidFormat = /^JGPNR-\d{4}-\d{3}$/.test(ticketCode);
    
    if (!isValidFormat) {
      return {
        ticketCode,
        timestamp: new Date().toLocaleString(),
        customerName: "Unknown",
        status: "invalid",
        reason: "Invalid ticket format",
        allowEntry: false,
      };
    }

    // Mock validation - in production, this would check against database
    const isValid = Math.random() > 0.3; // 70% chance of valid ticket
    
    return {
      ticketCode,
      timestamp: new Date().toLocaleString(),
      customerName: `Customer ${ticketCode.split('-')[2]}`,
      status: isValid ? "valid" : "invalid",
      reason: isValid ? "Ticket validated successfully" : "Ticket already used or expired",
      allowEntry: isValid,
    };
  };

  const processTicketScan = (ticketCode: string) => {
    const validation = validateTicket(ticketCode);
    setScanResult(validation);
    setRecentScans([validation, ...recentScans.slice(0, 9)]);

    // Auto-clear result after 5 seconds
    setTimeout(() => {
      setScanResult(null);
    }, 5000);
  };

  const handleScan = (result: any) => {
    processTicketScan(result.text);
    setShowCamera(false);
    setIsScanning(false);
  };

  const handleManualEntry = () => {
    if (!manualCode.trim()) {
      alert("Please enter a ticket code");
      return;
    }
    
    processTicketScan(manualCode.trim());
    setManualCode("");
  };

  const handleStartScanning = () => {
    setShowCamera(true);
    setIsScanning(true);
    setScanResult(null);
  };

  const handleStopScanning = () => {
    setIsScanning(false);
    setShowCamera(false);
  };

  return (
    <>
      <PageMeta title="Ticket Scanner | JGPNR Admin Panel" description="Scan and validate tickets" />
      <PageBreadcrumb pageTitle="Ticket Scanner" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ComponentCard title="Scan Ticket" desc="Scan QR code or enter ticket code manually">
            <div className="space-y-6">
              {showCamera && (
                <div className="space-y-4">
                  <BarcodeScanner 
                    onScan={handleScan} 
                    onError={(error) => console.error(error)} 
                    isActive={isScanning} 
                  />
                </div>
              )}

              {!showCamera && scanResult && (
                <div className={`rounded-xl border-2 p-8 text-center ${scanResult.allowEntry ? "border-success-300 bg-success-50 dark:border-success-800 dark:bg-success-500/10" : "border-error-300 bg-error-50 dark:border-error-800 dark:bg-error-500/10"}`}>
                  <div className="space-y-4">
                    <div className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full ${scanResult.allowEntry ? "bg-success-100 dark:bg-success-500/20" : "bg-error-100 dark:bg-error-500/20"}`}>
                      {scanResult.allowEntry ? (
                        <svg className="h-12 w-12 text-success-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="h-12 w-12 text-error-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <Badge color={scanResult.allowEntry ? "success" : "error"} size="md" className="text-base">
                        {scanResult.allowEntry ? "ENTRY ALLOWED" : "ENTRY DENIED"}
                      </Badge>
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-left">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Ticket Code:</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white/90">{scanResult.ticketCode}</span>
                        </div>
                        <div className="flex justify-between text-left">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Customer:</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white/90">{scanResult.customerName}</span>
                        </div>
                        <div className="flex justify-between text-left">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white/90">{scanResult.reason}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!showCamera && !scanResult && (
                <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-900">
                  <div className="space-y-4">
                    <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-500/20">
                      <svg className="h-12 w-12 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">Ready to Scan</h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Click "Start Scanning" to activate camera or use manual entry below</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                {!isScanning ? (
                  <Button variant="primary" size="md" className="flex-1" onClick={handleStartScanning}>
                    <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Start Scanning
                  </Button>
                ) : (
                  <Button variant="outline" size="md" className="flex-1" onClick={handleStopScanning}>
                    Stop Scanning
                  </Button>
                )}
              </div>

              <div className="border-t border-gray-200 pt-6 dark:border-gray-800">
                <h4 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white/90">Manual Ticket Entry</h4>
                <div className="mb-3 rounded-lg bg-blue-light-50 p-3 dark:bg-blue-light-500/10">
                  <p className="text-xs text-blue-light-700 dark:text-blue-light-400">
                    💡 Test with: JGPNR-2024-001, JGPNR-2024-002, or JGPNR-2024-003
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Input
                      type="text"
                      placeholder="Enter ticket code (e.g., JGPNR-2024-001)"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && manualCode.trim()) {
                          handleManualEntry();
                        }
                      }}
                    />
                  </div>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleManualEntry}
                    disabled={!manualCode.trim()}
                  >
                    Validate
                  </Button>
                </div>
              </div>
            </div>
          </ComponentCard>
        </div>

        <div>
          <ComponentCard title="Recent Scans" desc="Last validated tickets">
            <div className="space-y-3">
              {recentScans.slice(0, 10).map((scan, index) => (
                <div key={index} className={`rounded-lg border p-4 ${scan.allowEntry ? "border-success-200 bg-success-50 dark:border-success-800 dark:bg-success-500/10" : "border-error-200 bg-error-50 dark:border-error-800 dark:bg-error-500/10"}`}>
                  <div className="mb-2 flex items-start justify-between">
                    <span className="text-sm font-medium text-gray-900 dark:text-white/90">{scan.ticketCode}</span>
                    <Badge size="sm" color={scan.allowEntry ? "success" : "error"}>
                      {scan.allowEntry ? "Allowed" : "Denied"}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{scan.customerName}</p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{scan.timestamp}</p>
                </div>
              ))}

              {recentScans.length === 0 && (
                <div className="rounded-lg border border-gray-200 p-6 text-center dark:border-gray-800">
                  <p className="text-sm text-gray-500 dark:text-gray-400">No scans yet</p>
                </div>
              )}
            </div>
          </ComponentCard>

          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h4 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white/90">Today's Stats</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Scanned</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white/90">{recentScans.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Entry Allowed</span>
                <span className="text-sm font-medium text-success-600 dark:text-success-500">{recentScans.filter((s) => s.allowEntry).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Entry Denied</span>
                <span className="text-sm font-medium text-error-600 dark:text-error-500">{recentScans.filter((s) => !s.allowEntry).length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}