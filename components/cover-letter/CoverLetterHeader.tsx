// components/cover-letter/CoverLetterHeader.tsx - EI RENDERÖI MITÄÄN (tyhjä komponentti)
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

const CoverLetterHeader: React.FC<CoverLetterHeaderProps> = () => {
  // ✅ TYHJÄ KOMPONENTTI - Header ei renderöidy ollenkaan
  return null;
};

export default CoverLetterHeader;