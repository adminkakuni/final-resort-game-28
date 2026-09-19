import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "py-3 px-8 rounded-full font-medium transition-all duration-300 transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 disabled:cursor-not-allowed text-sm tracking-wide uppercase";
  
  const variants = {
    primary: "bg-[#00d1a0] text-white hover:bg-[#00b98e] shadow-lg hover:shadow-xl border border-transparent focus:ring-[#00d1a0]",
    outline: "bg-transparent text-[#00d1a0] border border-[#00d1a0] hover:bg-teal-50",
    ghost: "bg-transparent text-gray-600 hover:text-[#00d1a0] hover:bg-gray-100"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};