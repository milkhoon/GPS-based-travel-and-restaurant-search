import { useState, useEffect, useCallback, useRef } from 'react';
import { Tab } from './types';
import MapView from './components/MapView';
import PlaceCard from './components/PlaceCard';
import ReviewModal from './components/ReviewModal';
import { fetchNearbyPlaces } from './services/geminiService';
import { Place } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.FOOD);
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const mapRef = useRef<any>(null);

  const [showSearchHere, setShowSearchHere] = useState(false);
  const [loading, setLoading] = useState(false);

  // ⭐ 테마 적용 (Food / Travel에 따라 색 변경)
  const theme = activeTab === Tab.FOOD
    ? { color: '#00BFA6', dark: '#008A78' } // Mint Wave
    : { color: '#FF6B3D', dark: '#DB4C23' }; // Sunset Wave

  const handleMapInit = useCallback((map: any) => {
    mapRef.current = map;
    map.on('moveend', () => setShowSearchHere(true));
  }, []);

  // ⭐ 검색 함수
  const loadPlaces = async (center: [number, number]) => {
    setLoading(true);
    setShowSearchHere(false);

    try {
      const data = await fetchNearbyPlaces(
        { latitude: center[0], longitude: center[1] },
        activeTab
      );
      setPlaces(data);
    } catch (err) {
      console.error('❌ fetchNearbyPlaces ERROR:', err);
      setPlaces([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!userLocation) {
      if (!navigator.geolocation) return;

      navigator.geolocation.getCurrentPosition((pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(coords);
        loadPlaces(coords);
      });
    }
  }, [userLocation]);

  useEffect(() => {
    if (userLocation) loadPlaces(userLocation);
  }, [activeTab]);

  const handleSearchHere = () => {
    if (!mapRef.current) return;
    const center = mapRef.current.getCenter();
    loadPlaces([center.lat, center.lng]);
  };

  return (
    <div className="h-screen w-full relative overflow-hidden">

      <MapView
        center={userLocation || undefined}
        zoom={14}
        onMapInit={handleMapInit}
        markers={places}
        onMarkerClick={setSelectedPlace}
        activeTab={activeTab}
      />

      {/* Tabs */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
        <div className="bg-white shadow px-2 py-2 rounded-2xl flex gap-2">
          <button
            onClick={() => setActiveTab(Tab.FOOD)}
            className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all
              ${activeTab === Tab.FOOD
              ? 'bg-[#00BFA6] text-white shadow-md scale-105'
              : 'text-slate-500 hover:bg-slate-100'}
            `}
            style={activeTab === Tab.FOOD ? { backgroundColor: theme.color } : {}}
          >
            🍽️ 음식
          </button>

          <button
            onClick={() => setActiveTab(Tab.TRAVEL)}
            className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all
               ${activeTab === Tab.TRAVEL
              ? 'bg-[#FF6B3D] text-white shadow-md scale-105'
              : 'text-slate-500 hover:bg-slate-100'}
            `}
            style={activeTab === Tab.TRAVEL ? { backgroundColor: theme.color } : {}}
          >
            🧳 여행
          </button>
        </div>
      </div>

      {/* Search This Area */}
      {showSearchHere && !loading && (
          <button
            onClick={handleSearchHere}
            className={`fixed top-[80px] left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full font-bold transition
              ${activeTab === Tab.FOOD
                ? 'bg-[#00BFA6] hover:bg-[#008A78]'
                : 'bg-[#FF6B3D] hover:bg-[#DB4C23]'
              } text-white shadow-lg`}
  >
    새로운 장소에서 검색
  </button>
)}
      {/* Cards */}
      {places.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 py-4 px-3">
          <div className="flex gap-3 overflow-x-auto">
            {places.map((p) => (
              <PlaceCard
                key={p.id}
                place={p}
                onClick={() => {
                  setSelectedPlace(p);
                  mapRef.current?.flyTo([p.latitude, p.longitude], 16);
                }}
                compact
              />
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {selectedPlace && (
        <ReviewModal
          place={selectedPlace}
          userLocation={
            userLocation
              ? { latitude: userLocation[0], longitude: userLocation[1] }
              : undefined
          }
          onClose={() => setSelectedPlace(null)}
        />
      )}
    </div>
  );
}
