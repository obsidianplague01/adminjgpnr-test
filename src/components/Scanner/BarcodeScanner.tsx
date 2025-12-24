// src/components/Scanner/BarcodeScanner.tsx
import { useEffect, useRef, useState } from "react";
import { BarcodeScanner as Scanner } from "../../utils/barcodeScanner";
import type { ScanResult, ScanError } from "../../utils/barcodeScanner";

interface BarcodeScannerProps {
  onScan: (result: ScanResult) => void;
  onError?: (error: ScanError) => void;
  isActive: boolean;
}

export default function BarcodeScanner({
  onScan,
  onError,
  isActive,
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<Scanner | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    scannerRef.current = new Scanner();

    const loadCameras = async () => {
      try {
        // Request camera permissions first
        await navigator.mediaDevices.getUserMedia({ video: true });
        
        if (scannerRef.current) {
          const devices = await scannerRef.current.getAvailableCameras();
          setCameras(devices);
          if (devices.length > 0) {
            // Prefer rear camera on mobile
            const rearCamera = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear'));
            setSelectedCamera(rearCamera?.deviceId || devices[0].deviceId);
          }
        }
      } catch (err) {
        console.error("Failed to get cameras:", err);
        setError("Camera access denied. Please allow camera permissions.");
      }
    };

    loadCameras();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stopScanning();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    const startCamera = async () => {
      if (isActive && videoRef.current && selectedCamera) {
        try {
          setError("");
          setIsScanning(true);

          // Stop any existing stream
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
          }

          // Request camera with specific device ID
          const constraints: MediaStreamConstraints = {
            video: {
              deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
              facingMode: selectedCamera ? undefined : { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          };

          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          streamRef.current = stream;
          
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
          }

          // Start barcode scanning
          if (scannerRef.current) {
            const handleSuccess = (result: ScanResult) => {
              onScan(result);
            };

            const handleError = (err: ScanError) => {
              setError(err.message);
              if (onError) {
                onError(err);
              }
            };

            scannerRef.current.startScanning(
              "barcode-video",
              handleSuccess,
              handleError
            );
          }
        } catch (err: any) {
          console.error("Camera error:", err);
          setError(`Failed to start camera: ${err.message || 'Unknown error'}`);
          setIsScanning(false);
        }
      } else if (!isActive) {
        // Stop camera when inactive
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        if (scannerRef.current) {
          scannerRef.current.stopScanning();
        }
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        setIsScanning(false);
      }
    };

    startCamera();
  }, [isActive, selectedCamera, onScan, onError]);

  const handleCameraChange = (deviceId: string) => {
    setSelectedCamera(deviceId);
  };

  return (
    <div className="relative w-full">
      {error && (
        <div className="mb-4 rounded-lg bg-error-50 p-4 dark:bg-error-500/10">
          <div className="flex gap-3">
            <svg
              className="h-5 w-5 flex-shrink-0 text-error-500"
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
            <div>
              <p className="text-sm font-medium text-error-600 dark:text-error-500">Camera Error</p>
              <p className="mt-1 text-sm text-error-600 dark:text-error-500">{error}</p>
            </div>
          </div>
        </div>
      )}

      {cameras.length > 1 && (
        <div className="mb-4">
          <select
            value={selectedCamera}
            onChange={(e) => handleCameraChange(e.target.value)}
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          >
            {cameras.map((camera) => (
              <option key={camera.deviceId} value={camera.deviceId}>
                {camera.label || `Camera ${camera.deviceId.substring(0, 8)}`}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="relative aspect-video w-full overflow-hidden rounded-lg border-2 border-gray-300 bg-gray-900 dark:border-gray-700">
        <video
          id="barcode-video"
          ref={videoRef}
          className="h-full w-full object-cover"
          autoPlay
          playsInline
          muted
        />

        {isActive && isScanning && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-48 w-48 rounded-lg border-4 border-brand-500 opacity-50" />
          </div>
        )}

        {!isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
            <p className="text-sm text-white">Camera inactive</p>
          </div>
        )}

        {isActive && !isScanning && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white border-t-transparent"></div>
              <p className="mt-3 text-sm text-white">Starting camera...</p>
            </div>
          </div>
        )}
      </div>

      <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
        Position the barcode within the frame
      </p>
    </div>
  );
}