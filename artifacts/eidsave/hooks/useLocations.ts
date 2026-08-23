import { useState, useEffect } from "react";

export type LocationsMap = Record<string, Record<string, string[]>>;

const rawBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || "https://eidsave-monorepo.onrender.com";
const BASE_URL = rawBaseUrl.replace(/\/api\/?$/, "").replace(/\/+$/, "");

export function useLocations() {
  const [locations, setLocations] = useState<LocationsMap>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadLocations() {
      try {
        const res = await fetch(`${BASE_URL}/api/v1/locations/config`, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        if (isMounted && data?.data) {
          setLocations(data.data);
        }
      } catch (err) {
        console.warn("Failed to load live locations, using local fallback", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadLocations();

    return () => {
      isMounted = false;
    };
  }, []);

  const getStates = () => Object.keys(locations).sort();
  const getCities = (state?: string) => (state && locations[state] ? Object.keys(locations[state]).sort() : []);
  const getAreas = (state?: string, city?: string) => (state && city && locations[state]?.[city]) || [];

  return { locations, getStates, getCities, getAreas, isLoading };
}