// src/components/Section/index.tsx
import { SectionProps } from '@/types';

const Section = ({ title, content }: SectionProps) => (
  <div className="mb-4">
    <h3 className="font-semibold">{title}</h3>
    <p>{content}</p>
  </div>
);

export default Section;