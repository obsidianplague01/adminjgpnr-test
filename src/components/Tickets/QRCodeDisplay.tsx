// src/components/Tickets/QRCodeDisplay.tsx
import { useState, useEffect } from 'react';
import { generateQRCodeFromTicketCode, downloadQRCode } from '../../utils/qrCodeGenerator';
import Button from '../ui/button/Button';

interface QRCodeDisplayProps {
  ticketCode: string;
  size?: 'sm' | 'md' | 'lg';
  showDownload?: boolean;
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  ticketCode,
  size = 'md',
  showDownload = true,
}) => {
  const [qrCodeURL, setQrCodeURL] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const sizeClasses = {
    sm: 'h-32 w-32',
    md: 'h-48 w-48',
    lg: 'h-64 w-64',
  };

  useEffect(() => {
    const generateQR = async () => {
      try {
        setIsLoading(true);
        setError('');
        const qrURL = await generateQRCodeFromTicketCode(ticketCode);
        setQrCodeURL(qrURL);
      } catch (err) {
        setError('Failed to generate QR code');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    if (ticketCode) {
      generateQR();
    }
  }, [ticketCode]);

  const handleDownload = () => {
    if (qrCodeURL) {
      downloadQRCode(qrCodeURL, `JGPNR-QR-${ticketCode}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-8 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Generating QR code...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-error-200 bg-error-50 p-8 text-center dark:border-error-800 dark:bg-error-500/10">
        <svg
          className="mx-auto h-12 w-12 text-error-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="mt-3 text-sm text-error-600 dark:text-error-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="rounded-lg border-2 border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <img
          src={qrCodeURL}
          alt={`QR Code for ${ticketCode}`}
          className={`${sizeClasses[size]} object-contain`}
        />
      </div>
      
      <div className="text-center">
        <p className="text-sm font-medium text-gray-900 dark:text-white/90">{ticketCode}</p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Scan this code to verify ticket
        </p>
      </div>

      {showDownload && (
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          Download QR Code
        </Button>
      )}
    </div>
  );
};

export default QRCodeDisplay;