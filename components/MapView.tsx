import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Place } from '../types';
import { Tab } from '../types';

type MapViewProps = {
  center?: [number, number];
  zoom?: number;
  markers?: Place[];
  onMarkerClick?: (place: Place) => void;
  onMapInit?: (map: L.Map) => void;
  activeTab: Tab;  //App에서 내려주는 탭 상태
};

export default function MapView({
  center,
  zoom = 13,
  markers = [],
  onMarkerClick,
  onMapInit,
  activeTab,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);

  // 지도 초기화
  useEffect(() => {
    // if (!containerRef.current || mapRef.current) return;
    if (!containerRef.current) return;
    if (mapRef.current) return;

    const map = L.map(containerRef.current);
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    if (onMapInit) onMapInit(map);

    return () => {
      map.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
    };
  }, [onMapInit]);

  // 위치 적용
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (center) {
      map.setView(center, zoom);
      return;
    }

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          map.setView(coords, zoom);
        },
        () => map.setView([37.5665, 126.9780], zoom),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, [center, zoom]);

  // 마커 관리
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (markerLayerRef.current) markerLayerRef.current.clearLayers();

    const layer = L.layerGroup();
    markerLayerRef.current = layer;
    layer.addTo(map);

    markers.forEach((place, i) => {
      const color = activeTab === 'food' ? '#00BFA6' : '#FF6B3D';
      
      const markerHtml = `
        <div style="
          width: 34px;
          height: 34px;
          background: ${color};
          border-radius: 50%;
          border: 3px solid #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 12px;
          font-weight: bold;
          box-shadow: 0px 4px 8px ${color}66;
        ">
          ${i + 1}
        </div>
      `;

      const markerIcon = L.divIcon({
        className: 'custom-marker',
        html: markerHtml,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
      });

      L.marker([place.latitude, place.longitude], { icon: markerIcon })
        .addTo(layer)
        .on('click', () => onMarkerClick?.(place));
    });
  }, [markers, onMarkerClick, activeTab]);


  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%' }}
      className="absolute inset-0"
    />
  );
}
