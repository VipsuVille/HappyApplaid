// app/edit-cover-letter/[id]/page.tsx - FINAL KORJATTU VERSIO
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { 
  Save, ArrowLeft, Trash2, Download, TrendingUp, AlertTriangle, 
  Loader2, RefreshCw, Sparkles, Edit3, Palette, Layout,
  AlignLeft, AlignCenter, AlignRight, Zap, CheckCircle, XCircle, Minimize2
} from 'lucide-react';
import SmartHeader from '@/components/ui/smartHeader';
import { fetchCoverLetterById, updateCoverLetter, deleteCoverLetter } from '@/services/coverLetterService-client';

const A4_HEIGHT_PX = 1123;
const MAX_CONTENT_HEIGHT_PX = Math.round(A4_HEIGHT_PX * 0.9);

export default function EditCoverLetterPage() {
  const params = useParams();
  const router = useRouter();
  const { getToken } = useAuth();
  const id = params?.id as string;

  const [coverLetter, setCoverLetter] = useState<any>(null);
  const [atsAnalysis, setATSAnalysis] = useState<any>(null);
  const [isATSOptimized, setIsATSOptimized] = useState<boolean>(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  
  // ✅ ULKONÄKÖMUOKKAUS
  const [fontSize, setFontSize] = useState(16);
  const [lineHeight, setLineHeight] = useState(1.7);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right' | 'justify'>('justify');
  const [fontFamily, setFontFamily] = useState('serif');
  
  // ✅ SIVUN OVERFLOW
  const [pageOverflow, setPageOverflow] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const previewRef = useRef<HTMLDivElement>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [insertingKeyword, setInsertingKeyword] = useState<string | null>(null);
  
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [showKeywordSuggestions, setShowKeywordSuggestions] = useState(true);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);

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

  useEffect(() => {
    if (!isEditing && previewRef.current) {
      const checkHeight = () => {
        const height = previewRef.current?.scrollHeight || 0;
        
        console.log('📏 Content height:', {
          scrollHeight: height,
          maxAllowed: MAX_CONTENT_HEIGHT_PX,
          overflow: height > MAX_CONTENT_HEIGHT_PX
        });
        
        setContentHeight(height);
        setPageOverflow(height > MAX_CONTENT_HEIGHT_PX);
      };
      
      checkHeight();
      setTimeout(checkHeight, 500);
      setTimeout(checkHeight, 1000);
    }
  }, [editedContent, fontSize, lineHeight, textAlign, fontFamily, isEditing]);

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

  const handleAutoCompact = () => {
    if (!pageOverflow) return;
    
    const overflow = contentHeight - MAX_CONTENT_HEIGHT_PX;
    const overflowPercent = (overflow / MAX_CONTENT_HEIGHT_PX) * 100;
    
    let newFontSize = fontSize;
    let newLineHeight = lineHeight;
    
    if (overflowPercent > 10) {
      newFontSize = Math.max(11, fontSize - 2);
      newLineHeight = Math.max(1.3, lineHeight - 0.3);
    } else if (overflowPercent > 5) {
      newFontSize = Math.max(12, fontSize - 1);
      newLineHeight = Math.max(1.4, lineHeight - 0.2);
    } else {
      newLineHeight = Math.max(1.5, lineHeight - 0.1);
    }
    
    setFontSize(newFontSize);
    setLineHeight(newLineHeight);
    
    setSuccessMessage('✅ Ulkonäköä tiivistetty!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const insertKeywordAtCursor = (keyword: string) => {
    const textarea = document.getElementById('contentEditor') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const textBefore = editedContent.substring(0, start);
    const textAfter = editedContent.substring(end);
    
    const newContent = `${textBefore} ${keyword} ${textAfter}`;
    setEditedContent(newContent);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + keyword.length + 1, start + keyword.length + 1);
    }, 0);
    
    setSelectedKeywords([...selectedKeywords, keyword]);
  };

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
      setErrorMessage('Avainsanan lisäys epäonnistui');
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setInsertingKeyword(null);
    }
  };

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

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch('/api/generate-cover-letter-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ letterId: id }),
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

  const getScoreIcon = (score: number) => {
    if (score >= 75) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (score >= 50) return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    return <XCircle className="w-5 h-5 text-red-600" />;
  };

  const getScoreLabel = (score: number) => {
    if (score >= 75) return 'Erinomainen';
    if (score >= 50) return 'Hyvä';
    return 'Parannettavaa';
  };

  if (!coverLetter) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex items-center justify-center">
        <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-2xl shadow-2xl p-8 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-lg font-bold text-gray-900">Ladataan hakukirjettä...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 font-sans text-gray-900 relative overflow-hidden">
      
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-indigo-400/30 to-purple-400/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-pink-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      <SmartHeader />
      
      {/* TOP BAR */}
      <div className="px-2 md:px-6 py-3 md:py-4 mt-16 sticky top-16 z-40">
        <div className="max-w-[1800px] mx-auto backdrop-blur-xl bg-white/80 border-2 border-white/40 rounded-xl md:rounded-2xl shadow-xl p-3 md:p-4">
          <div className="flex items-center justify-between gap-2">
            
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <button 
                onClick={() => router.push('/my-cover-letters')}
                className="p-2 h-9 w-9 md:h-10 md:w-10 bg-white/90 border-2 border-white/60 rounded-full flex items-center justify-center shadow-lg hover:bg-gray-50 flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 text-gray-700" />
              </button>
              
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm md:text-xl font-bold text-gray-800 truncate">
                    {coverLetter.title}
                  </h1>
                  {isATSOptimized ? (
                    <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full flex-shrink-0">
                      <Zap className="w-3 h-3"/> ATS
                    </span>
                  ) : (
                    <span className="hidden sm:inline-flex px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full flex-shrink-0">
                      Tavallinen
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
              {!isEditing ? (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="p-2 h-9 md:h-10 md:px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 flex items-center gap-1 md:gap-2 shadow-md text-xs md:text-sm font-semibold"
                >
                  <Edit3 className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">Muokkaa</span>
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => {
                      setIsEditing(false);
                      setEditedContent(coverLetter.content?.body || '');
                    }}
                    className="p-2 md:px-3 h-9 md:h-10 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-xs md:text-sm font-semibold"
                  >
                    Peruuta
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="p-2 md:px-3 h-9 md:h-10 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg hover:from-green-600 hover:to-teal-700 flex items-center gap-1 shadow-md disabled:opacity-50 text-xs md:text-sm font-semibold"
                  >
                    {isSaving ? <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" /> : <Save className="w-3 h-3 md:w-4 md:h-4" />}
                    <span className="hidden sm:inline">Tallenna</span>
                  </button>
                </>
              )}
              
              <button 
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="p-2 h-9 w-9 md:h-10 md:w-10 bg-white/90 border-2 border-white/60 rounded-full flex items-center justify-center shadow-lg hover:bg-gray-50"
              >
                {isDownloading ? <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" /> : <Download className="w-3 h-3 md:w-4 md:h-4" />}
              </button>
              
              <button 
                onClick={handleDelete} 
                className="p-2 h-9 w-9 md:h-10 md:w-10 bg-white/90 border-2 border-white/60 rounded-full flex items-center justify-center shadow-lg hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 md:w-5 md:h-5 text-red-500" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="fixed top-20 right-4 bg-green-500 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg shadow-lg z-50 text-sm md:text-base animate-fade-in">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="fixed top-20 right-4 bg-red-500 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg shadow-lg z-50 text-sm md:text-base animate-fade-in">
          {errorMessage}
        </div>
      )}

      {/* MAIN CONTENT */}
      <div className="max-w-[1800px] mx-auto p-2 md:p-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 md:gap-6">
        
          {/* ✅ LEFT PANEL: AINA NÄKYVISSÄ FONTTISÄÄTIMET */}
          <div className="lg:col-span-3 space-y-3 md:space-y-4">
            
            {/* ✅ ULKONÄKÖASETUKSET - AINA NÄKYVISSÄ! */}
            <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-xl md:rounded-2xl shadow-xl p-3 md:p-4">
              <h3 className="text-sm md:text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Ulkonäkö & Koko
              </h3>
              
              {/* Font Size */}
              <div className="mb-3">
                <label className="text-xs text-gray-600 mb-1 block flex items-center justify-between">
                  <span>Fonttikoko</span>
                  <span className="font-bold text-indigo-600">{fontSize}px</span>
                </label>
                <input
                  type="range"
                  min="11"
                  max="20"
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value))}
                  className="w-full h-2 bg-gradient-to-r from-blue-200 to-indigo-300 rounded-lg appearance-none cursor-pointer slider-thumb"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>11px</span>
                  <span>20px</span>
                </div>
              </div>

              {/* Line Height */}
              <div className="mb-3">
                <label className="text-xs text-gray-600 mb-1 block flex items-center justify-between">
                  <span>Riviväli</span>
                  <span className="font-bold text-purple-600">{lineHeight.toFixed(1)}</span>
                </label>
                <input
                  type="range"
                  min="1.2"
                  max="2.0"
                  step="0.1"
                  value={lineHeight}
                  onChange={(e) => setLineHeight(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gradient-to-r from-purple-200 to-pink-300 rounded-lg appearance-none cursor-pointer slider-thumb"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1.2</span>
                  <span>2.0</span>
                </div>
              </div>

              {/* Font Family */}
              <div className="mb-3">
                <label className="text-xs text-gray-600 mb-1 block">Fontti</label>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg text-xs md:text-sm bg-white/80"
                >
                  <option value="serif">Serif (Merriweather)</option>
                  <option value="sans-serif">Sans-serif (Arial)</option>
                  <option value="monospace">Monospace (Courier)</option>
                </select>
              </div>

              {/* Text Align */}
              <div>
                <label className="text-xs text-gray-600 mb-2 block">Tasaus</label>
                <div className="grid grid-cols-4 gap-1">
                  <button
                    onClick={() => setTextAlign('left')}
                    className={`p-2 border rounded-lg transition-all ${textAlign === 'left' ? 'bg-blue-100 border-blue-500 scale-105' : 'bg-white/80 hover:bg-gray-100 border-gray-300'}`}
                  >
                    <AlignLeft className="w-4 h-4 mx-auto" />
                  </button>
                  <button
                    onClick={() => setTextAlign('center')}
                    className={`p-2 border rounded-lg transition-all ${textAlign === 'center' ? 'bg-blue-100 border-blue-500 scale-105' : 'bg-white/80 hover:bg-gray-100 border-gray-300'}`}
                  >
                    <AlignCenter className="w-4 h-4 mx-auto" />
                  </button>
                  <button
                    onClick={() => setTextAlign('right')}
                    className={`p-2 border rounded-lg transition-all ${textAlign === 'right' ? 'bg-blue-100 border-blue-500 scale-105' : 'bg-white/80 hover:bg-gray-100 border-gray-300'}`}
                  >
                    <AlignRight className="w-4 h-4 mx-auto" />
                  </button>
                  <button
                    onClick={() => setTextAlign('justify')}
                    className={`p-2 border rounded-lg transition-all ${textAlign === 'justify' ? 'bg-blue-100 border-blue-500 scale-105' : 'bg-white/80 hover:bg-gray-100 border-gray-300'}`}
                  >
                    <Layout className="w-4 h-4 mx-auto" />
                  </button>
                </div>
              </div>
              
              {/* ✅ AUTOMAATTINEN TIIVISTYS NAPPI */}
              {pageOverflow && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={handleAutoCompact}
                    className="w-full p-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-semibold hover:from-amber-600 hover:to-orange-700 shadow-lg flex items-center justify-center gap-2">
<Minimize2 className="w-4 h-4" />
Tiivistä automaattisesti
</button>
<p className="text-xs text-gray-600 mt-2 text-center">
Pienentää fonttia ja riviväliä sopivaksi
</p>
</div>
)}
</div>
{/* ATS SCORE (jos ATS-optimoitu) */}
        {isATSOptimized && atsAnalysis && (
          <>
            {atsAnalysis.score < 75 && atsAnalysis.missingCritical?.length > 0 && (
              <button
                onClick={handleImproveATS}
                disabled={isImproving}
                className="w-full p-3 md:p-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl md:rounded-2xl font-semibold hover:from-blue-600 hover:to-purple-600 shadow-xl disabled:opacity-50 flex items-center justify-center gap-2 text-sm md:text-base"
              >
                {isImproving ? (
                  <>
                    <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                    Parannetaan...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
                    Paranna ATS
                  </>
                )}
              </button>
            )}
            
            <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-xl md:rounded-2xl shadow-xl overflow-hidden">
              <div className={`p-3 md:p-4 ${getScoreBg(atsAnalysis.score)}`}>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    {getScoreIcon(atsAnalysis.score)}
                    <div className={`text-3xl md:text-4xl font-bold ${getScoreColor(atsAnalysis.score)}`}>
                      {atsAnalysis.score}%
                    </div>
                  </div>
                  <p className="text-xs md:text-sm font-semibold text-gray-700">
                    {getScoreLabel(atsAnalysis.score)}
                  </p>
                  <button
                    onClick={() => analyzeATS(editedContent)}
                    disabled={isAnalyzing}
                    className="mt-2 md:mt-3 text-xs text-blue-600 hover:underline flex items-center gap-1 mx-auto"
                  >
                    <RefreshCw className="w-3 h-3" />
                    {isAnalyzing ? 'Analysoidaan...' : 'Päivitä'}
                  </button>
                </div>
              </div>
            </div>

            {showKeywordSuggestions && atsAnalysis.missingCritical?.length > 0 && (
              <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-xl md:rounded-2xl shadow-xl p-3 md:p-4">
                <div className="flex items-center justify-between mb-2 md:mb-3">
                  <h3 className="text-sm md:text-base font-semibold text-gray-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    Puuttuvat ({atsAnalysis.missingCritical.length})
                  </h3>
                </div>
                <div className="space-y-2 max-h-60 md:max-h-80 overflow-y-auto">
                  {atsAnalysis.missingCritical.map((keyword: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2">
                      <button
                        onClick={() => insertKeywordAtCursor(keyword)}
                        className="flex-1 p-2 text-left text-xs md:text-sm bg-yellow-50 hover:bg-yellow-100 border border-yellow-300 rounded-lg"
                      >
                        {keyword}
                      </button>
                      <button
                        onClick={() => handleSmartInsertKeyword(keyword)}
                        disabled={insertingKeyword === keyword}
                        className="px-2 md:px-3 py-2 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 disabled:opacity-50"
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
          </>
        )}
      </div>

      {/* CENTER: Cover Letter */}
      <div className="lg:col-span-9">
        
        {pageOverflow && !isEditing && (
          <div className="mb-3 md:mb-4 p-3 md:p-4 bg-red-50 border-2 border-red-500 rounded-xl md:rounded-2xl">
            <div className="flex items-start gap-2 md:gap-3">
              <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-red-900 mb-1 text-sm md:text-base">
                  ⚠️ Sisältö ylittää 90% A4-sivun!
                </h3>
                <p className="text-xs md:text-sm text-red-800 mb-2 md:mb-3">
                  Hakukirjeesi on <strong>{Math.round((contentHeight - MAX_CONTENT_HEIGHT_PX) / MAX_CONTENT_HEIGHT_PX * 100)}%</strong> liian pitkä. 
                  Allekirjoitus ei mahdu samalle sivulle.
                </p>
                <p className="text-xs text-red-700 mb-3">
                  💡 Käytä vasemman palkin "Tiivistä automaattisesti" -nappia tai säädä fonttikokoa/riviväliä manuaalisesti.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {!isATSOptimized && (
          <div className="mb-3 md:mb-4 p-3 md:p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs md:text-sm text-blue-800">
              <strong>💡 Vinkki:</strong> Tämä on tavallinen hakukirje ilman ATS-optimointia.
            </p>
          </div>
        )}

        <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-xl md:rounded-2xl shadow-xl p-3 md:p-6">
          {isEditing ? (
            <textarea
              id="contentEditor"
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full min-h-[400px] md:min-h-[600px] p-3 md:p-4 border border-gray-300 rounded-lg leading-relaxed bg-white shadow-inner focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
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
              ref={previewRef}
              className="whitespace-pre-wrap p-3 md:p-4 border border-gray-200 rounded-lg bg-white shadow-inner"
              style={{
                fontSize: `${fontSize}px`,
                lineHeight: lineHeight,
                textAlign: textAlign,
                fontFamily: fontFamily === 'serif' ? 'Merriweather, serif' : fontFamily
              }}
              dangerouslySetInnerHTML={{ __html: editedContent }}
            />
          )}
          
          {!isEditing && (
            <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-gray-200 relative">
              <div className="flex items-center justify-between text-xs md:text-sm text-gray-600 mb-2">
                <span>A4-sivun täyttö (Max 90%):</span>
                <span className={pageOverflow ? 'text-red-600 font-bold' : 'text-green-600 font-semibold'}>
                  {Math.round((contentHeight / A4_HEIGHT_PX) * 100)}% / 100%
                </span>
              </div>
              <div className="mt-2 h-2 md:h-3 bg-gray-200 rounded-full overflow-hidden relative">
                <div 
                  className="h-full transition-all duration-300"
                  style={{ 
                    width: `${Math.min((contentHeight / A4_HEIGHT_PX) * 100, 100)}%`,
                    backgroundColor: pageOverflow ? '#ef4444' : '#10b981'
                  }}
                />
                <div 
                  className="absolute top-0 h-full w-0.5 bg-yellow-500" 
                  style={{left: '90%'}}
                  title="90% raja (1010px)"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1 text-right">
                ✅ Tavoite: 90% = {MAX_CONTENT_HEIGHT_PX}px | Nykyinen: {contentHeight}px
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
  
  <style jsx global>{`
    @keyframes fade-in {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .animate-fade-in {
      animation: fade-in 0.3s ease-out;
    }
    
    .slider-thumb::-webkit-slider-thumb {
      appearance: none;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      transition: transform 0.2s;
    }
    
    .slider-thumb::-webkit-slider-thumb:hover {
      transform: scale(1.2);
    }
    
    .slider-thumb::-moz-range-thumb {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      cursor: pointer;
      border: none;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
  `}</style>
</div>
);
}