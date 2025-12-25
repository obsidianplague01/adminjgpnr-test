import { useEffect, useRef, useState } from "react";

interface ScanResult {
  text: string;
  format: string;
  timestamp: Date;
}

interface BarcodeScannerProps {
  onScan: (result: ScanResult) => void;
  onError?: (error: { message: string; code: string }) => void;
  isActive: boolean;
}

export default function BarcodeScanner({ onScan, onError, isActive }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    const loadCameras = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());

        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        setCameras(videoDevices);
        
        if (videoDevices.length > 0) {
          const rearCamera = videoDevices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('rear') ||
            d.label.toLowerCase().includes('environment')
          );
          setSelectedCamera(rearCamera?.deviceId || videoDevices[0].deviceId);
        }
      } catch (err: any) {
        console.error("Failed to get cameras:", err);
        const errorMsg = "Camera access denied. Please allow camera permissions in your browser settings.";
        setError(errorMsg);
        if (onError) {
          onError({ message: errorMsg, code: 'PERMISSION_DENIED' });
        }
      }
    };

    loadCameras();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, [onError]);

  useEffect(() => {
    const startCamera = async () => {
      if (isActive && videoRef.current && selectedCamera) {
        try {
          setError("");
          setIsScanning(true);

          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
          }

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

            // Simulate barcode scanning (in real app, use a library like @zxing/library or quagga2)
            scanIntervalRef.current = window.setInterval(() => {
              // This is a mock - in production, you'd use actual barcode scanning
              console.log("Scanning for barcodes...");
            }, 1000);
          }
        } catch (err: any) {
          console.error("Camera error:", err);
          const errorMsg = `Failed to start camera: ${err.message || 'Unknown error'}`;
          setError(errorMsg);
          setIsScanning(false);
          if (onError) {
            onError({ message: errorMsg, code: 'CAMERA_ERROR' });
          }
        }
      } else if (!isActive) {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        if (scanIntervalRef.current) {
          clearInterval(scanIntervalRef.current);
          scanIntervalRef.current = null;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        setIsScanning(false);
      }
    };

    startCamera();
  }, [isActive, selectedCamera, onError]);

  const handleCameraChange = (deviceId: string) => {
    setSelectedCamera(deviceId);
  };

  return (
    <div className="relative w-full">
      {error && (
        <div className="mb-4 rounded-lg bg-error-50 p-4 dark:bg-error-500/10">
          <div className="flex gap-3">
            <svg className="h-5 w-5 flex-shrink-0 text-error-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-1 w-48 animate-pulse bg-brand-500" style={{ animationDuration: '2s' }} />
            </div>
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
      
      <p className="mt-2 text-center text-xs text-gray-400 dark:text-gray-500">
        Note: Use manual entry below for testing without a physical QR code
      </p>
    </div>
  );
}