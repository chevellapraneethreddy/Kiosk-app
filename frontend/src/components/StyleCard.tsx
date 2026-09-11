import React from 'react';
import { Style } from '../types';
import { Card } from './Card';
import { Sparkles } from 'lucide-react';

interface StyleCardProps {
  style: Style;
  isSelected: boolean;
  onSelect: (style: Style) => void;
}

export const StyleCard: React.FC<StyleCardProps> = ({ style, isSelected, onSelect }) => {
  return (
    <Card
      selected={isSelected}
      onClick={() => onSelect(style)}
      className="group h-full flex flex-col justify-between"
    >
      <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden mb-4 bg-royal-900 border border-gold-500/20">
        <img
          src={style.thumbnailUrl}
          alt={style.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            // Fallback placeholder image gradient if image file missing
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-royal-900 via-transparent to-transparent opacity-60" />
        
        <span className="absolute top-3 left-3 bg-black/70 backdrop-blur-md text-gold-300 text-xs font-semibold px-3 py-1 rounded-full border border-gold-500/30">
          {style.category}
        </span>
      </div>

      <div className="flex flex-col">
        <h4 className="font-serif text-xl font-bold text-white group-hover:text-gold-400 transition-colors flex items-center justify-between">
          <span>{style.name}</span>
          <Sparkles className="w-4 h-4 text-gold-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </h4>
      </div>
    </Card>
  );
};
