export interface TicketValidationConfig {
  maxScanCount: number;
  scanWindowDays: number;
}

export interface TicketData {
  ticketCode: string;
  scanHistory: Array<{
    scannedAt: string;
    scannedBy: string;
  }>;
  validUntil: string;
  status: string;
}

export interface ValidationResult {
  isValid: boolean;
  reason: string;
  allowEntry: boolean;
  scanCount: number;
  remainingScans: number;
  warningMessage?: string;
}

export const validateTicketScan = (
  ticket: TicketData,
  config: TicketValidationConfig
): ValidationResult => {
  const now = new Date();
  const scanCount = ticket.scanHistory.length;
  const remainingScans = config.maxScanCount - scanCount;

  // Check if ticket has been cancelled or is invalid
  if (ticket.status === "CANCELLED" || ticket.status === "INVALID") {
    return {
      isValid: false,
      reason: `Ticket is ${ticket.status.toLowerCase()}`,
      allowEntry: false,
      scanCount,
      remainingScans: 0,
    };
  }

  // Check if ticket has expired
  const validUntil = new Date(ticket.validUntil);
  if (now > validUntil) {
    return {
      isValid: false,
      reason: "Ticket has expired",
      allowEntry: false,
      scanCount,
      remainingScans: 0,
    };
  }

  // Check if maximum scans exceeded
  if (scanCount >= config.maxScanCount) {
    return {
      isValid: false,
      reason: `Maximum scans exceeded (${config.maxScanCount}/${config.maxScanCount})`,
      allowEntry: false,
      scanCount,
      remainingScans: 0,
    };
  }

  // Check scan window for subsequent scans
  if (scanCount > 0) {
    const firstScan = new Date(ticket.scanHistory[0].scannedAt);
    const windowEndDate = new Date(firstScan);
    windowEndDate.setDate(windowEndDate.getDate() + config.scanWindowDays);

    if (now > windowEndDate) {
      return {
        isValid: false,
        reason: `Scan window expired (${config.scanWindowDays} days from first scan)`,
        allowEntry: false,
        scanCount,
        remainingScans: 0,
      };
    }

    // Warning if approaching window expiry
    const daysUntilExpiry = Math.ceil(
      (windowEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntilExpiry <= 3) {
      return {
        isValid: true,
        reason: "Valid ticket",
        allowEntry: true,
        scanCount,
        remainingScans,
        warningMessage: `Scan window expires in ${daysUntilExpiry} day(s)`,
      };
    }
  }

  // Ticket is valid
  return {
    isValid: true,
    reason: "Valid ticket",
    allowEntry: true,
    scanCount,
    remainingScans,
  };
};

export const getMockTicketData = (ticketCode: string): TicketData => {
  // Simulate fetching ticket data
  const randomScans = Math.floor(Math.random() * 3);
  const scanHistory = [];

  for (let i = 0; i < randomScans; i++) {
    const daysAgo = Math.floor(Math.random() * 10);
    const scanDate = new Date();
    scanDate.setDate(scanDate.getDate() - daysAgo);

    scanHistory.push({
      scannedAt: scanDate.toISOString(),
      scannedBy: "Admin User",
    });
  }

  return {
    ticketCode,
    scanHistory,
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: "ACTIVE",
  };
};