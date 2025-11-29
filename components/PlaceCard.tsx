import React, { useState, useEffect } from 'react';
import { Place } from '../types';
import { MapPin, Star, Coffee, Camera, Loader2, AlertCircle } from 'lucide-react';

interface PlaceCardProps {
  place: Place;
  onClick: (place: Place) => void;
  compact?: boolean;
}

const PlaceCard: React.FC<PlaceCardProps> = ({ place, onClick, compact = false }) => {
  const isFood = place.category === 'restaurant' || place.category === 'cafe';
  
  // Text-only compact card: remove external image loading for clarity

  return (
    <div 
      onClick={() => onClick(place)}
      className={`bg-white/95 backdrop-blur rounded-2xl shadow-xl border border-white/60 overflow-hidden cursor-pointer flex-shrink-0 relative transition-transform active:scale-[0.98] ${compact ? 'w-[280px] h-[120px] flex flex-row' : 'flex flex-col h-full'}`}
    >
      {/* Content Section: text-only */}
      <div className={`p-3 flex flex-col flex-1 ${compact ? 'justify-center' : ''}`}>
        <h3 className="font-bold text-sm text-slate-800 leading-tight mb-1 line-clamp-2">{place.name}</h3>
        <p className="text-slate-500 text-xs line-clamp-2 mb-2">{place.description}</p>
        
        <div className="flex items-center gap-1 text-slate-600 text-[10px] mt-auto">
          <MapPin size={10} className="shrink-0"/>
          <span className="truncate max-w-[120px]">{place.address || 'Unknown'}</span>
        </div>

        {compact && (
          <div className="flex gap-1 mt-2">
             {place.tags && place.tags.slice(0, 1).map((t, i) => (
               <span key={i} className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">{t}</span>
             ))}
          </div>
        )}

        {/* Small category badge */}
        <div className="absolute top-2 right-2 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow">
          {isFood ? 'FOOD' : 'TRAVEL'}
        </div>
      </div>
    </div>
  );
};

export default PlaceCard;