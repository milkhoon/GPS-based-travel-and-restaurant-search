import React, { useEffect, useState } from 'react';
import { Place, ReviewSummary, Coordinates } from '../types';
// import { fetchPlaceReviews } from '../services/geminiService';
import { X, Globe, MessageCircle, MapPin, Loader2, Star, ExternalLink } from 'lucide-react';

interface ReviewModalProps {
  place: Place;
  userLocation: Coordinates;
  onClose: () => void;
}

const ReviewModal: React.FC<ReviewModalProps> = ({ place, userLocation, onClose }) => {
  const [reviews, setReviews] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadReviews = async () => {
      setLoading(true);
      try {
        // Create a rough location string for context
        const fakeReview = {
          summary: '리뷰 임시 패쇄',
          blogLinks: []
        };

        if (isMounted) setLoading(false);
      }catch (err) {
        console.error('❌ fetchPlaceReviews ERROR:', err);
      }finally{
        if (isMounted) setLoading(false);
      }
    };

    loadReviews();

    return () => { isMounted = false; };
  }, [place, userLocation]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative bg-white w-full sm:max-w-lg max-h-[90vh] sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-5 duration-300">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-800 leading-tight">{place.name}</h2>
            <div className="flex items-center gap-2 mt-1 text-slate-500 text-sm">
              <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wide">
                {place.category}
              </span>
              <span className="flex items-center gap-1">
                <Star size={12} className="fill-yellow-500 text-yellow-500"/> {place.rating}
              </span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 -mt-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-5 space-y-6">
          
          {/* Main Info */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-2 uppercase tracking-wider">About</h3>
            <p className="text-slate-600 leading-relaxed">{place.description}</p>
            {place.address && (
              <div className="mt-3 flex items-start gap-2 text-slate-500 text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
                <MapPin size={16} className="mt-0.5 shrink-0" />
                <span>{place.address}</span>
              </div>
            )}
          </div>

          {/* AI Analysis Section */}
          <div className="relative">
            <h3 className="text-sm font-semibold text-slate-900 mb-3 uppercase tracking-wider flex items-center gap-2">
              <MessageCircle size={16} className="text-indigo-500" />
              AI Review Analysis
            </h3>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Loader2 size={24} className="animate-spin text-indigo-500" />
                <p className="text-slate-400 text-sm">Researching local blogs & reviews...</p>
              </div>
            ) : reviews ? (
              <div className="space-y-4">
                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                  <p className="text-indigo-900 text-sm leading-relaxed">
                    <span className="font-bold mr-1">💡 Summary:</span>
                    {reviews.summary}
                  </p>
                </div>

                {reviews.blogLinks && reviews.blogLinks.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 mb-2 uppercase">Found Web Reviews</h4>
                    <div className="space-y-2">
                      {reviews.blogLinks.map((link, i) => (
                        <a 
                          key={i} 
                          href={link.url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all group"
                        >
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium text-slate-700 truncate group-hover:text-blue-700">{link.title}</span>
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Globe size={10} />
                              {link.source}
                            </span>
                          </div>
                          <ExternalLink size={14} className="text-slate-300 group-hover:text-blue-500 shrink-0 ml-2" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-slate-400 text-sm italic">No detailed reviews found.</div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
          <a 
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + ' ' + (place.address || ''))}`}
            target="_blank"
            rel="noreferrer"
            className="flex-1 bg-white border border-slate-300 text-slate-700 font-medium py-2.5 px-4 rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <MapPin size={18} />
            Open Maps
          </a>
          <a
             href={`https://search.naver.com/search.naver?query=${encodeURIComponent(place.name)}`}
             target="_blank"
             rel="noreferrer"
             className="flex-1 bg-[#03C75A] text-white font-medium py-2.5 px-4 rounded-xl hover:bg-[#02b351] active:bg-[#029f48] transition-colors flex items-center justify-center gap-2 shadow-sm shadow-green-200"
          >
            <span className="font-bold">N</span>
            Naver Search
          </a>
        </div>

      </div>
    </div>
  );
};

export default ReviewModal;
