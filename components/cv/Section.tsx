// components/cv/Section.tsx
import React, { useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';

interface SectionProps {
  title: string;
  content: string;
  isEditing?: boolean;
  onChange?: (content: string) => void;

}

const Section: React.FC<SectionProps> = ({ 
  title, 
  content, 
  isEditing, 
  onChange,

}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current && isEditing) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content, isEditing]);

  


  return (
    <div>
      {title && <h3 className={title}>{title}</h3>}
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => onChange?.(e.target.value)}
          className={`editable-textarea ${content}`}
          style={{
            minHeight: '100px',
            resize: 'none',
            overflow: 'hidden'
          }}
        />
      ) : (
        <div 
          className={content}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
        />
      )}
    </div>
  );
};

export default Section;

// Add this CSS to your stylesheet
/*
.section {
  margin-bottom: 1rem;
}

.technical-section {
  margin-bottom: 1.5rem;
  border-bottom: 1px solid #E5E7EB;
  padding-bottom: 1rem;
}

.technical-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #374151;
}

.technical-content {
  color: #374151;
}

.creative-section {
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #F3F4F6;
}

.creative-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
  color: #111827;
}

.creative-content {
  color: #4B5563;
}

.simple-section {
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
}

.simple-title {
  font-size: 1.125rem;
  font-weight: 500;
  margin-bottom: 0.25rem;
  color: #374151;
}

.simple-content {
  color: #4B5563;
}

.editable-textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #E5E7EB;
  border-radius: 0.25rem;
  outline: none;
  min-height: 100px;
}

.editable-textarea:focus {
  border-color: #3B82F6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
}
*/