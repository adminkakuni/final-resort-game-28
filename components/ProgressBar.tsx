import React from 'react';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ currentStep, totalSteps }) => {
  // We offset by 1 because Intro (index 0) is not "Step 1" usually in UI, 
  // but let's follow the prompt which implies progress during the questions.
  // Step 1 (Vibe) is index 1.
  
  if (currentStep === 0) return null; // No bar on intro

  const progress = Math.min(100, (currentStep / totalSteps) * 100);

  return (
    <div className="w-full fixed top-0 left-0 z-50">
      <div className="h-1.5 w-full bg-gray-200">
        <div 
          className="h-full bg-gray-900 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="absolute top-4 right-4 md:right-8 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-gray-600 border border-gray-200 shadow-sm">
        Paso {currentStep} de {totalSteps}
      </div>
    </div>
  );
};