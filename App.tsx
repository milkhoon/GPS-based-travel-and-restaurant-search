import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapPin, Navigation, Utensils, Compass, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { Coordinates, Place, AppState, Tab } from './types';
import { fetchNearbyPlaces } from './services/geminiService';
import PlaceCard from './components/PlaceCard';
import ReviewModal from './components/ReviewModal';

// Declare Leaflet globally for TS
declare const L: any;

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [lastSearchedCenter, setLastSearchedCenter] = useState<Coordinates | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.FOOD);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showSearchHere, setShowSearchHere] = useState(false);
  const [isMapLibraryLoaded, setIsMapLibraryLoaded] = useState(false);
  
  // Map Refs
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);

  // Derived state for map visibility
  const isMapMode = appState !== AppState.IDLE;

  // 1. Check if Leaflet is loaded
  useEffect(() => {
    const checkLeaflet = () => {
      if (typeof window !== 'undefined' && (window as any).L) {
        setIsMapLibraryLoaded(true);
      } else {
        setTimeout(checkLeaflet, 100);
      }
    };
    checkLeaflet();
  }, []);

  // 2. Initialize Map
  useEffect(() => {
    // Only initialize if we are in map mode and library is loaded
    if (!isMapLibraryLoaded || !isMapMode) return;

    // If map container doesn't exist yet, wait (React render cycle)
    const container = document.getElementById('map-container');
    if (!container) return;

    // Initialize Map
    if (!mapRef.current) {
      console.log("Initializing Leaflet Map...");
      const map = L.map('map-container', {
        zoomControl: false,
        attributionControl: false,
        zoomSnap: 0.5
      }).setView([37.5665, 126.9780], 7);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
      }).addTo(map);

      // Event: Detect drag to show "Search Here" button
      map.on('moveend', () => {
        setShowSearchHere(true);
      });

      mapRef.current = map;
      
      // Force a resize to prevent gray tiles
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    }

    // Cleanup function: Essential for React Strict Mode to prevent double-init or ghost maps
    return () => {
      if (mapRef.current) {
        console.log("Cleaning up Leaflet Map...");
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current = [];
        userMarkerRef.current = null;
      }
    };
  }, [isMapLibraryLoaded, isMapMode]);

  // 3. Sync User Location Marker
  useEffect(() => {
    if (!mapRef.current || !userLocation) return;

    if (!userMarkerRef.current) {
      const userIcon = L.divIcon({
        className: 'user-marker',
        html: `<div class="w-5 h-5 bg-blue-500 rounded-full border-2 border-white shadow-lg relative flex items-center justify-center">
                 <div class="absolute -inset-3 bg-blue-500 rounded-full opacity-20 animate-ping"></div>
                 <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
               </div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });
      userMarkerRef.current = L.marker([userLocation.latitude, userLocation.longitude], { icon: userIcon, zIndexOffset: 1000 }).addTo(mapRef.current);
      
      // Fly to location on first load
      mapRef.current.flyTo([userLocation.latitude, userLocation.longitude], 15, { duration: 1.5 });
    } else {
      userMarkerRef.current.setLatLng([userLocation.latitude, userLocation.longitude]);
    }
  }, [userLocation]);

  // 4. Update Place Markers
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    if (places && places.length > 0) {
      places.forEach((place, index) => {
        const isFood = place.category === 'restaurant' || place.category === 'cafe';
        const colorClass = isFood ? 'bg-orange-500' : 'bg-emerald-500';
        
        const iconHtml = `
          <div class="${colorClass} w-9 h-9 rounded-full border-[3px] border-white shadow-lg flex items-center justify-center text-white transform transition-transform hover:scale-110 active:scale-95">
             <span class="font-bold text-[10px]">${index + 1}</span>
          </div>
        `;

        const customIcon = L.divIcon({
          className: 'custom-pin',
          html: iconHtml,
          iconSize: [36, 36],
          iconAnchor: [18, 36],
          popupAnchor: [0, -36]
        });

        const marker = L.marker([place.latitude, place.longitude], { icon: customIcon })
          .addTo(mapRef.current)
          .bindPopup(`
            <div class="text-center min-w-[120px]">
              <div class="font-bold text-slate-800 mb-1">${place.name}</div>
              <div class="text-xs text-slate-500">Tap for details</div>
            </div>
          `, { closeButton: false });
        
        marker.on('click', () => {
          setSelectedPlace(place);
        });

        markersRef.current.push(marker);
      });
      
      // Fit bounds to show all markers if we have results
      if (places.length > 0) {
        const group = L.featureGroup(markersRef.current);
        // Include user location in bounds
        if (userMarkerRef.current) group.addLayer(userMarkerRef.current);
        mapRef.current.fitBounds(group.getBounds(), { padding: [50, 50], maxZoom: 16 });
      }
    }
  }, [places]);

  const requestLocation = useCallback(() => {
    setAppState(AppState.REQUESTING_LOCATION);
    setErrorMsg(null);

    if (!navigator.geolocation) {
      setErrorMsg("Geolocation not supported.");
      setAppState(AppState.ERROR);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setUserLocation(coords);
        loadPlaces(coords); 
      },
      (error) => {
        console.error(error);
        setErrorMsg("Location access denied. Please enable GPS.");
        setAppState(AppState.ERROR);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  }, []);

  const loadPlaces = async (searchCenter: Coordinates) => {
    setAppState(AppState.LOADING_PLACES);
    setErrorMsg(null);
    setShowSearchHere(false);
    setLastSearchedCenter(searchCenter);
    setSelectedPlace(null);
    setPlaces([]); // Clear previous

    try {
      const results = await fetchNearbyPlaces(searchCenter, activeTab);
      setPlaces(results);
      setAppState(AppState.VIEWING_LIST);
    } catch (err) {
      console.error(err);
      // Even if error, we stay in map view so user can try again
      setAppState(AppState.VIEWING_LIST);
      setErrorMsg("Could not find places. Try a different area.");
    }
  };

  const handleSearchHere = () => {
    if (mapRef.current) {
      const center = mapRef.current.getCenter();
      loadPlaces({ latitude: center.lat, longitude: center.lng });
    }
  };

  useEffect(() => {
    if (lastSearchedCenter) {
      loadPlaces(lastSearchedCenter);
    }
  }, [activeTab]);


  // 1. Landing Screen
  if (appState === AppState.IDLE) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 px-6 text-center z-50 relative">
        <div className="bg-blue-100 p-8 rounded-full mb-6 shadow-inner">
          <MapPin size={64} className="text-blue-600 drop-shadow-md" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 mb-4 tracking-tight">GeoTasty Map</h1>
        <p className="text-slate-500 mb-8 max-w-xs leading-relaxed">
          Discover local hidden gems based on your location.
        </p>
        <button
          onClick={requestLocation}
          disabled={!isMapLibraryLoaded}
          className="bg-blue-600 text-white font-bold py-4 px-10 rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isMapLibraryLoaded ? <Navigation size={20} /> : <Loader2 size={20} className="animate-spin" />}
          {isMapLibraryLoaded ? 'Start Exploring' : 'Loading Map...'}
        </button>
      </div>
    );
  }

  // 2. Main Map Screen
  return (
    <div className="h-screen w-full relative flex flex-col bg-slate-200 overflow-hidden">
      
      {/* Map Container */}
      {/* Use style attribute to force dimensions if tailwind fails */}
      <div 
        id="map-container" 
        className="absolute inset-0 z-0 bg-slate-200"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Top UI */}
      <div className="absolute top-0 left-0 right-0 z-30 p-4 pt-6 flex flex-col items-center gap-3 pointer-events-none">
        
        {/* Tab Switcher */}
        <div className="flex gap-2 w-full max-w-sm pointer-events-auto shadow-xl rounded-2xl bg-white/95 backdrop-blur p-1.5">
          <button
            onClick={() => setActiveTab(Tab.FOOD)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === Tab.FOOD ? 'bg-blue-500 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'
            }`}
          >
            <Utensils size={16} />
            Food
          </button>
          <button
            onClick={() => setActiveTab(Tab.TRAVEL)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === Tab.TRAVEL ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'
            }`}
          >
            <Compass size={16} />
            Travel
          </button>
        </div>

        {/* Search Here Button (Shown on move OR if no results) */}
        {(showSearchHere || (appState === AppState.VIEWING_LIST && places.length === 0)) && appState !== AppState.LOADING_PLACES && (
          <button 
            onClick={handleSearchHere}
            className="pointer-events-auto animate-in slide-in-from-top-4 fade-in duration-300 bg-slate-900 text-white font-bold py-2.5 px-6 rounded-full shadow-lg flex items-center gap-2 text-sm hover:bg-slate-800 active:scale-95 transition-all"
          >
            <RefreshCw size={14} />
            {places.length === 0 ? 'Search Wider Area' : 'Search This Area'}
          </button>
        )}
      </div>

      {/* Loading Indicator */}
      {appState === AppState.LOADING_PLACES && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/20 backdrop-blur-[1px]">
          <div className="bg-white/90 backdrop-blur px-6 py-4 rounded-2xl shadow-2xl flex flex-col items-center gap-3">
            <Loader2 size={32} className="animate-spin text-blue-600" />
            <span className="font-semibold text-slate-800 text-sm">Finding best spots nearby...</span>
          </div>
        </div>
      )}

      {/* No Results / Empty State */}
      {appState === AppState.VIEWING_LIST && places.length === 0 && !errorMsg && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 text-center pointer-events-none">
          <div className="bg-white/90 backdrop-blur p-6 rounded-3xl shadow-xl max-w-xs mx-auto border border-white/50">
            <div className="bg-slate-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="text-slate-400" size={24} />
            </div>
            <h3 className="font-bold text-slate-800 mb-1">No results nearby</h3>
            <p className="text-slate-500 text-sm mb-0 leading-snug">
              We couldn't find popular places right here.
            </p>
            <p className="text-blue-600 text-xs font-bold mt-2">
              Try zooming out or moving the map!
            </p>
          </div>
        </div>
      )}

      {/* Error State Overlay */}
      {errorMsg && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 bg-white p-6 rounded-2xl shadow-2xl text-center max-w-xs pointer-events-auto">
          <AlertCircle className="text-red-500 mx-auto mb-3" size={32} />
          <p className="text-slate-800 mb-4 font-medium">{errorMsg}</p>
          <button 
            onClick={() => setErrorMsg(null)} 
            className="bg-slate-100 text-slate-700 px-6 py-2.5 rounded-xl text-sm font-bold active:scale-95 transition-transform"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Bottom Cards */}
      <div className={`absolute bottom-0 left-0 right-0 z-30 transition-transform duration-300 ${places.length > 0 ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="bg-gradient-to-t from-slate-900/10 to-transparent pb-6 pt-10 px-0">
          <div className="overflow-x-auto flex gap-4 px-6 snap-x snap-mandatory no-scrollbar pb-2">
            {places.map((place, i) => (
               <div key={place.id} className="snap-center shrink-0 relative">
                  <div className="absolute -top-3 -left-2 bg-slate-900 text-white text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow z-10">
                    {i + 1}
                  </div>
                  <PlaceCard place={place} onClick={setSelectedPlace} compact={true} />
               </div>
            ))}
            {/* Spacer */}
            <div className="w-2 shrink-0"></div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {selectedPlace && userLocation && (
        <ReviewModal 
          place={selectedPlace} 
          userLocation={userLocation}
          onClose={() => setSelectedPlace(null)} 
        />
      )}
    </div>
  );
};

export default App;