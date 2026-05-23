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
          minHeight: '297mm',   // ✅ vähintään yksi A4
          // ❌ EI maxHeight/overflow:hidden esikatselussa:
          //    se leikkaisi ylimenevän sisällön piiloon ja tieto katoaisi.
          //    A4-rajoitus hoidetaan tulostuksessa (@media print, globals.css).
          overflow: 'visible',
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

// ✅ LISÄÄ MYÖS globals.css:ään (tulostuksessa rajaus säilyy):

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
    min-height: 297mm !important;
    overflow: visible !important;
  }

  .cv-paper {
    box-shadow: none !important;
  }
}
*/