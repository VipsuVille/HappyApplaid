// components/cover-letter/CoverLetterSection.tsx
import React, { useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';

interface SectionProps {
  title?: string;
  content: string;
  isEditing?: boolean;
  onChange?: (content: string) => void;
  className?: string;
}

export const CoverLetterSection: React.FC<SectionProps> = ({
  title,
  content,
  isEditing,
  onChange,
  className = ''
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current && isEditing) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content, isEditing]);
 
  return (
    <div className={`cover-letter-section ${className}`}>
      {title && (
        <h3 className="section-title text-lg font-medium mb-2">{title}</h3>
      )}
      
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => onChange?.(e.target.value)}
          className="editable-textarea w-full border border-gray-300 rounded p-2 focus:border-blue-500 focus:outline-none"
          style={{
            minHeight: '100px',
            resize: 'none',
            overflow: 'hidden',
            fontFamily: '"Merriweather", serif',
            lineHeight: '1.7'
          }}
        />
      ) : (
        <div
          className="section-content"
          style={{
            fontFamily: '"Merriweather", serif',
            lineHeight: '1.7',
            whiteSpace: 'pre-wrap'
          }}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
        />
      )}
    </div>
  );
};