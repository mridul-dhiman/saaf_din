import { HourlyForecast } from '../../types';

export interface Place {
  id: number;
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
}

export interface ForecastProvider {
  getHourly(lat: number, lon: number): Promise<HourlyForecast>;
  searchPlaces(query: string): Promise<Place[]>;
}
