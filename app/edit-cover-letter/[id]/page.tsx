// app/edit-cover-letter/[id]/page.tsx - UUSI 3-SARAKKEINEN LAYOUT
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { 
  Save, ArrowLeft, Trash2, Download, TrendingUp, AlertTriangle, 
  CheckCircle2, Sparkles, Eye, Zap, Loader2, RefreshCw, XCircle,
  Info, AlertCircle
} from 'lucide-react';
import SmartHeader from '@/components/ui/smartHeader';
import { fetchCoverLetterById, updateCoverLetter, deleteCoverLetter } from '@/services/coverLetterService-client';

interface ATSAnalysis {
  score: number;
  exactMatches: string[];
  missingCritical: string[];
  languageMismatch: boolean;
  jobLanguage: string;
  coverLetterLanguage: string;
  warningMessage: string;
  warningType: 'critical' | 'warning' | 'info' | 'success';
  atsDetection: {
    usesATS: boolean;
    confidence: number;
    reasoning: string;
    indicators: {
      hasATS: string[];
      noATS: string[];
    };
    companySize: string;
    recommendation: string;
  };
  totalKeywords: number;
}

export default function NewEditCoverLetterPage() {
  const params = useParams();
  const router = useRouter();
  const { getToken } = useAuth();
  const id = params?.id as string;

  const [coverLetter, setCoverLetter] = useState<any>(null);
  const [editedContent, setEditedContent] = useState('');
  const [applicantInfo, setApplicantInfo] = useState<any>({});
  const [atsAnalysis, setATSAnalysis] = useState<ATSAnalysis | null>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [insertingKeyword, setInsertingKeyword] = useState<string | null>(null);
  const [hoveredKeyword, setHoveredKeyword] = useState<string | null>(null);
  
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const analysisTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load cover letter
  useEffect(() => {
    const loadCoverLetter = async () => {
      try {
        const token = await getToken({ template: 'supabase' });
        if (!token) throw new Error('No authentication token');
        
        const { data, error } = await fetchCoverLetterById(id, token);
        
        if (error) throw error;
        if (!data) throw new Error('Hakukirjettä ei löytynyt');
        
        setCoverLetter(data);
        setEditedContent(data.content?.body || data.ai_data?.html?.content || '');
        
        if (data.content?.applicant_info) {
          setApplicantInfo(data.content.applicant_info);
        }

        // Initial analysis
        if (data.content?.job_description) {
          analyzeATS(data.content.body || data.ai_data?.html?.content, data.content.job_description);
        }
      } catch (error) {
        console.error('Error loading cover letter:', error);
        alert('Hakukirjeen lataaminen epäonnistui');
        router.push('/my-cover-letters');
      }
    };

    if (id) loadCoverLetter();
  }, [id, getToken, router]);

  // Analyze ATS
  const analyzeATS = async (content: string, jobDesc?: string) => {
    if (!jobDesc && !coverLetter?.content?.job_description) return;

    setIsAnalyzing(true);
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) throw new Error('No token');

      const response = await fetch('/api/analyze-ats-realistic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          jobDescription: jobDesc || coverLetter.content.job_description,
          coverLetterContent: content
        })
      });

      if (!response.ok) throw new Error('Analysis failed');

      const data = await response.json();
      setATSAnalysis(data);
    } catch (error) {
      console.error('ATS analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle content change with debounced analysis
  const handleContentChange = (newContent: string) => {
    setEditedContent(newContent);

    // Debounce analysis
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }

    analysisTimeoutRef.current = setTimeout(() => {
      analyzeATS(newContent);
    }, 2000);
  };

  // Insert keyword at cursor
  const insertKeywordSimple = (keyword: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    range.deleteContents();
    
    const textNode = document.createTextNode(` ${keyword} `);
    range.insertNode(textNode);
    
    // Move cursor after inserted text
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    selection.removeAllRanges();
    selection.addRange(range);

    // Update content
    if (contentEditableRef.current) {
      const newContent = contentEditableRef.current.innerText;
      handleContentChange(newContent);
    }
  };

  // Insert keyword smartly (AI)
  const insertKeywordSmart = async (keyword: string) => {
    setInsertingKeyword(keyword);
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) throw new Error('No token');

      const response = await fetch('/api/insert-keyword-smart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          keyword,
          currentContent: editedContent,
          jobDescription: coverLetter?.content?.job_description
        })
      });

      if (!response.ok) throw new Error('Insertion failed');

      const data = await response.json();
      setEditedContent(data.improvedContent);
      
      if (contentEditableRef.current) {
        contentEditableRef.current.innerText = data.improvedContent;
      }

      // Re-analyze
      analyzeATS(data.improvedContent);
    } catch (error) {
      console.error('Smart insertion error:', error);
      alert('Automaattinen lisäys epäonnistui. Yritä manuaalista lisäystä.');
    } finally {
      setInsertingKeyword(null);
    }
  };

  // Save
  const handleSave = async () => {
    if (!coverLetter) return;

    setIsSaving(true);
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) throw new Error('No token');

      const content = contentEditableRef.current?.innerText || editedContent;

      const updatedData = {
        content: {
          ...coverLetter.content,
          body: content,
          applicant_info: applicantInfo
        },
        ai_data: {
          ...coverLetter.ai_data,
          html: {
            ...coverLetter.ai_data.html,
            content: content
          },
          ats_optimization: {
            ...coverLetter.ai_data?.ats_optimization,
            last_edited: new Date().toISOString(),
            current_score: atsAnalysis?.score || 0
          }
        }
      };

      const { error } = await updateCoverLetter(id, updatedData, token);
      if (error) throw error;
      
      alert('✅ Hakukirje tallennettu!');
    } catch (error) {
      console.error('Save error:', error);
      alert('Tallennus epäonnistui');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!confirm('Haluatko varmasti poistaa tämän hakukirjeen?')) return;

    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) throw new Error('No token');

      const { error } = await deleteCoverLetter(id, token);
      if (error) throw error;
      
      alert('Hakukirje poistettu');
      router.push('/my-cover-letters');
    } catch (error) {
      console.error('Delete error:', error);
      alert('Poisto epäonnistui');
    }
  };

  // Download PDF
  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const content = contentEditableRef.current?.innerHTML || editedContent;

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700&display=swap');
              body { 
                margin: 0; 
                padding: 20mm 25mm;
                font-family: 'Merriweather', serif;
                font-size: 11pt;
                line-height: 1.7;
                color: #333;
              }
              h1 { 
                color: #2c3e50;
                border-bottom: 3px solid #3498db;
                padding-bottom: 12px;
                margin-bottom: 30px;
              }
              p { margin-bottom: 16px; }
            </style>
          </head>
          <body>
            ${content}
            <div style="margin-top: 50px;">
              <div style="font-size: 1rem; color: #555; margin-bottom: 8px;">Ystävällisin terveisin,</div>
              <div style="border-bottom: 2px solid #3498db; width: 230px; margin-bottom: 12px;"></div>
              <div style="font-family: 'Dancing Script', cursive; font-size: 1.5rem;">${applicantInfo.name || 'Hakija'}</div>
            </div>
          </body>
        </html>
      `;

      const response = await fetch('/api/generate-cover-letter-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ htmlContent: html, letterId: id }),
      });

      if (!response.ok) throw new Error('PDF generation failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hakukirje_${coverLetter.title || id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('PDF error:', error);
      alert('PDF:n luonti epäonnistui');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!coverLetter || !atsAnalysis) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 75) return 'bg-green-50 border-green-200';
    if (score >= 50) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const getWarningStyle = (type: string) => {
    const styles = {
      critical: 'bg-red-50 border-red-300 text-red-800',
      warning: 'bg-yellow-50 border-yellow-300 text-yellow-800',
      info: 'bg-blue-50 border-blue-300 text-blue-800',
      success: 'bg-green-50 border-green-300 text-green-800'
    };
    return styles[type as keyof typeof styles] || styles.info;
  };

  const getWarningIcon = (type: string) => {
    const icons = {
      critical: <XCircle className="w-5 h-5 text-red-600" />,
      warning: <AlertTriangle className="w-5 h-5 text-yellow-600" />,
      info: <Info className="w-5 h-5 text-blue-600" />,
      success: <CheckCircle2 className="w-5 h-5 text-green-600" />
    };
    return icons[type as keyof typeof icons] || icons.info;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SmartHeader />
      
      {/* Top Bar */}
      <div className="bg-white border-b px-6 py-4 mt-16 sticky top-16 z-40">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/my-cover-letters')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold">{coverLetter.title}</h1>
              <p className="text-sm text-gray-500">
                Luotu: {new Date(coverLetter.created_at).toLocaleDateString('fi-FI')}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Lataa PDF
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Tallenna
            </button>
            <button 
              onClick={handleDelete}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - 3 Column Layout */}
      <div className="max-w-[1800px] mx-auto p-6 grid grid-cols-12 gap-6">
        
        {/* LEFT: ATS Score Panel (3 cols) */}
        <div className="col-span-3 space-y-4">
          {/* ATS Score Card */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden sticky top-32">
            <div className={`p-6 ${getScoreBg(atsAnalysis.score)}`}>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  {isAnalyzing ? (
                    <Loader2 className="w-6 h-6 animate-spin text-gray-600" />
                  ) : (
                    <TrendingUp className={`w-6 h-6 ${getScoreColor(atsAnalysis.score)}`} />
                  )}
                </div>
                <div className={`text-5xl font-bold mb-2 ${getScoreColor(atsAnalysis.score)}`}>
                  {atsAnalysis.score}%
                </div>
                <p className="text-sm font-semibold text-gray-700">ATS-yhteensopivuus</p>
                <button
                  onClick={() => analyzeATS(editedContent)}
                  disabled={isAnalyzing}
                  className="mt-3 text-xs text-blue-600 hover:underline flex items-center gap-1 mx-auto"
                >
                  <RefreshCw className="w-3 h-3" />
                  {isAnalyzing ? 'Analysoidaan...' : 'Päivitä pisteet'}
                </button>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {/* Warning Message */}
              {atsAnalysis.warningMessage && (
                <div className={`p-3 border rounded-lg ${getWarningStyle(atsAnalysis.warningType)}`}>
                  <div className="flex items-start gap-2">
                    {getWarningIcon(atsAnalysis.warningType)}
                    <p className="text-xs flex-1">{atsAnalysis.warningMessage}</p>
                  </div>
                </div>
              )}

              {/* ATS Detection */}
              <div className={`p-3 border rounded-lg ${
                atsAnalysis.atsDetection.usesATS 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'bg-green-50 border-green-200'
              }`}>
                <div className="flex items-start gap-2">
                  {atsAnalysis.atsDetection.usesATS ? (
                    <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 mb-1">
                      {atsAnalysis.atsDetection.usesATS ? '🤖 Käyttää ATS-järjestelmää' : '👤 Ihminen lukee'}
                    </p>
                    <p className="text-xs text-gray-600 mb-1">
                      Varmuus: {Math.round(atsAnalysis.atsDetection.confidence * 100)}%
                    </p>
                    <p className="text-xs text-gray-600">
                      {atsAnalysis.atsDetection.reasoning}
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-green-50 border border-green-200 rounded text-center">
                  <div className="text-2xl font-bold text-green-600">{atsAnalysis.exactMatches.length}</div>
                  <div className="text-xs text-gray-600">Löydetty</div>
                </div>
                <div className="p-3 bg-red-50 border border-red-200 rounded text-center">
                  <div className="text-2xl font-bold text-red-600">{atsAnalysis.missingCritical.length}</div>
                  <div className="text-xs text-gray-600">Puuttuu</div>
                </div>
              </div>
            </div>
          </div>

          {/* Missing Keywords - Clickable */}
          {atsAnalysis.missingCritical.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-600" />
                Puuttuvat avainsanat ({atsAnalysis.missingCritical.length})
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                💡 Klikkaa lisätäksesi kursorin kohdalle
              </p>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {atsAnalysis.missingCritical.map((keyword, idx) => (
                  <button
                    key={idx}
                    onClick={() => insertKeywordSimple(keyword)}
                    onMouseEnter={() => setHoveredKeyword(keyword)}
                    onMouseLeave={() => setHoveredKeyword(null)}
                    disabled={insertingKeyword === keyword}
                    className="w-full p-2 text-left bg-yellow-50 hover:bg-yellow-100 border border-yellow-300 rounded-lg transition-all text-sm group disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-800 truncate flex-1">{keyword}</span>
                      {insertingKeyword === keyword ? (
                        <Loader2 className="w-4 h-4 text-yellow-600 animate-spin" />
                      ) : (
                        <Zap className="w-4 h-4 text-yellow-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Found Keywords */}
          {atsAnalysis.exactMatches.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                Löydetyt ({atsAnalysis.exactMatches.length})
              </h3>
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                {atsAnalysis.exactMatches.map((keyword, idx) => (
                  <span 
                    key={idx}
                    className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full border border-green-300"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CENTER: Cover Letter (6 cols) */}
        <div className="col-span-6">
          <div 
            className="bg-white rounded-lg shadow-lg border mx-auto"
            style={{ width: '210mm', minHeight: '297mm' }}
          >
            <div className="p-8">
              <div
                ref={contentEditableRef}
                contentEditable
                suppressContentEditableWarning
                onInput={(e) => handleContentChange(e.currentTarget.innerText)}
                className="prose max-w-none focus:outline-none"
                style={{
                  fontFamily: '"Merriweather", serif',
                  fontSize: '11pt',
                  lineHeight: '1.7',
                  minHeight: '260mm',
                  color: '#333'
                }}
                dangerouslySetInnerHTML={{ __html: editedContent }}
              />
            </div>
          </div>
        </div>

        {/* RIGHT: Edit Tools (3 cols) */}
        <div className="col-span-3 space-y-4">
          {/* Quick Tips */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-4">
            <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600" />
              Vinkit
            </h3>
            <ul className="text-xs text-gray-700 space-y-2">
              <li>• Klikkaa vasemmalla puuttuvia avainsanoja lisätäksesi</li>
              <li>• Muokkaa tekstiä suoraan keskellä</li>
              <li>• Pisteet päivittyvät automaattisesti</li>
              <li>• Tallenna ennen poistumista</li>
            </ul>
          </div>

          {/* Job Description */}
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <h3 className="font-semibold text-gray-800 mb-3">Työpaikkailmoitus</h3>
            <div className="p-3 bg-gray-50 rounded text-xs text-gray-700 max-h-60 overflow-y-auto whitespace-pre-wrap">
              {coverLetter.content?.job_description || 'Ei saatavilla'}
            </div>
          </div>

          {/* Applicant Info */}
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <h3 className="font-semibold text-gray-800 mb-3">Yhteystiedot</h3>
            <div className="space-y-2">
              <input
                type="text"
                value={applicantInfo.name || ''}
                onChange={(e) => setApplicantInfo({ ...applicantInfo, name: e.target.value })}
                placeholder="Nimi"
                className="w-full p-2 border rounded text-sm"
              />
              <input
                type="email"
                value={applicantInfo.email || ''}
                onChange={(e) => setApplicantInfo({ ...applicantInfo, email: e.target.value })}
                placeholder="Email"
                className="w-full p-2 border rounded text-sm"
              />
              <input
                type="tel"
                value={applicantInfo.phone || ''}
                onChange={(e) => setApplicantInfo({ ...applicantInfo, phone: e.target.value })}
                placeholder="Puhelin"
                className="w-full p-2 border rounded text-sm"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}