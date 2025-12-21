// components/cover-letter/CoverLetterHeader.tsx - PARANNETTU
import React from 'react';

interface CoverLetterHeaderProps {
  applicantInfo: {
    name?: string;
    full_name?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    postal_code?: string;
  };
  date?: string;
  isEditing?: boolean;
  onContentChange?: (field: string, value: string) => void;
}

const CoverLetterHeader: React.FC<CoverLetterHeaderProps> = ({
  applicantInfo,
  date,
  isEditing = false,
  onContentChange
}) => {
  const name = applicantInfo?.name || applicantInfo?.full_name || 'Hakija';
  const currentDate = date || new Date().toLocaleDateString('fi-FI', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  if (isEditing) {
    return (
      <div style={{
        marginBottom: '25mm',
        fontFamily: '"Merriweather", serif',
      }}>
        <input
          type="text"
          value={name}
          onChange={(e) => onContentChange?.('applicant_info.name', e.target.value)}
          className="w-full border-b-2 border-gray-300 text-2xl font-bold mb-2"
          placeholder="Nimi"
        />
        <input
          type="text"
          value={applicantInfo.email || ''}
          onChange={(e) => onContentChange?.('applicant_info.email', e.target.value)}
          className="w-full border-b border-gray-200 text-sm mb-1"
          placeholder="Sähköposti"
        />
        <input
          type="text"
          value={applicantInfo.phone || ''}
          onChange={(e) => onContentChange?.('applicant_info.phone', e.target.value)}
          className="w-full border-b border-gray-200 text-sm mb-1"
          placeholder="Puhelin"
        />
      </div>
    );
  }

  return (
    <div style={{
      marginBottom: '25mm',
      fontFamily: '"Merriweather", serif',
      borderBottom: '2px solid #e5e7eb',
      paddingBottom: '15px',
    }}>
      {/* ✅ NIMI - Korostettu */}
      <h2 style={{
        fontSize: '18pt',
        fontWeight: '700',
        color: '#2c3e50',
        marginBottom: '8px',
        letterSpacing: '0.3px',
      }}>
        {name}
      </h2>

      {/* ✅ YHTEYSTIEDOT - Siisti layout */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        fontSize: '10pt',
        color: '#555',
        marginBottom: '10px',
      }}>
        {applicantInfo.email && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#3498db', fontWeight: '600' }}>✉</span>
            <span>{applicantInfo.email}</span>
          </div>
        )}
        
        {applicantInfo.phone && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#3498db', fontWeight: '600' }}>☎</span>
            <span>{applicantInfo.phone}</span>
          </div>
        )}
        
        {(applicantInfo.address || applicantInfo.city || applicantInfo.postal_code) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#3498db', fontWeight: '600' }}>📍</span>
            <span>
              {[applicantInfo.address, applicantInfo.postal_code, applicantInfo.city]
                .filter(Boolean)
                .join(', ')}
            </span>
          </div>
        )}
      </div>

      {/* ✅ PÄIVÄMÄÄRÄ */}
      <div style={{
        fontSize: '10pt',
        color: '#666',
        fontStyle: 'italic',
        marginTop: '12px',
      }}>
        {currentDate}
      </div>
    </div>
  );
};

export default CoverLetterHeader;