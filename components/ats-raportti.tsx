import React from 'react';
import { CheckCircle, AlertCircle, TrendingUp, FileText } from 'lucide-react';

interface ATSReportProps {
  report?: {
    keywords_used: number;
    total_keywords: number;
    match_percentage: number;
    readability: number;
    missing_experience: boolean;
    compensation_used: string;
    recommendations: string[];
  };
}

// Default-arvot jos raporttia ei ole
const defaultReport = {
  keywords_used: 0,
  total_keywords: 15,
  match_percentage: 0,
  readability: 5,
  missing_experience: false,
  compensation_used: 'Ei tietoa',
  recommendations: ['Lataa raportti generoimalla hakukirje uudelleen']
};

const ATSReport: React.FC<ATSReportProps> = ({ report = defaultReport }) => {
  // ✅ Varmista että report on aina olemassa
  const activeReport = report || defaultReport;
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="w-5 h-5" />;
    if (score >= 60) return <AlertCircle className="w-5 h-5" />;
    return <AlertCircle className="w-5 h-5" />;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6 border-2 border-blue-200">
      <div className="flex items-center gap-3 mb-4">
        <FileText className="w-6 h-6 text-blue-600" />
        <h3 className="text-xl font-bold text-gray-800">ATS-Optimointiraportti</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* AVAINSANAT */}
        <div className={`p-4 rounded-lg border-2 ${getScoreColor(report.match_percentage)}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Avainsanat</span>
            {getScoreIcon(report.match_percentage)}
          </div>
          <div className="text-2xl font-bold">{report.match_percentage}%</div>
          <div className="text-xs mt-1">
            {report.keywords_used}/{report.total_keywords} avainsanaa käytetty
          </div>
        </div>

        {/* LUETTAVUUS */}
        <div className={`p-4 rounded-lg border-2 ${getScoreColor(report.readability * 10)}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Luettavuus</span>
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="text-2xl font-bold">{report.readability}/10</div>
          <div className="text-xs mt-1">
            {report.readability >= 7 ? 'Erinomainen' : report.readability >= 5 ? 'Hyvä' : 'Parannettavaa'}
          </div>
        </div>

        {/* KOKEMUKSEN KÄSITTELY */}
        <div className={`p-4 rounded-lg border-2 ${report.missing_experience ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Kokemus</span>
            {report.missing_experience ? (
              <AlertCircle className="w-5 h-5 text-blue-600" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-600" />
            )}
          </div>
          <div className="text-sm font-bold">
            {report.missing_experience ? 'Kompensoitu' : 'Löytyy'}
          </div>
          <div className="text-xs mt-1">
            {report.compensation_used !== 'Ei tarpeen' 
              ? report.compensation_used.substring(0, 50) + '...'
              : 'Työkokemus esitetty'}
          </div>
        </div>
      </div>

      {/* SUOSITUKSET */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Suositukset
        </h4>
        <ul className="space-y-2">
          {report.recommendations.map((rec, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              {rec.includes('✓') ? (
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              )}
              <span className="text-gray-700">{rec}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* SELITE */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-xs text-blue-800">
          <strong>💡 ATS-järjestelmä:</strong> Applicant Tracking System analysoi hakemuksesi automaattisesti. 
          Tämä raportti näyttää kuinka hyvin hakemuksesi läpäisee ATS-seulonnan ennen kuin se päätyy rekrytoijalle.
        </p>
      </div>
    </div>
  );
};

export default ATSReport;