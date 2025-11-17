// app/edit-cover-letter/[id]/page.tsx - YHTENÄINEN VERSIO (V1 & V2)
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { 
  Save, ArrowLeft, Trash2, Download, TrendingUp, AlertTriangle, 
  CheckCircle2, Loader2, RefreshCw, XCircle, Info, Copy, Eye, Sparkles
} from 'lucide-react';
import SmartHeader from '@/components/ui/smartHeader';
import CoverLetterContainer from '@/components/cover-letter/CoverLetterContainer';
import CoverLetterTemplate from '@/components/cover-letter/CoverLetterTemplate';
import TransparentErrorModal, { parseAPIError, ErrorExplanation } from '@/components/TransparentErrorModal';
import { fetchCoverLetterById, updateCoverLetter, deleteCoverLetter } from '@/services/coverLetterService-client';

import type { ATSAnalysis } from '@/types/ats';
import type { CoverLetterData } from '@/types/ats';

interface ValidationWarning {
  show: boolean;
  message: string;
  issues: Record<string, string[]>;
  pendingContent: string;
}

export default function EditCoverLetterPage() {
  const params = useParams();
  const router = useRouter();
  const { getToken } = useAuth();
  const id = params?.id as string;

  const [coverLetter, setCoverLetter] = useState<CoverLetterData | null>(null);
  const [atsAnalysis, setATSAnalysis] = useState<ATSAnalysis | null>(null);
  
  // ✅ UUSI: Tunnista cover letter tyyppi
  const [isATSOptimized, setIsATSOptimized] = useState<boolean>(false);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [insertingKeyword, setInsertingKeyword] = useState<string | null>(null);
  
  const [showMissingKeywords, setShowMissingKeywords] = useState(true);
  const [showFoundKeywords, setShowFoundKeywords] = useState(false);
  const [showSynonymMatches, setShowSynonymMatches] = useState(false);
  const [copiedKeyword, setCopiedKeyword] = useState<string | null>(null);
  
  const [errorModal, setErrorModal] = useState<ErrorExplanation | null>(null);
  const [validationWarning, setValidationWarning] = useState<ValidationWarning | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const letterRef = useRef<HTMLDivElement>(null);

  // ✅ LATAA COVER LETTER + TUNNISTA TYYPPI
  useEffect(() => {
    const loadCoverLetter = async () => {
      try {
        const token = await getToken({ template: 'supabase' });
        if (!token) throw new Error('No authentication token');
        
        const { data, error } = await fetchCoverLetterById(id, token);
        
        if (error) throw error;
        if (!data) throw new Error('Hakukirjettä ei löytynyt');
        
        setCoverLetter(data as CoverLetterData);

        // ✅ TUNNISTA TYYPPI
        const hasATSData = !!data.ai_data?.ats_optimization;
        setIsATSOptimized(hasATSData);

        console.log(`📄 Cover Letter tyyppi: ${hasATSData ? 'V2 (ATS)' : 'V1 (Tavallinen)'}`);

        // ✅ ANALYSOI VAIN JOS V2
        if (hasATSData && data.content?.job_description) {
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

  // ✅ ATS-ANALYYSI (vain V2:lle)
  const analyzeATS = async (content: string, jobDesc?: string) => {
    if (!isATSOptimized) return; // Skip jos V1
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
          jobDescription: jobDesc || (coverLetter?.content?.job_description || ''),
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

  // Copy keyword
  const copyKeyword = (keyword: string) => {
    navigator.clipboard.writeText(keyword);
    setCopiedKeyword(keyword);
    setTimeout(() => setCopiedKeyword(null), 2000);
  };

  // ✅ SMART INSERT (vain V2:lle)
  const handleSmartInsertKeyword = async (keyword: string) => {
    if (!isATSOptimized) {
      alert('Avainsanojen lisäys on käytettävissä vain ATS-optimoiduille hakukirjeille.');
      return;
    }

    setInsertingKeyword(keyword);
    setErrorModal(null);
    
    try {
      const response = await fetch('/api/insert-keyword-smart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword,
          currentContent: coverLetter?.content.body || coverLetter?.ai_data?.html?.content,
          jobDescription: coverLetter?.content?.job_description,
          coverLetterId: id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        const explanation = parseAPIError(data);
        setErrorModal(explanation);
        return;
      }

      if (data.warning?.requiresConfirmation) {
        setValidationWarning({
          show: true,
          message: data.warning.message,
          issues: data.warning.violations,
          pendingContent: data.improvedContent
        });
        return;
      }

      if (data.improvedContent) {
        setCoverLetter((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            content: {
              ...prev.content,
              body: data.improvedContent
            }
          };
        });

        await analyzeATS(data.improvedContent);
        
        setSuccessMessage(`✅ Avainsana "${keyword}" lisätty onnistuneesti!`);
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (error) {
      console.error('Smart insertion error:', error);
      setErrorModal({
        type: 'cannot_insert',
        title: '❌ Verkkovirhe',
        message: 'Yhteys palvelimeen epäonnistui',
        whyThisHappened: 'Tämä voi johtua verkko-ongelmista tai palvelimen ylikuormituksesta.',
        howToFix: [
          'Tarkista internet-yhteytesi',
          'Yritä uudelleen hetken päästä',
          'Lisää avainsana manuaalisesti'
        ],
        canRetry: true
      });
    } finally {
      setInsertingKeyword(null);
    }
  };

  const handleAcceptWarning = async () => {
    if (!validationWarning) return;
    
    setCoverLetter((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        content: {
          ...prev.content,
          body: validationWarning.pendingContent
        }
      };
    });

    if (isATSOptimized) {
      await analyzeATS(validationWarning.pendingContent);
    }
    
    setValidationWarning(null);
    setSuccessMessage('✅ Muutos hyväksytty');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleRejectWarning = () => {
    setValidationWarning(null);
  };

  // Save
  const handleSave = async () => {
    if (!coverLetter) return;

    setIsSaving(true);
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) throw new Error('No token');

      const updatedData = {
        content: coverLetter.content,
        ai_data: {
          ...coverLetter.ai_data,
          ...(isATSOptimized && atsAnalysis && {
            ats_optimization: {
              ...coverLetter.ai_data?.ats_optimization,
              last_edited: new Date().toISOString(),
              current_score: atsAnalysis.score || 0
            }
          })
        }
      };

      const { error } = await updateCoverLetter(id, updatedData, token);
      if (error) throw error;
      
      setSuccessMessage('✅ Hakukirje tallennettu!');
      setTimeout(() => setSuccessMessage(null), 3000);
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
      const response = await fetch('/api/generate-cover-letter-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          htmlContent: coverLetter?.ai_data?.html?.content || coverLetter?.content?.body,
          letterId: id
        }),
      });

      if (!response.ok) throw new Error('PDF generation failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hakukirje_${coverLetter?.title || id}.pdf`;
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

  if (!coverLetter) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SmartHeader />
      
      {/* Top Bar */}
      <div className="bg-white border-b px-4 md:px-6 py-4 mt-16 sticky top-16 z-40">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={() => router.push('/my-cover-letters')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg md:text-xl font-bold truncate max-w-[200px] md:max-w-none">
                  {coverLetter.title}
                </h1>
                {/* ✅ NÄYTÄ MERKKI */}
                {isATSOptimized ? (
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                    ATS-optimoitu
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Tavallinen
                  </span>
                )}
              </div>
              <p className="text-xs md:text-sm text-gray-500">
                Luotu: {new Date(coverLetter.created_at).toLocaleDateString('fi-FI')}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="p-2 md:px-4 md:py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span className="hidden md:inline">Lataa PDF</span>
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="p-2 md:px-4 md:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span className="hidden md:inline">Tallenna</span>
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

      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-20 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-slide-in">
          {successMessage}
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto p-3 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
        
          {/* ✅ LEFT: ATS Panel (vain jos V2) */}
          {isATSOptimized && atsAnalysis && (
            <div className="lg:col-span-3 space-y-4">
              {/* ATS Score Card */}
              <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className={`p-4 md:p-6 ${getScoreBg(atsAnalysis.score)}`}>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      {isAnalyzing ? (
                        <Loader2 className="w-5 md:w-6 h-5 md:h-6 animate-spin text-gray-600" />
                      ) : (
                        <TrendingUp className={`w-5 md:w-6 h-5 md:h-6 ${getScoreColor(atsAnalysis.score)}`} />
                      )}
                    </div>
                    <div className={`text-4xl md:text-5xl font-bold mb-2 ${getScoreColor(atsAnalysis.score)}`}>
                      {atsAnalysis.score}%
                    </div>
                    <p className="text-sm font-semibold text-gray-700">ATS-yhteensopivuus</p>
                    <button
                      onClick={() => analyzeATS(coverLetter.content.body || coverLetter.ai_data?.html?.content)}
                      disabled={isAnalyzing}
                      className="mt-3 text-xs text-blue-600 hover:underline flex items-center gap-1 mx-auto disabled:opacity-50"
                    >
                      <RefreshCw className="w-3 h-3" />
                      {isAnalyzing ? 'Analysoidaan...' : 'Päivitä pisteet'}
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  {/* Warning */}
                  <div className={`p-3 border rounded-lg ${
                    atsAnalysis.warningType === 'critical' ? 'bg-red-50 border-red-300' :
                    atsAnalysis.warningType === 'warning' ? 'bg-yellow-50 border-yellow-300' :
                    atsAnalysis.warningType === 'success' ? 'bg-green-50 border-green-300' :
                    'bg-blue-50 border-blue-300'
                  }`}>
                    <p className="text-xs">{atsAnalysis.warningMessage}</p>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-green-50 border border-green-200 rounded">
                      <div className="text-lg font-bold text-green-600">{atsAnalysis.analysis.exact}</div>
                      <div className="text-xs text-gray-600">Täsmä</div>
                    </div>
                    <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                      <div className="text-lg font-bold text-blue-600">{atsAnalysis.analysis.synonyms || 0}</div>
                      <div className="text-xs text-gray-600">Syno</div>
                    </div>
                    <div className="p-2 bg-red-50 border border-red-200 rounded">
                      <div className="text-lg font-bold text-red-600">{atsAnalysis.analysis.missing}</div>
                      <div className="text-xs text-gray-600">Puuttuu</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Missing Keywords */}
              {atsAnalysis.missingCritical.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border p-4">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    Puuttuvat ({atsAnalysis.missingCritical.length})
                  </h3>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {atsAnalysis.missingCritical.map((keyword, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSmartInsertKeyword(keyword)}
                        disabled={insertingKeyword === keyword}
                        className={`w-full p-3 text-left rounded-lg transition-all group ${
                          insertingKeyword === keyword
                            ? 'bg-blue-100 border-blue-300 cursor-wait'
                            : 'bg-yellow-50 hover:bg-yellow-100 border-yellow-300'
                        } border`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-800 text-sm">{keyword}</span>
                          {insertingKeyword === keyword ? (
                            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-yellow-600 opacity-0 group-hover:opacity-100" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ✅ CENTER: Cover Letter (kaikille) */}
          <div className={isATSOptimized ? "lg:col-span-6" : "lg:col-span-12"}>
            {/* ✅ INFO BOX jos V1 */}
            {!isATSOptimized && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>💡 Vinkki:</strong> Tämä on tavallinen hakukirje ilman ATS-optimointia. 
                  Jos haluat lisätä avainsanoja ja analysoida ATS-pisteitä, luo uusi ATS-optimoitu hakukirje.
                </p>
              </div>
            )}

            <CoverLetterContainer ref={letterRef}>
              <CoverLetterTemplate 
                data={coverLetter}
                ai_data={coverLetter.ai_data}
                isPdfPreview={false}
              />
            </CoverLetterContainer>
          </div>

          {/* ✅ RIGHT: Synonym Matches (vain jos V2) */}
          {isATSOptimized && atsAnalysis && atsAnalysis.synonymMatches && atsAnalysis.synonymMatches.length > 0 && (
            <div className="lg:col-span-3 space-y-4">
              <div className="bg-white rounded-lg shadow-sm border p-4">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-600" />
                  Synonyymit ({atsAnalysis.synonymMatches.length})
                </h3>
                <div className="space-y-2">
                  {atsAnalysis.synonymMatches.map((match, idx) => (
                    <div key={idx} className="p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                      <div className="font-medium text-gray-800">{match.keyword}</div>
                      <div className="text-gray-600">→ "{match.foundAs}" ({Math.round(match.confidence * 100)}%)</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <TransparentErrorModal
        error={errorModal}
        onClose={() => setErrorModal(null)}
        onRetry={errorModal?.canRetry ? () => setErrorModal(null) : undefined}
      />

      {validationWarning?.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  ⚠️ Epäjohdonmukaisuus havaittu
                </h3>
                <p className="text-sm text-gray-700 mb-4">
                  {validationWarning.message}
                </p>

                {Object.entries(validationWarning.issues).map(([category, issues]) => {
                  const issueList = issues as string[];
                  if (issueList.length === 0) return null;
                  
                  return (
                    <div key={category} className="mb-3">
                      <p className="text-sm font-semibold text-gray-800 mb-1">
                        {category}:
                      </p>
                      <ul className="text-sm text-gray-600 space-y-1 ml-4">
                        {issueList.map((issue, idx) => (
                          <li key={idx} className="list-disc">• {issue}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={handleRejectWarning}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Hylkää
              </button>
              <button
                onClick={handleAcceptWarning}
                className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                Hyväksyn riskin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}