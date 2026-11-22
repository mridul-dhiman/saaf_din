import { Profile } from './index';

export const DEMO_PROFILE: Profile = {
  location: {
    name: 'New Delhi, South Ext',
    lat: 28.57,
    lon: 77.22,
  },
  members: [
    {
      id: 'dadi',
      name: 'Dadi',
      ageGroup: 'elderly',
      sensitivities: ['elderly'],
      routine: {
        label: 'Morning balcony walk',
        start: '07:00',
        end: '08:00',
        outdoors: true,
        intensity: 'light',
      },
    },
    {
      id: 'aarav',
      name: 'Aarav',
      ageGroup: 'child',
      sensitivities: ['child'],
      routine: {
        label: 'Evening cricket coaching',
        start: '17:00',
        end: '18:30',
        outdoors: true,
        intensity: 'vigorous',
      },
    },
    {
      id: 'priya',
      name: 'Priya',
      ageGroup: 'adult',
      sensitivities: ['asthma'],
      routine: {
        label: 'Work commute',
        start: '08:30',
        end: '09:30',
        outdoors: false,
        intensity: 'light',
      },
    },
    {
      id: 'rohan',
      name: 'Rohan',
      ageGroup: 'adult',
      sensitivities: [],
      routine: {
        label: 'Work commute',
        start: '08:30',
        end: '09:30',
        outdoors: false,
        intensity: 'light',
      },
    },
  ],
  commute: {
    mode: 'car_petrol',
    distanceKm: 18,
    departs: '08:30',
    returns: '18:30',
  },
  cookingFuel: 'lpg',
  hasExhaust: true,
  hasPurifier: true,
  language: 'en',
};
