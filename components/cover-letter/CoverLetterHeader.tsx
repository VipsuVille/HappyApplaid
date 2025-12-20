// components/cover-letter/CoverLetterHeader.tsx - YKSINKERTAISTETTU
import React from 'react';

interface CoverLetterHeaderProps {
  applicantInfo?: {
    name?: string;
    full_name?: string;
  };
  date?: string;
  isEditing?: boolean;
  onInfoChange?: (field: string, value: string) => void;
}

const CoverLetterHeader: React.FC<CoverLetterHeaderProps> = ({
  applicantInfo = {},
  date,
  isEditing = false,
  onInfoChange
}) => {
  // ✅ KÄYTÄ OIKEAA NIMEÄ - EI DEFAULT-ARVOJA
  const name = applicantInfo?.name || applicantInfo?.full_name || '';
  
  // ✅ SUOMALAINEN PÄIVÄMÄÄRÄ
  const formattedDate = date || new Date().toLocaleDateString('fi-FI', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric'
  });

  // Editoitava versio
  if (isEditing) {
    return (
      <div className="cover-letter-header mb-4">
        <input
          type="text"
          value={name}
          onChange={(e) => onInfoChange?.('applicant_info.name', e.target.value)}
          className="block w-full border-b border-gray-300 focus:border-blue-500 outline-none text-lg font-bold mb-2"
          placeholder="Nimi"
        />
        <div className="text-right">
          <input
            type="text"
            value={formattedDate}
            onChange={(e) => onInfoChange?.('date', e.target.value)}
            className="border-b border-gray-300 focus:border-blue-500 outline-none text-right text-sm"
            placeholder="Päivämäärä"
          />
        </div>
      </div>
    );
  }

  // ✅ NÄYTTÖVERSIO: Vain nimi ja päivämäärä (kuten oikeat hakukirjeet)
  return (
    <div className="cover-letter-header" style={{ marginBottom: '20px' }}>
      {/* NIMI - vasemmalle */}
      <div style={{ 
        fontSize: '13pt',
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: '6px',
        letterSpacing: '0.3px'
      }}>
        {name}
      </div>
      
      {/* PÄIVÄMÄÄRÄ - oikealle */}
      <div style={{
        textAlign: 'right',
        fontSize: '10pt',
        color: '#555',
        marginTop: '4px'
      }}>
        {formattedDate}
      </div>
      
      {/* EROTIN */}
      <div style={{
        width: '100%',
        height: '1px',
        backgroundColor: '#e0e0e0',
        marginTop: '12px',
        marginBottom: '20px'
      }}></div>
    </div>
  );
};

export default CoverLetterHeader;