'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { 
  Save, ArrowLeft, Trash2, Download, Loader2, 
  Type, AlignLeft, Palette, Eye, Edit3, Sparkles,
  GripVertical, Plus, Minus, Copy, RotateCcw
} from 'lucide-react';
import { supabaseAdmin } from '@/lib/supabase'; // ✅ KRIITTINEN MUUTOS

// ════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════

interface CoverLetterData {
  id: string;
  user_id: string;
  title: string;
  language: string;
  content: {
    body: string;
    signature: string;
    contactInfo: {
      name: string;
      email: string;
      phone: string;
      location: string;
    };
  };
  ai_data?: {
    style?: 'professional' | 'casual' | 'creative';
    key_highlights?: string[];
  };
  created_at: string;
  updated_at: string;
}

interface StyleSettings {
  fontSize: number;
  lineHeight: number;
  paragraphSpacing: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  fontFamily: string;
  headerStyle: 'modern' | 'classic' | 'minimal';
  accentColor: string;
}

// ════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════

export default function EditCoverLetterPage() {
  const params = useParams();
  const router = useRouter();
  const { userId } = useAuth();
  const id = params?.id as string;

  const [letterData, setLetterData] = useState<CoverLetterData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingParagraph, setEditingParagraph] = useState<number | null>(null);
  
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [styleSettings, setStyleSettings] = useState<StyleSettings>({
    fontSize: 11,
    lineHeight: 1.8,
    paragraphSpacing: 16,
    marginTop: 25,
    marginBottom: 25,
    marginLeft: 20,
    marginRight: 20,
    fontFamily: 'Inter',
    headerStyle: 'modern',
    accentColor: '#3b82f6',
  });

  // Split body into editable paragraphs
  const [paragraphs, setParagraphs] = useState<string[]>([]);

  useEffect(() => {
    if (letterData?.content?.body) {
      setParagraphs(letterData.content.body.split('\n\n').filter(p => p.trim()));
    }
  }, [letterData?.content?.body]);

  // --- INITIAL LOAD ---
  useEffect(() => {
    const loadCoverLetter = async () => {
      if (!userId || !id) return;

      try {
        const { data, error } = await supabaseAdmin
          .from('cover_letters')
          .select('*')
          .eq('id', id)
          .eq('user_id', userId)
          .single();

        if (error) throw error;
        
        if (data) {
          setLetterData(data);
          console.log('✅ Cover letter loaded:', data.title);
        }

      } catch (err) {
        console.error('Error loading cover letter:', err);
        setErrorMessage('Hakukirjeen lataaminen epäonnistui');
      } finally {
        setIsLoading(false);
      }
    };

    loadCoverLetter();
  }, [id, userId]);

  // --- HANDLERS ---
  const handleParagraphChange = (index: number, value: string) => {
    const newParagraphs = [...paragraphs];
    newParagraphs[index] = value;
    setParagraphs(newParagraphs);
  };

  const handleParagraphDelete = (index: number) => {
    setParagraphs(paragraphs.filter((_, i) => i !== index));
  };

  const handleParagraphAdd = (index: number) => {
    const newParagraphs = [...paragraphs];
    newParagraphs.splice(index + 1, 0, '');
    setParagraphs(newParagraphs);
    setEditingParagraph(index + 1);
  };

  const handleParagraphMove = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === paragraphs.length - 1) return;

    const newParagraphs = [...paragraphs];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newParagraphs[index], newParagraphs[targetIndex]] = [newParagraphs[targetIndex], newParagraphs[index]];
    setParagraphs(newParagraphs);
  };

  const handleStyleChange = (setting: keyof StyleSettings, value: any) => {
    setStyleSettings(prev => ({
      ...prev,
      [setting]: value,
    }));
  };

  const handleResetStyles = () => {
    setStyleSettings({
      fontSize: 11,
      lineHeight: 1.8,
      paragraphSpacing: 16,
      marginTop: 25,
      marginBottom: 25,
      marginLeft: 20,
      marginRight: 20,
      fontFamily: 'Inter',
      headerStyle: 'modern',
      accentColor: '#3b82f6',
    });
  };

  const handleSave = async () => {
    if (!letterData || !userId) return;
    setIsSaving(true);

    try {
      const updatedContent = {
        ...letterData.content,
        body: paragraphs.join('\n\n'),
      };

      const { error } = await supabaseAdmin
        .from('cover_letters')
        .update({
          title: letterData.title,
          content: updatedContent,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;

      setLetterData({ ...letterData, content: updatedContent });
      setSuccessMessage('✅ Hakukirje tallennettu!');
      setTimeout(() => setSuccessMessage(null), 3000);
      setIsEditing(false);
      setEditingParagraph(null);
    } catch (error) {
      console.error('Save error:', error);
      setErrorMessage('Tallennus epäonnistui');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch('/api/generate-cover-letter-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverLetterId: id }),
      });

      if (!response.ok) throw new Error('PDF generation failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CoverLetter_${letterData?.title || 'document'}.pdf`;
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

  const handleDelete = async () => {
    if (!confirm('Haluatko varmasti poistaa tämän hakukirjeen?')) return;
    
    try {
      const { error } = await supabaseAdmin
        .from('cover_letters')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
      
      router.push('/my-cover-letters');
    } catch (error) {
      console.error('Delete error:', error);
      alert('Poisto epäonnistui');
    }
  };

  // --- LOADING STATE ---
  if (isLoading || !letterData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-amber-500/20 blur-3xl rounded-full"></div>
          <div className="relative backdrop-blur-2xl bg-slate-900/80 border border-slate-700/50 rounded-3xl shadow-2xl p-12 text-center">
            <div className="relative">
              <Loader2 className="w-16 h-16 animate-spin text-orange-400 mx-auto mb-6" />
              <div className="absolute inset-0 bg-orange-400/20 blur-2xl rounded-full"></div>
            </div>
            <p className="text-xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
              Ladataan hakukirjettä...
            </p>
          </div>
        </div>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('fi-FI', { year: 'numeric', month: 'long', day: 'numeric' });

  // --- MAIN RENDER ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 font-sans text-slate-100 relative overflow-hidden">
      
      {/* ANIMATED BACKGROUND */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-orange-500/10 to-amber-600/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-gradient-to-br from-orange-500/8 to-slate-700/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1.5s'}}></div>
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-gradient-to-br from-amber-500/8 to-orange-600/8 rounded-full blur-3xl animate-pulse" style={{animationDelay: '3s'}}></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]"></div>
      </div>

      {/* TOP BAR */}
      <div className="px-4 md:px-8 py-4 mt-20 sticky top-20 z-40">
        <div className="max-w-[1800px] mx-auto backdrop-blur-2xl bg-slate-900/50 border border-slate-700/50 rounded-2xl shadow-2xl p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button 
                onClick={() => router.push('/my-cover-letters')}
                className="group relative p-3 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:bg-slate-700/50 transition-all duration-300 flex-shrink-0 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <ArrowLeft className="w-5 h-5 text-slate-300 group-hover:text-orange-400 relative z-10 transition-colors" />
              </button>
              
              <div className="min-w-0 flex-1">
                <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent truncate">
                  {letterData.title || 'Nimetön hakukirje'}
                </h1>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              {!isEditing ? (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="group relative px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl font-bold text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all duration-300 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-amber-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative flex items-center gap-2">
                    <Edit3 className="w-4 h-4" />
                    <span className="hidden sm:inline">Muokkaa</span>
                  </div>
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => {
                      setIsEditing(false);
                      setEditingParagraph(null);
                    }}
                    className="px-4 py-3 bg-slate-800/50 border border-slate-700/50 text-slate-300 rounded-xl hover:bg-slate-700/50 transition-all font-semibold flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    <span className="hidden sm:inline">Esikatsele</span>
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="group relative px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl font-bold text-white shadow-lg shadow-green-500/25 hover:shadow-green-500/40 disabled:opacity-50 transition-all overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative flex items-center gap-2">
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span className="hidden sm:inline">Tallenna</span>
                    </div>
                  </button>
                </>
              )}
              
              <button 
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="group relative p-3 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:bg-slate-700/50 transition-all overflow-hidden"
                title="Lataa PDF"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                {isDownloading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-orange-400 relative z-10" />
                ) : (
                  <Download className="w-5 h-5 text-slate-300 group-hover:text-blue-400 relative z-10 transition-colors" />
                )}
              </button>
              
              <button 
                onClick={handleDelete} 
                className="group relative p-3 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:bg-red-500/20 hover:border-red-500/50 transition-all overflow-hidden"
                title="Poista hakukirje"
              >
                <Trash2 className="w-5 h-5 text-slate-400 group-hover:text-red-400 relative z-10 transition-colors" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* NOTIFICATIONS */}
      {successMessage && (
        <div className="fixed top-32 right-6 z-50 animate-slide-in-right">
          <div className="backdrop-blur-2xl bg-green-500/20 border border-green-400/30 rounded-2xl shadow-2xl p-4 flex items-center gap-3">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <p className="font-bold text-green-100">{successMessage}</p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="fixed top-32 right-6 z-50 animate-slide-in-right">
          <div className="backdrop-blur-2xl bg-red-500/20 border border-red-400/30 rounded-2xl shadow-2xl p-4 flex items-center gap-3">
            <p className="font-bold text-red-100">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div className="max-w-[1800px] mx-auto px-4 md:px-8 py-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT SIDEBAR - STYLE CONTROLS */}
          {isEditing && (
            <div className="lg:col-span-3 space-y-6">
              
              {/* Quick Actions */}
              <div className="backdrop-blur-2xl bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-slate-100 mb-4">Pika-toiminnot</h3>
                <div className="space-y-2">
                  <button 
                    onClick={handleResetStyles}
                    className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm font-semibold text-slate-300 hover:bg-slate-700/50 transition-all flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Palauta oletusarvot
                  </button>
                </div>
              </div>

              {/* Typography */}
              <div className="backdrop-blur-2xl bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6 hover:border-orange-500/30 transition-all">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gradient-to-br from-orange-500/20 to-amber-500/20 rounded-xl border border-orange-500/20">
                    <Type className="w-5 h-5 text-orange-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-100">Typografia</h3>
                </div>
                
                <div className="space-y-5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-slate-400 font-medium">Fonttikoko</label>
                      <span className="text-sm font-bold text-orange-400">{styleSettings.fontSize}pt</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="14"
                      step="0.5"
                      value={styleSettings.fontSize}
                      onChange={(e) => handleStyleChange('fontSize', parseFloat(e.target.value))}
                      className="w-full h-2 bg-slate-700/50 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-orange-500 [&::-webkit-slider-thumb]:to-amber-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-orange-500/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-slate-400 font-medium">Riviväli</label>
                      <span className="text-sm font-bold text-orange-400">{styleSettings.lineHeight}</span>
                    </div>
                    <input
                      type="range"
                      min="1.5"
                      max="2.0"
                      step="0.1"
                      value={styleSettings.lineHeight}
                      onChange={(e) => handleStyleChange('lineHeight', parseFloat(e.target.value))}
                      className="w-full h-2 bg-slate-700/50 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-orange-500 [&::-webkit-slider-thumb]:to-amber-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-orange-500/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-slate-400 font-medium">Fontti</label>
                    <select
                      value={styleSettings.fontFamily}
                      onChange={(e) => handleStyleChange('fontFamily', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-orange-500/50"
                    >
                      <option value="Inter">Inter (Modern)</option>
                      <option value="Georgia">Georgia (Classic)</option>
                      <option value="Arial">Arial (Clean)</option>
                      <option value="Times New Roman">Times New Roman (Traditional)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Colors */}
              <div className="backdrop-blur-2xl bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6 hover:border-purple-500/30 transition-all">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/20">
                    <Palette className="w-5 h-5 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-100">Värit</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-slate-400 font-medium mb-2 block">Korostusväri</label>
                    <div className="flex gap-2 flex-wrap">
                      {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'].map(color => (
                        <button
                          key={color}
                          onClick={() => handleStyleChange('accentColor', color)}
                          className={`w-10 h-10 rounded-xl transition-all ${styleSettings.accentColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : 'opacity-60 hover:opacity-100'}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Margins */}
              <div className="backdrop-blur-2xl bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6 hover:border-amber-500/30 transition-all">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-xl border border-amber-500/20">
                    <AlignLeft className="w-5 h-5 text-amber-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-100">Marginaalit</h3>
                </div>
                
                <div className="space-y-5">
                  {[
                    { key: 'marginTop', label: 'Ylä' },
                    { key: 'marginBottom', label: 'Ala' },
                    { key: 'marginLeft', label: 'Vasen' },
                    { key: 'marginRight', label: 'Oikea' }
                  ].map(({ key, label }) => (
                    <div key={key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-slate-400 font-medium">{label}</label>
                        <span className="text-sm font-bold text-amber-400">{styleSettings[key as keyof StyleSettings]}mm</span>
                      </div>
                      <input
                        type="range"
                        min="15"
                        max={key.includes('Top') || key.includes('Bottom') ? 30 : 25}
                        step="1"
                        value={styleSettings[key as keyof StyleSettings] as number}
                        onChange={(e) => handleStyleChange(key as keyof StyleSettings, parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-700/50 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-amber-500 [&::-webkit-slider-thumb]:to-orange-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-amber-500/50"
                      />
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* CENTER: COVER LETTER PREVIEW */}
          <div className={isEditing ? "lg:col-span-9" : "lg:col-span-12"}>
            <div className="backdrop-blur-2xl bg-slate-900/50 border border-slate-700/50 rounded-3xl shadow-2xl p-8 overflow-hidden">
               <div className="overflow-x-auto pb-6 custom-scrollbar flex justify-center bg-slate-950/30 rounded-2xl border border-slate-800/50 inner-shadow">
                  <div 
                    className="origin-top transition-all duration-500 bg-white shadow-2xl mt-6 mb-6 print:shadow-none print:m-0"
                    style={{
                      width: '210mm',
                      minHeight: '297mm',
                      transform: typeof window !== 'undefined' && window.innerWidth < 640 ? 'scale(0.4)' : typeof window !== 'undefined' && window.innerWidth < 1024 ? 'scale(0.6)' : 'scale(0.85)',
                      transformOrigin: 'top center',
                      padding: `${styleSettings.marginTop}mm ${styleSettings.marginRight}mm ${styleSettings.marginBottom}mm ${styleSettings.marginLeft}mm`,
                      fontSize: `${styleSettings.fontSize}pt`,
                      lineHeight: styleSettings.lineHeight,
                      fontFamily: styleSettings.fontFamily,
                      color: '#1a202c',
                    }}
                  >
                    {/* HEADER */}
                    <div className="mb-8">
                      <h1 className="text-3xl font-bold mb-2" style={{ color: '#1a202c' }}>
                        {letterData.content.contactInfo.name}
                      </h1>
                      <div className="flex flex-wrap gap-4 text-sm" style={{ color: '#4a5568' }}>
                        {letterData.content.contactInfo.email && <span>📧 {letterData.content.contactInfo.email}</span>}
                        {letterData.content.contactInfo.phone && <span>📞 {letterData.content.contactInfo.phone}</span>}
                        {letterData.content.contactInfo.location && <span>📍 {letterData.content.contactInfo.location}</span>}
                      </div>
                    </div>

                    {/* DATE */}
                    <div className="mb-6 text-sm" style={{ color: '#4a5568' }}>
                      {today}
                    </div>

                    {/* BODY - EDITABLE PARAGRAPHS */}
                    <div className="space-y-4">
                      {paragraphs.map((paragraph, index) => (
                        <div key={index} className="relative group">
                          {isEditing && (
                            <div className="absolute -left-12 top-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleParagraphMove(index, 'up')}
                                disabled={index === 0}
                                className="p-1 bg-slate-800 rounded hover:bg-slate-700 disabled:opacity-30"
                                title="Siirrä ylös"
                              >
                                <GripVertical className="w-4 h-4 text-white" />
                              </button>
                              <button
                                onClick={() => handleParagraphAdd(index)}
                                className="p-1 bg-green-600 rounded hover:bg-green-700"
                                title="Lisää kappale"
                              >
                                <Plus className="w-4 h-4 text-white" />
                              </button>
                              <button
                                onClick={() => handleParagraphDelete(index)}
                                className="p-1 bg-red-600 rounded hover:bg-red-700"
                                title="Poista"
                              >
                                <Minus className="w-4 h-4 text-white" />
                              </button>
                            </div>
                          )}
                          
                          {editingParagraph === index ? (
                            <textarea
                              value={paragraph}
                              onChange={(e) => handleParagraphChange(index, e.target.value)}
                              onBlur={() => setEditingParagraph(null)}
                              autoFocus
                              className="w-full p-2 border-2 border-orange-400 rounded bg-orange-50 resize-none"
                              style={{ 
                                minHeight: '100px',
                                fontSize: `${styleSettings.fontSize}pt`,
                                lineHeight: styleSettings.lineHeight,
                                fontFamily: styleSettings.fontFamily,
                              }}
                            />
                          ) : (
                            <p 
                              onClick={() => isEditing && setEditingParagraph(index)}
                              className={isEditing ? 'cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors' : ''}
                              style={{ 
                                marginBottom: `${styleSettings.paragraphSpacing}px`,
                                textAlign: 'justify',
                              }}
                            >
                              {paragraph}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* SIGNATURE */}
                    <div className="mt-12">
                      <p className="text-2xl" style={{ 
                        fontFamily: "'Brush Script MT', cursive",
                        color: styleSettings.accentColor,
                      }}>
                        {letterData.content.contactInfo.name}
                      </p>
                    </div>
                  </div>
               </div>
            </div>
          </div>

        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 8px;
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.05);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.15);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.25);
        }
        .inner-shadow {
          box-shadow: inset 0 0 30px rgba(0,0,0,0.3);
        }
        @keyframes slide-in-right {
          from {
            opacity: 0;
            transform: translateX(100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}