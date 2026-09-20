import { MapPin, Flame } from 'lucide-react';
import type { Sect } from '../../types';

interface SectCardProps {
  sect: Sect;
  delay?: number;
}

export default function SectCard({ sect, delay = 0 }: SectCardProps) {
  return (
    <div 
      className="ink-card p-5 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms`, opacity: 0 }}
    >
      <div className="flex items-start gap-4">
        <div className="relative flex-shrink-0">
          <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-gold-200 shadow-gold transform rotate-3 hover:rotate-0 transition-transform duration-300">
            <img
              src={sect.emblemUrl}
              alt={sect.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-brush text-xl text-ink-900">{sect.name}</h4>
            <div className="flex items-center gap-1 text-xs text-gold-600">
              <Flame className="w-3 h-3" />
              <span>{sect.popularity.toLocaleString()}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-ink-500 font-song mb-2">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {sect.location}
            </span>
            <span className="text-bronze-600">创于{sect.foundingDynasty}</span>
          </div>
          
          <p className="font-song text-sm text-ink-600 line-clamp-2 leading-relaxed mb-3">
            {sect.description}
          </p>
          
          <div className="flex flex-wrap gap-1">
            {sect.skills.slice(0, 3).map((skill) => (
              <span 
                key={skill}
                className="text-xs bg-bronze-50 text-bronze-700 px-2 py-0.5 font-song border border-bronze-200"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
