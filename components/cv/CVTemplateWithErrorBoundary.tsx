// components/cv/CVTemplateWithErrorBoundary.tsx
import { ErrorBoundary } from 'react-error-boundary';
import CVTemplate from './CVTemplate';
import type { CVTemplateProps } from '@/types';

function CVErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="p-4 border border-red-500 rounded">
      <p>CV:n generoinnissa tapahtui virhe:</p>
      <pre>{error.message}</pre>
      <button
        onClick={resetErrorBoundary}
        className="mt-2 bg-blue-500 text-white px-4 py-2 rounded"
      >
        Yritä uudelleen
      </button>
    </div>
  );
}

export default function CVTemplateWithErrorBoundary(props: CVTemplateProps) {
  return (
    <ErrorBoundary 
      FallbackComponent={CVErrorFallback}
      onReset={() => {
        // Mahdollinen logiikka uudelleenyritykselle
      }}
    >
      <CVTemplate {...props} />
    </ErrorBoundary>
  );
}
