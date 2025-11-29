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
  
  // Image State Machine: 'loading' | 'loaded' | 'error'
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);

  useEffect(() => {
    // Helper to generate a high-quality AI image URL
    const getAiImage = () => {
      // Enhanced prompts for better visual quality
      const foodPrompt = `delicious korean food ${place.name}, cinematic lighting, 4k, photorealistic`;
      const travelPrompt = `beautiful scenery ${place.name} korea, cinematic, 4k, photorealistic`;
      
      const context = isFood ? foodPrompt : travelPrompt;
      return `https://image.pollinations.ai/prompt/${encodeURIComponent(context)}?nologo=true&width=400&height=300&seed=${place.id}`;
    };

    // 1. Try Real URL from API first (if it exists)
    if (place.imageUrl && place.imageUrl.startsWith('http')) {
      setCurrentSrc(place.imageUrl);
      setImageState('loading');
    } else {
      // 2. If no real URL, go straight to AI image (Fast path)
      setCurrentSrc(getAiImage());
      setImageState('loading');
    }
  }, [place, isFood]);

  const handleImageError = () => {
    // Re-calculate AI image URL here to check against
    const getAiImage = () => {
       const foodPrompt = `delicious korean food ${place.name}, cinematic lighting, 4k, photorealistic`;
       const travelPrompt = `beautiful scenery ${place.name} korea, cinematic, 4k, photorealistic`;
      const context = isFood ? foodPrompt : travelPrompt;
      return `https://image.pollinations.ai/prompt/${encodeURIComponent(context)}?nologo=true&width=400&height=300&seed=${place.id}`;
    };
    
    const aiUrl = getAiImage();

    // If we were trying a real URL (or something else) and it failed, fallback to AI image
    if (currentSrc !== aiUrl) {
      setCurrentSrc(aiUrl);
      setImageState('loading');
    } else {
      // If AI image also failed, show gradient placeholder
      setImageState('error');
    }
  };

  const handleImageLoad = () => {
    setImageState('loaded');
  };

  return (
    <div 
      onClick={() => onClick(place)}
      className={`bg-white rounded-xl shadow-md border border-slate-100 overflow-hidden cursor-pointer flex-shrink-0 relative transition-transform active:scale-[0.98] ${compact ? 'w-[280px] h-[120px] flex flex-row' : 'flex flex-col h-full'}`}
    >
      {/* Image Section */}
      <div className={`${compact ? 'w-32 h-full' : 'h-40 w-full'} bg-slate-200 relative overflow-hidden shrink-0`}>
        
        {/* Loading Indicator */}
        {imageState === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10">
            <Loader2 className="animate-spin text-slate-300" size={20} />
          </div>
        )}

        {/* The Image */}
        {imageState !== 'error' && currentSrc && (
          <img 
            src={currentSrc} 
            alt={place.name}
            className={`w-full h-full object-cover transition-opacity duration-500 ${imageState === 'loading' ? 'opacity-0' : 'opacity-100'}`}
            onError={handleImageError}
            onLoad={handleImageLoad}
            loading="lazy"
          />
        )}

        {/* Fallback Gradient */}
        {imageState === 'error' && (
          <div className={`absolute inset-0 bg-gradient-to-br ${isFood ? 'from-orange-100 to-amber-100' : 'from-blue-100 to-emerald-100'} flex items-center justify-center`}>
               {isFood ? <Coffee size={24} className="text-orange-300"/> : <Camera size={24} className="text-blue-300"/>}
          </div>
        )}

        {/* Rating Badge (Compact) */}
        <div className="absolute top-1 right-1 bg-white/95 backdrop-blur-md px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-sm z-20">
          <Star size={10} className="text-yellow-500 fill-yellow-500" />
          <span className="text-[10px] font-bold text-slate-700">{place.rating || 'N/A'}</span>
        </div>
      </div>
      
      {/* Content Section */}
      <div className={`p-3 flex flex-col flex-1 ${compact ? 'justify-center' : ''}`}>
        <h3 className="font-bold text-sm text-slate-800 leading-tight mb-1 line-clamp-2">{place.name}</h3>
        
        {!compact && (
           <p className="text-slate-500 text-xs line-clamp-2 mb-2">{place.description}</p>
        )}
        
        <div className="flex items-center gap-1 text-slate-400 text-[10px] mt-auto">
          <MapPin size={10} className="shrink-0"/>
          <span className="truncate max-w-[120px]">{place.address || 'Unknown'}</span>
        </div>

        {compact && (
          <div className="flex gap-1 mt-2">
             {place.tags && place.tags.slice(0, 1).map((t, i) => (
               <span key={i} className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">{t}</span>
             ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlaceCard;