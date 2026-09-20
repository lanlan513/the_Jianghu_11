import { Link } from 'react-router-dom';
import { Flame, Eye } from 'lucide-react';
import type { Sword } from '../../types';

interface SwordCardProps {
  sword: Sword;
  delay?: number;
}

export default function SwordCard({ sword, delay = 0 }: SwordCardProps) {
  return (
    <Link
      to={`/swords/${sword.id}`}
      className="ink-card group animate-fade-in-up"
      style={{ animationDelay: `${delay}ms`, opacity: 0 }}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={sword.imageUrl}
          alt={sword.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <div className="absolute top-3 left-3">
          <span className="seal-stamp text-xs">{sword.alias}</span>
        </div>
        
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-ink-900/60 backdrop-blur-sm px-2 py-1 text-xs text-gold-400">
          <Flame className="w-3 h-3" />
          <span>{sword.popularity.toLocaleString()}</span>
        </div>
        
        <div className="absolute bottom-3 right-3 flex items-center gap-1 text-ink-100 text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Eye className="w-3 h-3" />
          <span>查看详情</span>
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-brush text-2xl text-ink-900 group-hover:text-cinnabar-600 transition-colors">
            {sword.name}
          </h3>
          <span className="text-xs text-ink-500 font-song bg-ink-100 px-2 py-1">
            {sword.dynasty}
          </span>
        </div>
        
        <p className="font-song text-sm text-ink-600 line-clamp-2 leading-relaxed mb-3">
          {sword.description}
        </p>
        
        <div className="flex items-center justify-between text-xs text-ink-500 font-song">
          <span>剑主：{sword.owner}</span>
          <span className="text-bronze-600">{sword.sect}</span>
        </div>
        
        <div className="mt-4 grid grid-cols-4 gap-2">
          {[
            { label: '锋利', value: sword.attributes.sharpness },
            { label: '硬度', value: sword.attributes.hardness },
            { label: '柔韧', value: sword.attributes.flexibility },
            { label: '工艺', value: sword.attributes.craftsmanship },
          ].map((attr) => (
            <div key={attr.label} className="text-center">
              <div className="text-xs text-ink-400 font-song mb-1">{attr.label}</div>
              <div className="sword-attribute-bar">
                <div 
                  className="sword-attribute-bar-fill"
                  style={{ width: `${attr.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Link>
  );
}
