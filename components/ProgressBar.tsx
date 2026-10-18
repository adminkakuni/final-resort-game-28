import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  onBack?: () => void;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ currentStep, totalSteps, onBack }) => {
  if (currentStep === 0) return null;

  const progress = Math.min(100, (currentStep / totalSteps) * 100);

  return (
    // En móvil es una barra con fondo propio (flecha de volver + "Paso X de Y") para que
    // no tape el contenido al hacer scroll. En escritorio queda como antes: píldora flotante.
    <div className="w-full fixed top-0 left-0 z-50 bg-beige-100/95 backdrop-blur-md border-b border-gray-200/60 md:bg-transparent md:backdrop-blur-none md:border-0">
      <div className="h-2 w-full bg-gray-100">
        <div 
          className="h-full rounded-r-full transition-all duration-700 ease-out"
          style={{ 
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #00d1a0, #00e3ae, #00c9d4)'
          }}
        />
      </div>
      <div className="flex items-center justify-between px-3 py-2 md:p-0">
        {onBack ? (
          <button
            onClick={onBack}
            className="md:hidden p-2 -ml-1 text-gray-500 active:text-gray-900"
            aria-label="Volver al paso anterior"
          >
            <ArrowLeft size={22} />
          </button>
        ) : <span />}
        <div className="md:absolute md:top-5 md:right-8 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-semibold text-gray-500 border border-gray-200/60 shadow-sm flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-[#00d1a0] animate-pulse"></span>
          Paso {currentStep} de {totalSteps}
        </div>
      </div>
    </div>
  );
};
