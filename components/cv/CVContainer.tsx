// components/cv/CVContainer.tsx
import React, { forwardRef } from 'react';

interface CVContainerProps {
  children: React.ReactNode;
  className?: string;
  onGeneratePDF?: () => Promise<Blob>;
  templateType?: string;
}

const CVContainer = forwardRef<HTMLDivElement, CVContainerProps>(
  ({ children, className = '', onGeneratePDF, templateType = 'default' }, ref) => {
    return (
      <div 
        ref={ref} 
        className={`cv-container ${className}`}
        data-template-type={templateType}
        style={{
          width: '210mm',
          height: '297mm'
        }}
      >
        {children}
      </div>
    );
  }
);

CVContainer.displayName = 'CVContainer';

export default CVContainer;