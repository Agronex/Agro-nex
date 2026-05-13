import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export default function Card({ children, className = '', header, footer }: CardProps) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      {header && <div className="border-b border-gray-200 p-4 md:p-6">{header}</div>}
      <div className="p-4 md:p-6">{children}</div>
      {footer && <div className="border-t border-gray-200 p-4 md:p-6">{footer}</div>}
    </div>
  );
}
