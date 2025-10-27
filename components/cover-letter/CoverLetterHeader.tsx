// components/cover-letter/CoverLetterHeader.tsx
import React from 'react';

interface CoverLetterHeaderProps {
  applicantInfo?: {
    full_name?: string;
    phone?: string;
    email?: string;
    location?: string;
    linkedin?: string;
  };
  date?: string;
  isEditing?: boolean;
  onInfoChange?: (field: string, value: string) => void;
}

const CoverLetterHeader: React.FC<CoverLetterHeaderProps> = ({
  applicantInfo = {},
  date = new Date().toLocaleDateString('fi-FI'),
  isEditing = false,
  onInfoChange
}) => {
  const {
    full_name = 'Etunimi Sukunimi',
    phone = '+358 40 123 4567',
    email = 'etunimi.sukunimi@email.com',
    location = 'Helsinki, Suomi',
    linkedin = 'linkedin.com/in/etunimisuku'
  } = applicantInfo;

  const formattedDate = date;

  // Editoitava versio
  if (isEditing) {
    return (
      <div className="cover-letter-header mb-8">
        <div className="applicant-info-edit mb-4">
          <input
            type="text"
            value={full_name}
            onChange={(e) => onInfoChange?.('applicant_info.full_name', e.target.value)}
            className="block w-full border-b border-gray-300 focus:border-blue-500 outline-none text-lg font-bold mb-2"
            placeholder="Nimi"
          />
          <div className="grid grid-cols-2 gap-2 mb-4">
            <input
              type="text"
              value={email}
              onChange={(e) => onInfoChange?.('applicant_info.email', e.target.value)}
              className="border-b border-gray-300 focus:border-blue-500 outline-none"
              placeholder="Sähköposti"
            />
            <input
              type="text"
              value={phone}
              onChange={(e) => onInfoChange?.('applicant_info.phone', e.target.value)}
              className="border-b border-gray-300 focus:border-blue-500 outline-none"
              placeholder="Puhelinnumero"
            />
            <input
              type="text"
              value={location}
              onChange={(e) => onInfoChange?.('applicant_info.location', e.target.value)}
              className="border-b border-gray-300 focus:border-blue-500 outline-none"
              placeholder="Sijainti"
            />
            <input
              type="text"
              value={linkedin}
              onChange={(e) => onInfoChange?.('applicant_info.linkedin', e.target.value)}
              className="border-b border-gray-300 focus:border-blue-500 outline-none"
              placeholder="LinkedIn-profiili"
            />
          </div>
        </div>
        <div className="date-edit text-right mb-6">
          <input
            type="text"
            value={formattedDate}
            onChange={(e) => onInfoChange?.('date', e.target.value)}
            className="border-b border-gray-300 focus:border-blue-500 outline-none text-right"
            placeholder="Päivämäärä"
          />
        </div>
      </div>
    );
  }

  // Näyttöversio
  return (
    <div className="cover-letter-header mb-10">
      <div className="header-content">
        <div className="applicant-name" style={{ 
          fontSize: '1.5rem', 
          fontWeight: 'bold',
          color: '#2c3e50',
          position: 'relative',
          marginBottom: '10px'
        }}>
          {full_name}
          {/* Hienovarainen korostus nimen alla */}
          <span style={{
            position: 'absolute',
            bottom: '-5px',
            left: '0',
            width: '40px',
            height: '3px',
            backgroundColor: '#3498db'
          }}></span>
        </div>
        
        <div className="applicant-details" style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px 30px',
          marginTop: '15px',
          fontSize: '0.9rem',
          color: '#555'
        }}>
          <div>{email}</div>
          <div>{phone}</div>
          <div>{location}</div>
          <div>{linkedin}</div>
        </div>
      </div>
      
      <div className="date" style={{
        textAlign: 'right',
        marginTop: '35px',
        marginBottom: '35px',
        color: '#555',
        fontSize: '0.95rem'
      }}>
        {formattedDate}
      </div>
    </div>
  );
};

export default CoverLetterHeader;