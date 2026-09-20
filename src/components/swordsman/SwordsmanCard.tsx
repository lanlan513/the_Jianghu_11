import { Calendar, MapPin } from 'lucide-react';
import type { Swordsman } from '../../types';

interface SwordsmanCardProps {
  swordsman: Swordsman;
  delay?: number;
}

export default function SwordsmanCard({ swordsman, delay = 0 }: SwordsmanCardProps) {
  return (
    <div 
      className="ink-card p-4 flex gap-4 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms`, opacity: 0 }}
    >
      <div className="relative flex-shrink-0">
        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-ink-200 shadow-ink">
          <img
            src={swordsman.avatarUrl}
            alt={swordsman.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="absolute -bottom-1 -right-1 bg-cinnabar-600 text-ink-100 text-xs px-2 py-0.5 font-brush transform rotate-[-8deg]">
          {swordsman.dynasty}
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-brush text-xl text-ink-900">{swordsman.name}</h4>
          <span className="text-gold-600 text-xs font-song">「{swordsman.title}」</span>
        </div>
        
        <div className="flex items-center gap-3 text-xs text-ink-500 font-song mb-2">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {swordsman.dynasty}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {swordsman.sect}
          </span>
        </div>
        
        <p className="font-song text-sm text-ink-600 line-clamp-2 leading-relaxed">
          {swordsman.biography}
        </p>
      </div>
    </div>
  );
}
