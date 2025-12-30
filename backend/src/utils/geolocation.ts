// backend/src/utils/geolocation.ts
import axios from 'axios';
import { logger } from './logger';
import { cacheService } from './cache.service';
import prisma from '../config/database';

interface GeolocationData {
  ip: string;
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  isp?: string;
  cached?: boolean;
}

class GeolocationService {
  private readonly cachePrefix = 'geo:';
  private readonly cacheTTL = 86400; // 24 hours

  /**
   * Check if IP is private/local
   */
  private isPrivateIP(ip: string): boolean {
    if (!ip || ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') {
      return true;
    }

    // Check private IP ranges
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^fc00:/,
      /^fe80:/,
    ];

    return privateRanges.some((range) => range.test(ip));
  }

  /**
   * Normalize IP address
   */
  private normalizeIP(ip: string): string {
    // Remove IPv6 prefix if present
    if (ip.startsWith('::ffff:')) {
      return ip.replace('::ffff:', '');
    }
    return ip;
  }

  /**
   * Get location from ip-api.com (free, no key required)
   */
  private async fetchFromIPAPI(ip: string): Promise<GeolocationData | null> {
    try {
      const response = await axios.get(
        `http://ip-api.com/json/${ip}?fields=status,country,countryCode,region,city,lat,lon,timezone,isp`,
        { timeout: 5000 }
      );

      if (response.data.status === 'success') {
        return {
          ip,
          country: response.data.country,
          countryCode: response.data.countryCode,
          region: response.data.region,
          city: response.data.city,
          latitude: response.data.lat,
          longitude: response.data.lon,
          timezone: response.data.timezone,
          isp: response.data.isp,
        };
      }

      return null;
    } catch (error) {
      logger.debug('ip-api.com fetch failed:', error);
      return null;
    }
  }

  /**
   * Get location from ipapi.co (backup, free tier)
   */
  private async fetchFromIPAPICO(ip: string): Promise<GeolocationData | null> {
    try {
      const response = await axios.get(`https://ipapi.co/${ip}/json/`, {
        timeout: 5000,
      });

      if (response.data.error) {
        return null;
      }

      return {
        ip,
        country: response.data.country_name,
        countryCode: response.data.country_code,
        region: response.data.region,
        city: response.data.city,
        latitude: response.data.latitude,
        longitude: response.data.longitude,
        timezone: response.data.timezone,
        isp: response.data.org,
      };
    } catch (error) {
      logger.debug('ipapi.co fetch failed:', error);
      return null;
    }
  }

  /**
   * Get location from ipwhois.app (backup)
   */
  private async fetchFromIPWhois(ip: string): Promise<GeolocationData | null> {
    try {
      const response = await axios.get(
        `https://ipwhois.app/json/${ip}?objects=country,city,region,latitude,longitude,timezone,isp`,
        { timeout: 5000 }
      );

      if (!response.data.success) {
        return null;
      }

      return {
        ip,
        country: response.data.country,
        countryCode: response.data.country_code,
        region: response.data.region,
        city: response.data.city,
        latitude: response.data.latitude,
        longitude: response.data.longitude,
        timezone: response.data.timezone,
        isp: response.data.isp,
      };
    } catch (error) {
      logger.debug('ipwhois.app fetch failed:', error);
      return null;
    }
  }

  /**
   * Get location with fallback chain
   */
  async getLocation(ip: string): Promise<GeolocationData> {
    try {
      const normalizedIP = this.normalizeIP(ip);

      // Check if private/local IP
      if (this.isPrivateIP(normalizedIP)) {
        return {
          ip: normalizedIP,
          country: 'Local',
          countryCode: 'LOCAL',
          city: 'Local Network',
        };
      }

      // Check cache first
      const cacheKey = `${this.cachePrefix}${normalizedIP}`;
      const cached = await cacheService.get<GeolocationData>(cacheKey);

      if (cached) {
        logger.debug(`Geolocation cache hit: ${normalizedIP}`);
        return { ...cached, cached: true };
      }

      // Try multiple providers with fallback
      let locationData: GeolocationData | null = null;

      // Try ip-api.com first (most reliable, free)
      locationData = await this.fetchFromIPAPI(normalizedIP);

      // Fallback to ipapi.co
      if (!locationData) {
        locationData = await this.fetchFromIPAPICO(normalizedIP);
      }

      // Fallback to ipwhois.app
      if (!locationData) {
        locationData = await this.fetchFromIPWhois(normalizedIP);
      }

      // If all failed, return unknown
      if (!locationData) {
        logger.warn(`Geolocation failed for IP: ${normalizedIP}`);
        return {
          ip: normalizedIP,
          country: 'Unknown',
          countryCode: 'XX',
          city: 'Unknown',
        };
      }

      // Cache successful result
      await cacheService.set(cacheKey, locationData, this.cacheTTL);

      logger.debug(`Geolocation resolved: ${normalizedIP} -> ${locationData.city}, ${locationData.country}`);

      return locationData;
    } catch (error) {
      logger.error('Geolocation service error:', error);
      return {
        ip: this.normalizeIP(ip),
        country: 'Unknown',
        countryCode: 'XX',
        city: 'Unknown',
      };
    }
  }

  /**
   * Bulk geolocate multiple IPs
   */
  async getLocations(ips: string[]): Promise<Map<string, GeolocationData>> {
    const results = new Map<string, GeolocationData>();

    // Process in parallel with limit
    const batchSize = 10;
    for (let i = 0; i < ips.length; i += batchSize) {
      const batch = ips.slice(i, i + batchSize);
      const promises = batch.map((ip) =>
        this.getLocation(ip).then((data) => ({ ip, data }))
      );

      const batchResults = await Promise.allSettled(promises);

      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.set(result.value.ip, result.value.data);
        }
      });
    }

    return results;
  }

  /**
   * Get distance between two locations (Haversine formula)
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Check if location seems suspicious (rapid location changes)
   */
  async checkSuspiciousActivity(
    userId: string,
    currentIP: string
  ): Promise<{ suspicious: boolean; reason?: string }> {
    try {
      // Get user's recent login locations
      const recentLogins = await prisma.loginActivity.findMany({
        where: {
          userId,
          timestamp: {
            gte: new Date(Date.now() - 3600000), // Last hour
          },
        },
        orderBy: { timestamp: 'desc' },
        take: 5,
      });

      if (recentLogins.length < 2) {
        return { suspicious: false };
      }

      const currentLocation = await this.getLocation(currentIP);

      // Check for impossible travel
      for (const login of recentLogins) {
        if (!login.location) continue;

        try {
          const previousData = JSON.parse(login.location);
          if (!previousData.latitude || !previousData.longitude) continue;

          if (!currentLocation.latitude || !currentLocation.longitude) continue;

          const distance = this.calculateDistance(
            previousData.latitude,
            previousData.longitude,
            currentLocation.latitude,
            currentLocation.longitude
          );

          const timeDiff = Date.now() - login.timestamp.getTime();
          const hoursDiff = timeDiff / (1000 * 60 * 60);

          // Check if travel speed exceeds 1000 km/h (suspicious)
          const speed = distance / hoursDiff;

          if (speed > 1000) {
            return {
              suspicious: true,
              reason: `Impossible travel detected: ${distance.toFixed(0)}km in ${hoursDiff.toFixed(1)} hours`,
            };
          }
        } catch (parseError) {
          // Skip malformed location data
          continue;
        }
      }

      return { suspicious: false };
    } catch (error) {
      logger.error('Failed to check suspicious activity:', error);
      return { suspicious: false };
    }
  }
}

export const geolocationService = new GeolocationService();