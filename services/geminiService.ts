import { Coordinates, Place, ReviewSummary } from "../types";
import { getPlacePhotoUrl } from "./googlePlace";

// Helper to extract the first valid JSON array from a string, ignoring conversational text
const cleanJsonString = (str: string): string => {
  // 1. Try to find a JSON array block [...]
  const arrayMatch = str.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    return arrayMatch[0];
  }
  
  // 2. Fallback: Clean markdown if regex didn't match (unlikely for array)
  let cleaned = str.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned;
};

// SAFETY: Sanitize Place object. 
const sanitizePlace = (place: any, searchCoords: Coordinates): Place | null => {
  // Parsing Logic for Coordinates
  const parsedLat = parseFloat(place.latitude);
  const parsedLng = parseFloat(place.longitude);
  
  // Validation 1: Must be a number and not NaN
  const isNumber = !isNaN(parsedLat) && !isNaN(parsedLng);
  
  // Validation 2: Must not be 0,0 (Atlantic Ocean)
  const isNotZero = parsedLat !== 0 && parsedLng !== 0;

  if (!isNumber || !isNotZero) {
    return null;
  }

  return {
    id: place.id ? String(place.id) : Math.random().toString(36).substr(2, 9),
    name: place.name || 'Unknown Place',
    description: place.description || 'No description available.',
    rating: typeof place.rating === 'number' ? place.rating : undefined,
    address: place.address || '',
    category: (place.category === 'restaurant' || place.category === 'cafe' || place.category === 'attraction') ? place.category : 'attraction',
    tags: Array.isArray(place.tags) 
      ? place.tags 
      : (typeof place.tags === 'string' ? place.tags.split(',').map((t: string) => t.trim()) : []),
    imageUrl: (typeof place.imageUrl === 'string' && place.imageUrl.startsWith('http')) ? place.imageUrl : undefined,
    latitude: parsedLat,
    longitude: parsedLng,
  };
};

// SAFETY: Sanitize Review object
const sanitizeReview = (data: any): ReviewSummary => {
  return {
    summary: data.summary || "No summary available.",
    blogLinks: Array.isArray(data.blogLinks) ? data.blogLinks : []
  };
};

export const fetchNearbyPlaces = async (
  coords: Coordinates,
  category: 'food' | 'travel'
): Promise<Place[]> => {
 // ⭐ Google API 기반으로 검색하도록 변경
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error("❌ Google Maps API Key not found in .env");
    return [];
  }

  const radius = category === "food" ? 1500 : 3000; // ⭐ Food와 Travel 반경 구분
  const type = category === "food" ? "restaurant" : "tourist_attraction";

  const url =
  `/google/maps/api/place/nearbysearch/json` +
  `?location=${coords.latitude},${coords.longitude}` +
  `&radius=${radius}&type=${type}&language=ko&key=${apiKey}`;


  console.log("📡 Google Places URL:", url);

  const res = await fetch(url);
  if (!res.ok) {
    console.error("❌ Google Places Request Failed:", res.status);
    return [];
  }

  const json = await res.json();
  console.log("📍 Google API status:", json.status);

  if (json.status !== "OK" && json.status !== "ZERO_RESULTS") {
    console.error("❌ Google API Error:", json.error_message);
    return [];
  }

  const elements = json.results || [];

  // ⭐ JSON → Place 데이터 변환
  const places: Place[] = elements.map((el: any, idx: number) => {
    const photoRef: string | undefined =
      el.photos?.[0]?.photo_reference;

    return {
      id: el.place_id,
      name: el.name ?? "Unknown",
      description: el.types?.[0] ?? "Unknown Place",
      rating: el.rating,
      address: el.vicinity ?? "",
      category: category === "food" ? "restaurant" : "attraction",
      tags: el.types || [],
      latitude: el.geometry.location.lat,
      longitude: el.geometry.location.lng,

      // ⭐ Photo URL 자동 생성
      photoRef,
      imageUrl: photoRef ? getPlacePhotoUrl(photoRef, 400) : undefined
    } as Place;
  });

  console.log("📍 변환된 Places:", places);

  // ⭐ 최대 카드 수 관리
  return places.slice(0, 12);
};


//   const data = await res.json();
//   const elements = Array.isArray(data.elements) ? data.elements : [];

//   const places: Place[] = elements.map((el: any, idx: number) => {
//     const lat = el.lat ?? el.center?.lat;
//     const lon = el.lon ?? el.center?.lon;
//     const name = el.tags?.name ?? el.tags?.['name:ko'] ?? el.tags?.['name:en'] ?? (category === 'food' ? 'Unknown Restaurant' : 'Unknown Spot');
//     const categoryMapped = amenities.length ? (el.tags?.amenity ?? 'restaurant') : (el.tags?.tourism ?? 'attraction');
//     const address = [el.tags?.addr_city, el.tags?.addr_district, el.tags?.addr_street, el.tags?.addr_housenumber].filter(Boolean).join(' ');

//     return {
//       id: `osm-${el.id}-${idx}`,
//       name,
//       description: el.tags?.description ?? (category === 'food' ? 'Local eatery or cafe.' : 'Tourist attraction nearby.'),
//       rating: undefined,
//       address,
//       category: categoryMapped,
//       tags: Object.keys(el.tags ?? {}),
//       imageUrl: undefined,
//       latitude: typeof lat === 'number' ? lat : parseFloat(lat),
//       longitude: typeof lon === 'number' ? lon : parseFloat(lon),
//     } as Place;
//   }).filter(p => Number.isFinite(p.latitude) && Number.isFinite(p.longitude));

//   // Deduplicate by name + coords
//   const seen = new Set<string>();
//   const unique = places.filter(p => {
//     const key = `${p.name}-${p.latitude.toFixed(5)}-${p.longitude.toFixed(5)}`;
//     if (seen.has(key)) return false;
//     seen.add(key);
//     return true;
//   });

//   // Limit to 12 results
//   return unique.slice(0, 12);
  
//   const prompt = category === 'food' 
//     ? "Find 5 popular restaurants or cafes within a 3km radius of the provided location using Google Maps. Return a strict JSON array. Each object MUST include: 'id', 'name', 'description' (short), 'rating', 'address', 'category' ('restaurant'/'cafe'), 'tags', 'latitude' (number), 'longitude' (number). CRITICAL: If the map tool does not provide explicit latitude/longitude, you MUST estimate them based on the address. Do NOT return null for coordinates." 
//     : "Find 5 interesting tourist spots or landmarks within a 5km radius of the provided location using Google Maps. Return a strict JSON array. Each object MUST include: 'id', 'name', 'description', 'rating', 'address', 'category' ('attraction'), 'tags', 'latitude' (number), 'longitude' (number). CRITICAL: If the map tool does not provide explicit latitude/longitude, you MUST estimate them based on the address. Do NOT return null for coordinates.";

//   // Removed external call
// };

// export const fetchPlaceReviews = async (placeName: string, locationStr: string): Promise<ReviewSummary> => {
//   // Dependency removed: return a simple placeholder review
//   console.warn("fetchPlaceReviews: External AI dependency removed. Returning placeholder review.");
//   return {
//     summary: `Reviews unavailable for ${placeName}.`,
//     blogLinks: []
//   };
  
//   const prompt = `Search for recent blog reviews and ratings for "${placeName}" near ${locationStr}. 
//   Focus on famous Korean platforms like Naver Blog, Daum, or Google Reviews.
  
//   Output a JSON object:
//   {
//     "summary": "A 2-3 sentence summary of the general sentiment.",
//     "blogLinks": [
//       { "title": "Review Title", "url": "URL", "source": "Naver/Google" }
//     ]
//   }
//   `;

//   // Removed external call
// };
