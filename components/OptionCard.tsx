import React from 'react';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';

interface OptionCardProps {
  id: string; // A, B, C
  label: string;
  description?: string;
  chip?: string;
  imageUrl?: string;
  selected: boolean;
  onClick: () => void;
  isImageLessInImageGrid?: boolean;
  isHighlighted?: boolean;
  index?: number; // For stagger animation
}

export const OptionCard: React.FC<OptionCardProps> = ({ id, label, description, chip, imageUrl, selected, onClick, isImageLessInImageGrid, isHighlighted, index = 0 }) => {
  const staggerDelay = index * 0.08;

  if (imageUrl) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: staggerDelay, ease: 'easeOut' }}
        onClick={onClick}
        className={`
          relative cursor-pointer group rounded-2xl overflow-hidden transition-all duration-500 h-[320px] md:h-[450px] shadow-lg border-2
          ${selected 
            ? 'border-[#00d1a0] ring-4 ring-[#00d1a0]/20 scale-[0.98]' 
            : 'border-transparent hover:border-white/40 hover:scale-[1.02]'
          }
        `}
        role="radio"
        aria-checked={selected}
        aria-label={`Opción ${id}: ${label}`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
      >
        <img src={imageUrl} alt={label} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

        {selected && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            className="absolute top-4 right-4 w-10 h-10 bg-[#00d1a0] rounded-full flex items-center justify-center shadow-xl z-20 border-2 border-white"
          >
            <Check size={20} className="text-white" strokeWidth={4} />
          </motion.div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8 z-10">
          <div className="flex flex-wrap items-center gap-2 font-bold text-xl md:text-3xl text-white drop-shadow-md leading-tight">
            <span>{label}</span>
            {chip && (
              <span className="inline-flex items-center rounded-full bg-white/25 backdrop-blur-sm px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide whitespace-nowrap text-white">
                {chip}
              </span>
            )}
          </div>
          {description && (
            <div className="text-[15px] md:text-lg font-normal text-white/90 mt-2 md:mt-3 whitespace-pre-wrap leading-relaxed drop-shadow-sm line-clamp-3 md:line-clamp-none">
              {description}
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  if (isImageLessInImageGrid) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: staggerDelay, ease: 'easeOut' }}
        onClick={onClick}
        className={`
          cursor-pointer group flex flex-col items-center justify-center text-center gap-2 p-4 rounded-xl border transition-all duration-200 overflow-hidden w-full aspect-[4/3]
          ${selected 
            ? 'bg-[#00d1a0] border-[#00d1a0] text-white shadow-md transform scale-[1.01]' 
            : isHighlighted
              ? 'bg-blue-50 border-blue-200 text-blue-900 hover:border-blue-400 hover:shadow-sm'
              : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400 hover:shadow-sm'
          }
        `}
        role="radio"
        aria-checked={selected}
        aria-label={`Opción ${id}: ${label}`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
      >
        {selected && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            className="absolute top-3 right-3 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md z-20"
          >
            <Check size={14} className="text-gray-900" strokeWidth={4} />
          </motion.div>
        )}
        <div className={`font-bold text-lg md:text-xl leading-tight ${selected ? 'text-white' : isHighlighted ? 'text-blue-900' : 'text-gray-900'}`}>
          {label}
        </div>
        {description && (
          <div className={`mt-1 md:mt-2 text-sm md:text-base leading-relaxed whitespace-pre-wrap ${selected ? 'text-white/90' : isHighlighted ? 'text-blue-700' : 'text-gray-500'}`}>
            {description}
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: staggerDelay, ease: 'easeOut' }}
      onClick={onClick}
      className={`
        cursor-pointer group flex flex-col sm:flex-row items-start gap-4 p-4 rounded-xl border transition-all duration-200 overflow-hidden w-full relative
        ${selected 
          ? 'bg-[#00d1a0] border-[#00d1a0] text-white shadow-md transform scale-[1.01]' 
          : isHighlighted
            ? 'bg-blue-50 border-blue-200 text-blue-900 hover:border-blue-400 hover:shadow-sm'
            : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400 hover:shadow-sm'
        }
      `}
      role="radio"
      aria-checked={selected}
      aria-label={`Opción ${id}: ${label}`}
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
            flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border transition-all duration-200
            ${selected
              ? 'bg-white text-gray-900 border-white'
              : isHighlighted
                ? 'bg-blue-100 text-blue-700 border-blue-200 group-hover:border-blue-400'
                : 'bg-gray-100 text-gray-500 border-gray-200 group-hover:border-gray-400'
            }
          `}>
            {selected ? <Check size={14} strokeWidth={3} className="text-[#00d1a0]" /> : id}
          </div>
        )}
        <div className="flex-1">
          <div className={`flex flex-wrap items-center gap-2 font-bold text-lg md:text-xl leading-tight ${selected ? 'text-white' : isHighlighted ? 'text-blue-900' : 'text-gray-900'}`}>
            <span>{label}</span>
            {chip && (
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide whitespace-nowrap ${
                selected
                  ? 'bg-white/25 text-white'
                  : isHighlighted
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-[#00d1a0]/15 text-[#00a884]'
              }`}>
                {chip}
              </span>
            )}
          </div>
          {description && (
            <div className={`mt-1 md:mt-2 text-sm md:text-base leading-relaxed whitespace-pre-wrap ${selected ? 'text-white/90' : isHighlighted ? 'text-blue-700' : 'text-gray-500'}`}>
              {description}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};