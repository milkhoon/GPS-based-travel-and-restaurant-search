export function getPlacePhotoUrl(photoRef: string, maxwidth = 400) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY; // ⬅ 수정

  if (!apiKey) {
    console.warn("Google API Key missing!");
    return null;
  }

  return `/google/maps/api/place/photo?maxwidth=${maxwidth}&photoreference=${photoRef}&key=${apiKey}`;
}
