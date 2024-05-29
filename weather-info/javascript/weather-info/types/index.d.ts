// declarations for weather-js are necessary to use it in TypeScript

declare module 'weather-js';

interface WeatherDetails {
  location: string;
  current: string;
  forecast: string;
}
