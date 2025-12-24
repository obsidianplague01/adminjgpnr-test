
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";

export interface ScanResult {
  text: string;
  format: string;
  timestamp: Date;
}

export interface ScanError {
  message: string;
  code: string;
}

export class BarcodeScanner {
  private codeReader: BrowserMultiFormatReader;
  private videoElement: HTMLVideoElement | null = null;
  private isScanning: boolean = false;

  constructor() {
    this.codeReader = new BrowserMultiFormatReader();
  }

  async startScanning(
    videoElementId: string,
    onSuccess: (result: ScanResult) => void,
    onError: (error: ScanError) => void
  ): Promise<void> {
    try {
      this.videoElement = document.getElementById(
        videoElementId
      ) as HTMLVideoElement;

      if (!this.videoElement) {
        throw new Error("Video element not found");
      }

      const devices = await this.codeReader.listVideoInputDevices();

      if (devices.length === 0) {
        throw new Error("No camera devices found");
      }

      // Prefer back camera on mobile devices
      const backCamera = devices.find((device) =>
        device.label.toLowerCase().includes("back")
      );
      const selectedDevice = backCamera || devices[0];

      this.isScanning = true;

      this.codeReader.decodeFromVideoDevice(
        selectedDevice.deviceId,
        this.videoElement,
        (result, error) => {
          if (result) {
            const scanResult: ScanResult = {
              text: result.getText(),
              format: result.getBarcodeFormat().toString(),
              timestamp: new Date(),
            };
            onSuccess(scanResult);
          }

          if (error && !(error instanceof NotFoundException)) {
            onError({
              message: error.message || "Scanning error occurred",
              code: "SCAN_ERROR",
            });
          }
        }
      );
    } catch (error: any) {
      onError({
        message: error.message || "Failed to start camera",
        code: "CAMERA_ERROR",
      });
    }
  }

  stopScanning(): void {
    if (this.codeReader) {
      this.codeReader.reset();
    }
    this.isScanning = false;
  }

  isCurrentlyScanning(): boolean {
    return this.isScanning;
  }

  async getAvailableCameras(): Promise<MediaDeviceInfo[]> {
    try {
      return await this.codeReader.listVideoInputDevices();
    } catch (error) {
      console.error("Error getting cameras:", error);
      return [];
    }
  }
}

export const validateTicketCode = (code: string): boolean => {
  // JGPNR ticket format: JGPNR-YYYY-XXX
  const ticketRegex = /^JGPNR-\d{4}-\d{3}$/;
  return ticketRegex.test(code);
};

export const generateTicketCode = (): string => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 900) + 100;
  return `JGPNR-${year}-${random}`;
};