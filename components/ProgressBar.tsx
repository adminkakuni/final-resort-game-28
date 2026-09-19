import React from 'react';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ currentStep, totalSteps }) => {
  if (currentStep === 0) return null;

  const progress = Math.min(100, (currentStep / totalSteps) * 100);

  return (
    <div className="w-full fixed top-0 left-0 z-50">
      <div className="h-2 w-full bg-gray-100">
        <div 
          className="h-full rounded-r-full transition-all duration-700 ease-out"
          style={{ 
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #00d1a0, #00e3ae, #00c9d4)'
          }}
        />
      </div>
      <div className="absolute top-5 right-4 md:right-8 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-semibold text-gray-500 border border-gray-200/60 shadow-sm flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-[#00d1a0] animate-pulse"></span>
        Paso {currentStep} de {totalSteps}
      </div>
    </div>
  );
};