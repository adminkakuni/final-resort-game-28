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
    primary: "bg-gray-900 text-white hover:bg-gray-800 shadow-lg hover:shadow-xl border border-transparent",
    outline: "bg-transparent text-gray-900 border border-gray-900 hover:bg-gray-50",
    ghost: "bg-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100"
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