import React from 'react';
import { Check } from 'lucide-react';

interface OptionCardProps {
  id: string; // A, B, C
  label: string;
  description?: string;
  imageUrl?: string;
  selected: boolean;
  onClick: () => void;
  isImageLessInImageGrid?: boolean;
  isHighlighted?: boolean;
}

export const OptionCard: React.FC<OptionCardProps> = ({ id, label, description, imageUrl, selected, onClick, isImageLessInImageGrid, isHighlighted }) => {
  if (imageUrl) {
    return (
      <div 
        onClick={onClick}
        className={`
          relative cursor-pointer group rounded-xl overflow-hidden transition-all duration-200 flex flex-col h-full bg-white border-2
          ${selected 
            ? 'border-gray-900 shadow-md scale-[0.98]' 
            : 'border-transparent hover:border-gray-200 hover:shadow-sm'
          }
        `}
        role="radio"
        aria-checked={selected}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
      >
        <div className="relative aspect-[4/3] w-full flex-shrink-0">
          <img src={imageUrl} alt={label} className="absolute inset-0 w-full h-full object-cover" referrerPolicy="no-referrer" />
          {selected && (
            <div className="absolute top-3 right-3 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg z-10">
              <Check size={16} className="text-gray-900" strokeWidth={3} />
            </div>
          )}
        </div>
        
        <div className="p-4 flex flex-col flex-grow">
          <div className={`font-bold text-base md:text-lg leading-tight ${selected ? 'text-gray-900' : 'text-gray-800'}`}>
            {label}
          </div>
          {description && (
            <div className="text-sm font-normal text-gray-600 mt-2 whitespace-pre-wrap">
              {description}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isImageLessInImageGrid) {
    return (
      <div 
        onClick={onClick}
        className={`
          cursor-pointer group flex flex-col items-center justify-center text-center gap-2 p-4 rounded-xl border transition-all duration-200 overflow-hidden w-full aspect-[4/3]
          ${selected 
            ? 'bg-gray-900 border-gray-900 text-white shadow-md transform scale-[1.01]' 
            : isHighlighted
              ? 'bg-blue-50 border-blue-200 text-blue-900 hover:border-blue-400 hover:shadow-sm'
              : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400 hover:shadow-sm'
          }
        `}
        role="radio"
        aria-checked={selected}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
      >
        <div className={`font-semibold text-lg leading-tight ${selected ? 'text-white' : isHighlighted ? 'text-blue-900' : 'text-gray-900'}`}>
          {label}
        </div>
        {description && (
          <div className={`mt-1 text-sm leading-relaxed whitespace-pre-wrap ${selected ? 'text-gray-300' : isHighlighted ? 'text-blue-700' : 'text-gray-500'}`}>
            {description}
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      onClick={onClick}
      className={`
        cursor-pointer group flex flex-col sm:flex-row items-start gap-4 p-4 rounded-xl border transition-all duration-200 overflow-hidden w-full
        ${selected 
          ? 'bg-gray-900 border-gray-900 text-white shadow-md transform scale-[1.01]' 
          : isHighlighted
            ? 'bg-blue-50 border-blue-200 text-blue-900 hover:border-blue-400 hover:shadow-sm'
            : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400 hover:shadow-sm'
        }
      `}
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="flex items-start gap-4 w-full">
        {id.length === 1 && (
          <div className={`
            flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border
            ${selected
              ? 'bg-white text-gray-900 border-white'
              : isHighlighted
                ? 'bg-blue-100 text-blue-700 border-blue-200 group-hover:border-blue-400'
                : 'bg-gray-100 text-gray-500 border-gray-200 group-hover:border-gray-400'
            }
          `}>
            {id}
          </div>
        )}
        <div className="flex-1">
          <div className={`font-semibold text-lg leading-tight ${selected ? 'text-white' : isHighlighted ? 'text-blue-900' : 'text-gray-900'}`}>
            {label}
          </div>
          {description && (
            <div className={`mt-1 text-sm leading-relaxed whitespace-pre-wrap ${selected ? 'text-gray-300' : isHighlighted ? 'text-blue-700' : 'text-gray-500'}`}>
              {description}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};