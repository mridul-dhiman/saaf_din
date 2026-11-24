import { HourlyForecast, HourlyForecastPoint } from '../../types';
import { ForecastProvider, Place } from './types';

const CACHE_PREFIX = 'saafdin_forecast_cache';

export class OpenMeteoProvider implements ForecastProvider {
  async getHourly(lat: number, lon: number): Promise<HourlyForecast> {
    const cacheKey = `${CACHE_PREFIX}_${lat.toFixed(2)}_${lon.toFixed(2)}`;

    try {
      const airQualityUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=pm2_5,pm10,us_aqi,nitrogen_dioxide&timezone=auto&forecast_days=2`;
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=auto&forecast_days=2`;

      const [aqRes, weatherRes] = await Promise.all([
        fetch(airQualityUrl),
        fetch(weatherUrl),
      ]);

      if (!aqRes.ok || !weatherRes.ok) {
        throw new Error(`Open-Meteo API returned error: AQ=${aqRes.status}, Weather=${weatherRes.status}`);
      }

      const aqData = await aqRes.json();
      const weatherData = await weatherRes.json();

      const times: string[] = aqData.hourly.time;
      const pm25Arr: number[] = aqData.hourly.pm2_5;
      const pm10Arr: number[] = aqData.hourly.pm10;
      const usAqiArr: number[] = aqData.hourly.us_aqi;

      const tempArr: number[] = weatherData.hourly.temperature_2m || [];
      const rhArr: number[] = weatherData.hourly.relative_humidity_2m || [];
      const windArr: number[] = weatherData.hourly.wind_speed_10m || [];

      // Find current local hour index
      const now = new Date();
      const currentIsoHour = now.toISOString().slice(0, 13); // "YYYY-MM-DDTHH"

      let startIndex = times.findIndex((t) => t.startsWith(currentIsoHour));
      if (startIndex === -1) {
        // Fallback: match by local hour
        const currentHour = now.getHours();
        startIndex = times.findIndex((t) => {
          const pointHour = parseInt(t.split('T')[1].split(':')[0], 10);
          return pointHour === currentHour;
        });
      }
      if (startIndex === -1) startIndex = 0;

      const next24Times = times.slice(startIndex, startIndex + 24);
      const toNullableRound = (val: number | undefined | null): number | null => {
        return val !== undefined && val !== null && !isNaN(val) ? Math.round(val) : null;
      };

      const points: HourlyForecastPoint[] = next24Times.map((timeStr, idx) => {
        const fullIdx = startIndex + idx;
        const hour = parseInt(timeStr.split('T')[1].split(':')[0], 10);

        return {
          time: timeStr,
          hour,
          pm2_5: toNullableRound(pm25Arr[fullIdx]),
          pm10: toNullableRound(pm10Arr[fullIdx]),
          us_aqi: toNullableRound(usAqiArr[fullIdx]),
          temperature_2m: toNullableRound(tempArr[fullIdx]),
          relative_humidity_2m: toNullableRound(rhArr[fullIdx]),
          wind_speed_10m: toNullableRound(windArr[fullIdx]),
        };
      });

      const forecast: HourlyForecast = {
        updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'Forecast: Open-Meteo (CAMS)',
        points,
      };

      // Cache the result
      try {
        localStorage.setItem(cacheKey, JSON.stringify(forecast));
        localStorage.setItem(`${CACHE_PREFIX}_last`, JSON.stringify(forecast));
      } catch (e) {
        console.warn('Failed to cache forecast:', e);
      }

      return forecast;
    } catch (err) {
      console.warn('Failed to fetch from Open-Meteo, attempting cache retrieval:', err);
      // Attempt cache recovery
      try {
        const cached = localStorage.getItem(cacheKey) || localStorage.getItem(`${CACHE_PREFIX}_last`);
        if (cached) {
          const parsed = JSON.parse(cached) as HourlyForecast;
          return {
            ...parsed,
            source: `${parsed.source} (cached at ${parsed.updatedAt})`,
          };
        }
      } catch (cacheErr) {
        console.warn('Cache read error:', cacheErr);
      }

      // If network fails and no cache exists, throw or return baseline
      throw err;
    }
  }

  async searchPlaces(query: string): Promise<Place[]> {
    if (!query || query.trim().length < 2) return [];

    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        query.trim()
      )}&count=5`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Geocoding HTTP error: ${res.status}`);
      const data = await res.json();

      if (!data.results || !Array.isArray(data.results)) {
        return [];
      }

      return data.results.map((r: any) => ({
        id: r.id,
        name: r.name,
        admin1: r.admin1,
        country: r.country,
        latitude: r.latitude,
        longitude: r.longitude,
      }));
    } catch (err) {
      console.warn('Failed to search places via Open-Meteo geocoding:', err);
      return [];
    }
  }
}

export const openMeteoProvider = new OpenMeteoProvider();
