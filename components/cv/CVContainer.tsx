// components/cv/CVContainer.tsx - A4 OPTIMIZED

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
          minHeight: '297mm',  // ✅ minHeight (ei height) jotta sisältö voi skaalautua
          maxHeight: '297mm',  // ✅ maxHeight estää ylivuodon
          overflow: 'hidden',  // ✅ Piilota ylivuoto
          boxSizing: 'border-box',
          padding: 0,
          margin: '0 auto',
          backgroundColor: 'white',
          position: 'relative'
        }}
      >
        {children}
      </div>
    );
  }
);

CVContainer.displayName = 'CVContainer';

export default CVContainer;

// ✅ LISÄÄ MYÖS globals.css:ään:

/*
@media print {
  @page {
    size: A4;
    margin: 0;
  }
  
  body {
    margin: 0;
    padding: 0;
  }
  
  .cv-container {
    width: 210mm !important;
    height: 297mm !important;
    max-height: 297mm !important;
    overflow: hidden !important;
    page-break-after: avoid !important;
  }
  
  .cv-paper {
    box-shadow: none !important;
  }
}
*/