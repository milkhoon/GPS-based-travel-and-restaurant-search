import { GoogleGenAI } from "@google/genai";
import { Coordinates, Place, ReviewSummary } from "../types";

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
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = category === 'food' 
    ? "Find 5 popular restaurants or cafes within a 3km radius of the provided location using Google Maps. Return a strict JSON array. Each object MUST include: 'id', 'name', 'description' (short), 'rating', 'address', 'category' ('restaurant'/'cafe'), 'tags', 'latitude' (number), 'longitude' (number). CRITICAL: If the map tool does not provide explicit latitude/longitude, you MUST estimate them based on the address. Do NOT return null for coordinates." 
    : "Find 5 interesting tourist spots or landmarks within a 5km radius of the provided location using Google Maps. Return a strict JSON array. Each object MUST include: 'id', 'name', 'description', 'rating', 'address', 'category' ('attraction'), 'tags', 'latitude' (number), 'longitude' (number). CRITICAL: If the map tool does not provide explicit latitude/longitude, you MUST estimate them based on the address. Do NOT return null for coordinates.";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: coords.latitude,
              longitude: coords.longitude,
            },
          },
        },
        systemInstruction: "You are a backend API that outputs ONLY JSON. Do not include conversational text, apologies, or markdown formatting outside the JSON array. Ensure 'latitude' and 'longitude' are always filled with numeric values.",
      },
    });

    const text = response.text || "[]";
    const cleanedText = cleanJsonString(text);
    
    try {
      const rawPlaces = JSON.parse(cleanedText);
      if (Array.isArray(rawPlaces)) {
        // Filter out nulls (failed sanitization)
        return rawPlaces.map((p) => sanitizePlace(p, coords)).filter((p): p is Place => p !== null);
      }
      return [];
    } catch (parseError) {
      console.error("Failed to parse places JSON:", text);
      return [];
    }

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const fetchPlaceReviews = async (placeName: string, locationStr: string): Promise<ReviewSummary> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Search for recent blog reviews and ratings for "${placeName}" near ${locationStr}. 
  Focus on famous Korean platforms like Naver Blog, Daum, or Google Reviews.
  
  Output a JSON object:
  {
    "summary": "A 2-3 sentence summary of the general sentiment.",
    "blogLinks": [
      { "title": "Review Title", "url": "URL", "source": "Naver/Google" }
    ]
  }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are a web researcher. Provide output in strict JSON format.",
      },
    });

    const text = response.text || "{}";
    const cleanedText = cleanJsonString(text);
    
    try {
      const data = JSON.parse(cleanedText);
      return sanitizeReview(data);
    } catch (parseError) {
      console.error("Failed to parse reviews JSON:", text);
      return {
        summary: "Could not analyze reviews at this moment.",
        blogLinks: []
      };
    }
  } catch (error) {
    console.error("Gemini API Error (Reviews):", error);
    throw error;
  }
};
