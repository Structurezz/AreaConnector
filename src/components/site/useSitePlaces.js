import { useEffect, useState } from 'react';
import { placeAPI } from '../../api';

// Places on the site map (empty if none, or the server doesn't have them yet)
export default function useSitePlaces() {
  const [places, setPlaces] = useState([]);
  useEffect(() => {
    let alive = true;
    placeAPI.list().then(({ data }) => { if (alive) setPlaces(data.data || []); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  return places;
}
