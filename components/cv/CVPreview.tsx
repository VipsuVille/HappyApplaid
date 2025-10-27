// components/cv/CVPreview.tsx
import React from 'react';

// components/CVPreview.tsx
type CVData = {
  name?: string;
  title?: string;
  summary?: string;
};

export default function CVPreview({ data }: { data: CVData }) {
  return (
    <div className="p-6 bg-white border rounded-xl shadow-md space-y-4">
      <h1 className="text-2xl font-bold">{data.name || 'Etunimi Sukunimi'}</h1>
      <h2 className="text-lg text-gray-600">{data.title || 'Ammattinimike'}</h2>
      <p className="text-gray-700 whitespace-pre-wrap">{data.summary || 'Esittelyteksti...'}</p>
    </div>
  );
}
