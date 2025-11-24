// app/edit-cover-letter/[id]/page.tsx - TÄYSI MUOKKAUSTUKI
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { 
  Save, ArrowLeft, Trash2, Download, TrendingUp, AlertTriangle, 
  Loader2, RefreshCw, Sparkles, Edit3, Type, Palette, Layout,
  AlignLeft, AlignCenter, AlignRight, Bold, Italic, Plus
} from 'lucide-react';
import SmartHeader from '@/components/ui/smartHeader';
import { fetchCoverLetterById, updateCoverLetter, deleteCoverLetter } from '@/services/coverLetterService-client';

export default function EditCoverLetterPage() {
  const params = useParams();
  const router = useRouter();
  const { getToken } = useAuth();
  const id = params?.id as string;

  const [coverLetter, setCoverLetter] = useState<any>(null);
  const [atsAnalysis, setATSAnalysis] = useState<any>(null);
  const [isATSOptimized, setIsATSOptimized] = useState<boolean>(false);
  
  // ✅ MUOKKAUSTILA
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  
  // ✅ ULKONÄKÖMUOKKAUS
  const [fontSize, setFontSize] = useState(16);
  const [lineHeight, setLineHeight] = useState(1.7);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right' | 'justify'>('justify');
  const [fontFamily, setFontFamily] = useState('serif');
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [insertingKeyword, setInsertingKeyword] = useState<string | null>(null);
  
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // ✅ AVAINSANAEHDOTUKSET
  const [showKeywordSuggestions, setShowKeywordSuggestions] = useState(true);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  
  const letterRef = useRef<HTMLDivElement>(null);

  // LATAA COVER LETTER
  useEffect(() => {
    const loadCoverLetter = async () => {
      try {
        const token = await getToken({ template: 'supabase' });
        if (!token) throw new Error('No authentication token');
        
        const { data, error } = await fetchCoverLetterById(id, token);
        
        if (error) throw error;
        if (!data) throw new Error('Hakukirjettä ei löytynyt');
        
        setCoverLetter(data);
        
        const content = data.content?.body || data.ai_data?.html?.content || '';
        setEditedContent(content);

        const hasATSData = !!data.ai_data?.ats_optimization;
        setIsATSOptimized(hasATSData);

        // Lataa tallennettua ulkonäköä
        if (data.ai_data?.styling) {
          setFontSize(data.ai_data.styling.fontSize || 16);
          setLineHeight(data.ai_data.styling.lineHeight || 1.7);
          setTextAlign(data.ai_data.styling.textAlign || 'justify');
          setFontFamily(data.ai_data.styling.fontFamily || 'serif');
        }

        if (hasATSData && data.content?.job_description) {
          analyzeATS(content, data.content.job_description);
        }
      } catch (error) {
        console.error('Error loading cover letter:', error);
        alert('Hakukirjeen lataaminen epäonnistui');
        router.push('/my-cover-letters');
      }
    };

    if (id) loadCoverLetter();
  }, [id, getToken, router]);

  // ATS-ANALYYSI
  const analyzeATS = async (content: string, jobDesc?: string) => {
    if (!isATSOptimized) return;
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
          jobDescription: jobDesc || coverLetter?.content?.job_description || '',
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

  // ✅ LISÄÄ AVAINSANA TEKSTIIN
  const insertKeywordAtCursor = (keyword: string) => {
    const textarea = document.getElementById('contentEditor') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const textBefore = editedContent.substring(0, start);
    const textAfter = editedContent.substring(end);
    
    const newContent = `${textBefore} ${keyword} ${textAfter}`;
    setEditedContent(newContent);
    
    // Aseta kursori avainsanan jälkeen
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + keyword.length + 1, start + keyword.length + 1);
    }, 0);
    
    setSelectedKeywords([...selectedKeywords, keyword]);
  };

  // SMART INSERT KEYWORD
  const handleSmartInsertKeyword = async (keyword: string) => {
    if (!isATSOptimized) {
      alert('Avainsanojen lisäys on käytettävissä vain ATS-optimoiduille hakukirjeille.');
      return;
    }

    setInsertingKeyword(keyword);
    
    try {
      const response = await fetch('/api/insert-keyword-smart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword,
          currentContent: editedContent,
          jobDescription: coverLetter?.content?.job_description,
          coverLetterId: id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Insertion failed');
      }

      if (data.improvedContent) {
        setEditedContent(data.improvedContent);
        await analyzeATS(data.improvedContent);
        
        setSuccessMessage(`✅ Avainsana "${keyword}" lisätty!`);
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (error) {
      console.error('Smart insertion error:', error);
      setErrorMessage('Avainsanan lisäys epäonnistui: ' + (error instanceof Error ? error.message : 'Unknown'));
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setInsertingKeyword(null);
    }
  };

  // ✅ IMPROVE ATS - KORJATTU VIRHEENKÄSITTELY
  const handleImproveATS = async () => {
    if (!atsAnalysis || !coverLetter) return;

    const missingCount = atsAnalysis.missingCritical?.length || 0;
    if (missingCount === 0) {
      alert('Ei puuttuvia avainsanoja - ATS-pisteet ovat jo hyvät!');
      return;
    }

    if (!confirm(
      `Nykyiset ATS-pisteet: ${atsAnalysis.score}%\n\n` +
      `Puuttuvia avainsanoja: ${missingCount} kpl\n\n` +
      'Haluatko että AI lisää ne automaattisesti?'
    )) return;

    setIsImproving(true);
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) throw new Error('No token');

      const response = await fetch('/api/improve-ats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentContent: editedContent,
          missingKeywords: atsAnalysis.missingCritical.slice(0, 5),
          jobDescription: coverLetter.content?.job_description,
          language: coverLetter.language || 'finnish'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'ATS improvement failed');
      }

      const data = await response.json();

      if (!data.improvedContent) {
        throw new Error('No improved content returned');
      }

      setEditedContent(data.improvedContent);
      await analyzeATS(data.improvedContent);

      setSuccessMessage(
        `✅ ATS-pisteet parannettu! Lisättiin: ${data.addedKeywords?.join(', ') || 'useita avainsanoja'}`
      );
      setTimeout(() => setSuccessMessage(null), 5000);

    } catch (error) {
      console.error('Improve ATS error:', error);
      const message = error instanceof Error ? error.message : 'Tuntematon virhe';
      setErrorMessage(`ATS-parannuksen luonti epäonnistui: ${message}`);
      setTimeout(() => setErrorMessage(null), 8000);
    } finally {
      setIsImproving(false);
    }
  };

  // ✅ TALLENNA (mukana ulkonäkö)
  const handleSave = async () => {
    if (!coverLetter) return;

    setIsSaving(true);
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) throw new Error('No token');

      const updatedData = {
        content: {
          ...coverLetter.content,
          body: editedContent
        },
        ai_data: {
          ...coverLetter.ai_data,
          html: {
            ...coverLetter.ai_data?.html,
            content: editedContent
          },
          styling: {
            fontSize,
            lineHeight,
            textAlign,
            fontFamily
          },
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
      
      setCoverLetter((prev: any) => prev ? { ...prev, content: { ...prev.content, body: editedContent } } : null);
      setIsEditing(false);
      
      setSuccessMessage('✅ Hakukirje tallennettu!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Save error:', error);
      setErrorMessage('Tallennus epäonnistui');
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  // POISTA
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

  // LATAA PDF
  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch('/api/generate-cover-letter-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          htmlContent: editedContent,
          letterId: id,
          styling: { fontSize, lineHeight, textAlign, fontFamily }
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
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg md:text-xl font-bold truncate max-w-[200px] md:max-w-none">
                  {coverLetter.title}
                </h1>
                {isATSOptimized ? (
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                    ATS-optimoitu
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full">
                    Tavallinen
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button 
                onClick={() => setIsEditing(true)}
                className="p-2 md:px-4 md:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Edit3 className="w-4 h-4" />
                <span className="hidden md:inline">Muokkaa</span>
              </button>
            ) : (
              <>
                <button 
                  onClick={() => {
                    setIsEditing(false);
                    setEditedContent(coverLetter.content?.body || coverLetter.ai_data?.html?.content || '');
                  }}
                  className="p-2 md:px-4 md:py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                  Peruuta
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
              </>
            )}
            
            <button 
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            </button>
            
            <button onClick={handleDelete} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="fixed top-20 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="fixed top-20 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {errorMessage}
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto p-3 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
        
          {/* LEFT: ATS + Styling Panel */}
          {isATSOptimized && atsAnalysis && (
            <div className="lg:col-span-3 space-y-4">
              {/* IMPROVE ATS BUTTON */}
              {atsAnalysis.score < 75 && atsAnalysis.missingCritical.length > 0 && (
                <button
                  onClick={handleImproveATS}
                  disabled={isImproving}
                  className="w-full p-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-purple-600 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isImproving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Parannetaan...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Paranna ATS
                    </>
                  )}
                </button>
              )}
              
              {/* ATS Score */}
              <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className={`p-4 ${getScoreBg(atsAnalysis.score)}`}>
                  <div className="text-center">
                    <div className={`text-4xl font-bold mb-2 ${getScoreColor(atsAnalysis.score)}`}>
                      {atsAnalysis.score}%
                    </div>
                    <p className="text-sm font-semibold text-gray-700">ATS-yhteensopivuus</p>
                    <button
                      onClick={() => analyzeATS(editedContent)}
                      disabled={isAnalyzing}
                      className="mt-3 text-xs text-blue-600 hover:underline flex items-center gap-1 mx-auto"
                    >
                      <RefreshCw className="w-3 h-3" />
                      {isAnalyzing ? 'Analysoidaan...' : 'Päivitä'}
                    </button>
                  </div>
                </div>
              </div>

              {/* ✅ AVAINSANAEHDOTUKSET */}
              {showKeywordSuggestions && atsAnalysis.missingCritical.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                      Puuttuvat ({atsAnalysis.missingCritical.length})
                    </h3>
                  </div>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {atsAnalysis.missingCritical.map((keyword: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-2">
                        <button
                          onClick={() => insertKeywordAtCursor(keyword)}
                          className="flex-1 p-2 text-left text-sm bg-yellow-50 hover:bg-yellow-100 border border-yellow-300 rounded transition"
                        >
                          {keyword}
                        </button>
                        <button
                          onClick={() => handleSmartInsertKeyword(keyword)}
                          disabled={insertingKeyword === keyword}
                          className="px-3 py-2 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 disabled:opacity-50"
                          title="AI lisää automaattisesti"
                        >
                          {insertingKeyword === keyword ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Sparkles className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ✅ ULKONÄKÖASETUKSET */}
              {isEditing && (
                <div className="bg-white rounded-lg shadow-sm border p-4">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Ulkonäkö
                  </h3>
                  
                  {/* Font Size */}
                  <div className="mb-3">
                    <label className="text-xs text-gray-600 mb-1 block">Fonttikoko: {fontSize}px</label>
                    <input
                      type="range"
                      min="12"
                      max="20"
                      value={fontSize}
                      onChange={(e) => setFontSize(parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  {/* Line Height */}
                  <div className="mb-3">
                    <label className="text-xs text-gray-600 mb-1 block">Riviväli: {lineHeight}</label>
                    <input
                      type="range"
                      min="1.2"
                      max="2.0"
                      step="0.1"
                      value={lineHeight}
                      onChange={(e) => setLineHeight(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  {/* Font Family */}
                  <div className="mb-3">
                    <label className="text-xs text-gray-600 mb-1 block">Fontti</label>
                    <select
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value)}
                      className="w-full p-2 border rounded text-sm"
                    >
                      <option value="serif">Serif (Merriweather)</option>
                      <option value="sans-serif">Sans-serif (Arial)</option>
                      <option value="monospace">Monospace (Courier)</option>
                    </select>
                  </div>

                  {/* Text Align */}
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">Tasaus</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setTextAlign('left')}
                        className={`p-2 border rounded ${textAlign === 'left' ? 'bg-blue-100 border-blue-500' : ''}`}
                      >
                        <AlignLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setTextAlign('center')}
                        className={`p-2 border rounded ${textAlign === 'center' ? 'bg-blue-100 border-blue-500' : ''}`}
                      >
                        <AlignCenter className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setTextAlign('right')}
                        className={`p-2 border rounded ${textAlign === 'right' ? 'bg-blue-100 border-blue-500' : ''}`}
                      >
                        <AlignRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setTextAlign('justify')}
                        className={`p-2 border rounded ${textAlign === 'justify' ? 'bg-blue-100 border-blue-500' : ''}`}
                      >
                        <Layout className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CENTER: Cover Letter */}
          <div className={isATSOptimized ? "lg:col-span-9" : "lg:col-span-12"}>
            {!isATSOptimized && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>💡 Vinkki:</strong> Tämä on tavallinen hakukirje ilman ATS-optimointia.
                </p>
              </div>
            )}

            <div className="bg-white rounded-lg shadow-sm border p-6">
              {isEditing ? (
                <textarea
                  id="contentEditor"
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full min-h-[600px] p-4 border border-gray-300 rounded leading-relaxed"
                  style={{
                    fontSize: `${fontSize}px`,
                    lineHeight: lineHeight,
                    textAlign: textAlign,
                    fontFamily: fontFamily === 'serif' ? 'Merriweather, serif' : fontFamily
                  }}
                  placeholder="Muokkaa hakukirjettä..."
                />
              ) : (
                <div 
                  className="whitespace-pre-wrap"
                  style={{
                    fontSize: `${fontSize}px`,
                    lineHeight: lineHeight,
                    textAlign: textAlign,
                    fontFamily: fontFamily === 'serif' ? 'Merriweather, serif' : fontFamily
                  }}
                >
                  {editedContent}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}