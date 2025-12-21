// components/cover-letter/CoverLetterContainer.tsx - YKSINKERTAINEN kuten CV
import React, { forwardRef } from 'react';

interface CoverLetterContainerProps {
  children: React.ReactNode;
  className?: string;
  onGeneratePDF?: () => Promise<any>;
  templateType?: string;
  'data-template-type'?: string;
}

const CoverLetterContainer = forwardRef<HTMLDivElement, CoverLetterContainerProps>(
  ({ children, className = '', onGeneratePDF, templateType = 'default', ...props }, ref) => {
    return (
      <div 
        ref={ref} 
        className={`cover-letter-container ${className}`}
        data-template-type={templateType || props['data-template-type']}
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

CoverLetterContainer.displayName = 'CoverLetterContainer';

export default CoverLetterContainer;