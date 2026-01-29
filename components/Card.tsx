
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '', title, subtitle }) => {
  return (
    <div className={`glass-effect rounded-2xl p-6 ${className}`}>
      {(title || subtitle) && (
        <div className="mb-6">
          {title && <h3 className="text-xl font-bold text-white mb-1">{title}</h3>}
          {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;
