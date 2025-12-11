// components/cover-letter/CoverLetterContainer.tsx - PDF-TYYLITTELY KORJATTU
import React, { forwardRef } from 'react';

interface CoverLetterContainerProps {
  children: React.ReactNode;
  className?: string;
  onGeneratePDF?: () => Promise<any>;
  templateType?: string;
  'data-template-type'?: string;
  style?: React.CSSProperties;
}

const CoverLetterContainer = forwardRef<HTMLDivElement, CoverLetterContainerProps>(
  ({ children, className = '', onGeneratePDF, templateType = 'default', style, ...props }, ref) => {
    // ✅ TARKISTA ONKO PDF-TILA (URL-parametri)
    const isPdfMode = typeof window !== 'undefined' && 
                      window.location.search.includes('pdf=true');
    
    console.log('🎨 CoverLetterContainer render:', {
      isPdfMode,
      url: typeof window !== 'undefined' ? window.location.href : 'SSR',
      templateType: templateType || props['data-template-type']
    });
    
    return (
      <div
        ref={ref}
        className={`cover-letter-container ${className}`}
        data-template-type={templateType || props['data-template-type']}
        style={{
          width: '210mm',
          minHeight: '297mm',
          backgroundColor: 'white',
          position: 'relative',
          overflow: 'hidden',
          
          // ✅ NÄYTÄ VARJOT VAIN NORMAALITILASSA (ei PDF:ssä)
          ...(!isPdfMode && {
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15), 0 2px 10px rgba(0, 0, 0, 0.12)',
            borderRadius: '3px'
          }),
          ...style
        }}
      >
        {/* ✅ SININEN PALKKI - VAIN NORMAALITILASSA (ei PDF:ssä) */}
        {!isPdfMode && (
          <>
            {/* Vasen sininen palkki */}
            <div
              className="cover-letter-accent"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '12px',
                height: '100%',
                background: 'linear-gradient(to bottom, #3498db, #2980b9, #3498db)',
                boxShadow: 'inset -1px 0 3px rgba(0,0,0,0.1)',
                zIndex: 1
              }}
            ></div>
            
            {/* Yläreuna gradient */}
            <div
              className="cover-letter-top-accent"
              style={{
                position: 'absolute',
                top: 0,
                left: '12px',
                right: 0,
                height: '8px',
                background: 'linear-gradient(to right, #3498db, #ede7f6)',
                opacity: 0.7,
                zIndex: 1
              }}
            ></div>
          </>
        )}
        
        {/* ✅ SISÄLTÖ: Marginaali vain normaalitilassa */}
        <div style={{ 
          marginLeft: isPdfMode ? '0' : '20px', 
          width: isPdfMode ? '100%' : 'calc(100% - 20px)', 
          paddingTop: isPdfMode ? '0' : '12px',
          position: 'relative',
          zIndex: 2
        }}>
          {children}
        </div>
      </div>
    );
  }
);

CoverLetterContainer.displayName = 'CoverLetterContainer';

export default CoverLetterContainer;