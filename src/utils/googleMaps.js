// One Google Maps loader for the whole app. @react-google-maps/api throws if
// the script is requested twice with different options, so every map
// (EstateMap, the site map, place search) uses exactly these.
import { useJsApiLoader } from '@react-google-maps/api';

export const GOOGLE_MAPS_LIBRARIES = ['places'];
export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export const GOOGLE_LOADER_OPTIONS = {
  id: 'google-map-script',
  googleMapsApiKey: GOOGLE_MAPS_API_KEY || '',
  libraries: GOOGLE_MAPS_LIBRARIES,
};

export const useGoogleMaps = () => useJsApiLoader(GOOGLE_LOADER_OPTIONS);

export const directionsTo = (p) => (p?.lat != null
  ? `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}${p.googlePlaceId ? `&destination_place_id=${p.googlePlaceId}` : ''}`
  : null);
