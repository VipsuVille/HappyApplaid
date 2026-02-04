// app/edit-cover-letter/[id]/page.tsx - ✅ WITH ITERATIVE EDITING

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { toast } from 'sonner';
import { 
  Save, ArrowLeft, Trash2, Download, Loader2, 
  Palette, RotateCcw, X, Eye, Settings, 
  AlignLeft, AlignCenter, AlignRight,
  CheckCircle, Clock
} from 'lucide-react';

import IterativeFeedback from '@/components/IterativeFeedback';
import { useTokens } from '@/hooks/useTokens';

interface CoverLetter {
  id: string;
  user_id: string;
  title: string;
  content: any;
  ai_data: any;
  created_at: string;
  updated_at: string;
}

interface StyleSettings {
  headerColor: string;
  headerLayout: 'top' | 'left';
  sidebarContent: 'contact' | 'highlights' | 'none';
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  paragraphSpacing: number;
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  textAlign: 'left' | 'justify' | 'center';
}

export default function EditCoverLetterPage() {
  const params = useParams();
  const router = useRouter();
  const { getToken, userId } = useAuth();
  const { tokens, plan_type } = useTokens();
  const id = params?.id as string;

  const [letterData, setLetterData] = useState<CoverLetter | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [showStylePanel, setShowStylePanel] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [latestChanges, setLatestChanges] = useState('');

  // Inline editing states
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>('');

  // Content fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [content, setContent] = useState('');
  
  const [styleSettings, setStyleSettings] = useState<StyleSettings>({
    headerColor: 'rgb(181, 152, 79)',
    headerLayout: 'top',
    sidebarContent: 'contact',
    fontSize: 11,
    lineHeight: 1.8,
    letterSpacing: 0,
    paragraphSpacing: 16,
    margins: {
      top: 50,
      right: 50,
      bottom: 50,
      left: 50,
    },
    textAlign: 'justify',
  });

  // ✅ ITERATION COST
  const iterationCost = plan_type === 'premium' ? 30 : 50;

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const loadCoverLetter = async () => {
      if (!userId || !id) {
        setIsLoading(false);
        return;
      }

      try {
        const token = await getToken({ template: 'supabase' });
        if (!token) throw new Error('No authentication token');

        const response = await fetch(`/api/cover-letters/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to load cover letter');
        }

        const data = await response.json();
        
        if (data.coverLetter) {
          const letter = data.coverLetter;
          setLetterData(letter);
          
          setName(letter.content?.contactInfo?.name || letter.ai_data?.name || 'Hakija');
          setEmail(letter.content?.contactInfo?.email || letter.ai_data?.email || '');
          setPhone(letter.content?.contactInfo?.phone || letter.ai_data?.phone || '');
          setLocation(letter.content?.contactInfo?.location || letter.ai_data?.location || '');
          setContent(letter.content?.body || letter.ai_data?.html?.content || '');
          
          // Load style settings
          const loadedStyle: StyleSettings = {
            headerColor: letter.content?.headerColor || 'rgb(181, 152, 79)',
            headerLayout: letter.content?.headerLayout || 'top',
            sidebarContent: letter.content?.sidebarContent || 'contact',
            fontSize: letter.content?.fontSize || 11,
            lineHeight: letter.content?.lineHeight || 1.8,
            letterSpacing: letter.content?.letterSpacing || 0,
            paragraphSpacing: letter.content?.paragraphSpacing || 16,
            margins: letter.content?.margins || {
              top: 50,
              right: 50,
              bottom: 50,
              left: 50,
            },
            textAlign: letter.content?.textAlign || 'justify',
          };
          
          setStyleSettings(loadedStyle);
        } else {
          throw new Error('Hakukirjettä ei löytynyt');
        }

      } catch (err) {
        console.error('❌ [LOAD] Error:', err);
        toast.error(
          err instanceof Error ? err.message : 'Hakukirjeen lataaminen epäonnistui'
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadCoverLetter();
  }, [id, userId, getToken]);

  const handleSave = async () => {
    if (!letterData || !userId) return;
    setIsSaving(true);

    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) throw new Error('No authentication token');

      const finalContent = {
        ...letterData.content,
        contactInfo: { name, email, phone, location },
        body: content,
        ...styleSettings,
        job_description: letterData.content?.job_description,
        job_title: letterData.content?.job_title,
        company_name: letterData.content?.company_name,
        language: letterData.content?.language,
        style: letterData.content?.style,
      };

      const response = await fetch(`/api/cover-letters/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: finalContent }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Save failed');
      }

      const result = await response.json();
      if (result.coverLetter) {
        setLetterData(result.coverLetter);
      }
      
      toast.success('✅ Hakukirje tallennettu!');
      setEditingField(null);
      
    } catch (error) {
      console.error('❌ Save error:', error);
      toast.error('Tallennus epäonnistui: ' + (error instanceof Error ? error.message : 'Unknown error'));
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
        body: JSON.stringify({ letterId: id }),
      });

      if (!response.ok) throw new Error('PDF generation failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hakukirje_${letterData?.title || 'document'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('PDF error:', error);
      toast.error('PDF:n luonti epäonnistui');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Haluatko varmasti poistaa tämän hakukirjeen?')) return;
    
    setIsDeleting(true);
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) throw new Error('No authentication token');

      const response = await fetch(`/api/cover-letters/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Delete failed');
      }
      
      router.push('/my-cover-letters');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Poisto epäonnistui');
      setIsDeleting(false);
    }
  };

  // ✅ HANDLE ITERATION SUCCESS
  const handleIterationSuccess = (
    newContent: string, 
    summary: string,
    affectedSections: string[]
  ) => {
    setContent(newContent);
    setLatestChanges(summary);
    setShowSuccess(true);
    
    toast.success('✅ Kirje päivitetty!', {
      description: summary
    });
    
    // Piilota success banner 10s kuluttua
    setTimeout(() => setShowSuccess(false), 10000);
  };

  const startEditing = (field: string, currentValue: string) => {
    setEditingField(field);
    setTempValue(currentValue);
  };

  const cancelEditing = () => {
    setEditingField(null);
    setTempValue('');
  };

  const saveField = (field: string) => {
    switch (field) {
      case 'name':
        setName(tempValue);
        break;
      case 'email':
        setEmail(tempValue);
        break;
      case 'phone':
        setPhone(tempValue);
        break;
      case 'location':
        setLocation(tempValue);
        break;
      case 'content':
        setContent(tempValue);
        break;
    }
    setEditingField(null);
    setTempValue('');
  };

  const handleResetStyles = () => {
    setStyleSettings({
      headerColor: 'rgb(181, 152, 79)',
      headerLayout: 'top',
      sidebarContent: 'contact',
      fontSize: 11,
      lineHeight: 1.8,
      letterSpacing: 0,
      paragraphSpacing: 16,
      margins: {
        top: 50,
        right: 50,
        bottom: 50,
        left: 50,
      },
      textAlign: 'justify',
    });
  };

  if (isLoading || !letterData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:bg-background flex items-center justify-center">
        <div className="bg-white/70 dark:bg-card/70 backdrop-blur-xl border-2 border-white/40 dark:border-border rounded-3xl p-8 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 dark:text-primary mx-auto mb-4" />
          <p className="text-lg font-bold">Ladataan...</p>
        </div>
      </div>
    );
  }

  const paragraphs = content?.split('\n\n').filter(p => p.trim()) || [];
  const today = new Date().toLocaleDateString('fi-FI', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:bg-background">
      
      {/* TOOLBAR */}
      <div className="sticky top-0 z-50 bg-white/90 dark:bg-card/90 backdrop-blur-xl border-b border-gray-200 dark:border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button 
                onClick={() => router.push('/my-cover-letters')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-muted rounded-xl transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              
              <div className="min-w-0">
                <h1 className="text-lg md:text-xl font-bold truncate">
                  Muokkaa hakukirjettä
                </h1>
                <p className="text-sm text-gray-600 dark:text-muted-foreground truncate">
                  {letterData.title}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowStylePanel(!showStylePanel)}
                className={`p-2 md:p-3 rounded-xl transition-colors ${
                  showStylePanel 
                    ? 'bg-indigo-600 dark:bg-primary text-white' 
                    : 'hover:bg-gray-100 dark:hover:bg-muted'
                }`}
                title="Muotoilu"
              >
                <Settings className="w-5 h-5" />
              </button>
              
              <button 
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="p-2 md:p-3 hover:bg-gray-100 dark:hover:bg-muted rounded-xl transition-colors"
              >
                {isDownloading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-600 dark:text-primary" />
                ) : (
                  <Download className="w-5 h-5" />
                )}
              </button>
              
              <button 
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-2 md:p-3 hover:bg-red-50 dark:hover:bg-destructive/20 rounded-xl transition-colors"
              >
                {isDeleting ? (
                  <Loader2 className="w-5 h-5 animate-spin text-red-500" />
                ) : (
                  <Trash2 className="w-5 h-5 text-red-500" />
                )}
              </button>
              
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 md:px-6 py-2 md:py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
                    Tallennetaan...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 inline mr-2" />
                    Tallenna
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        
        {/* ✅ SUCCESS BANNER */}
        {showSuccess && (
          <div className="mb-8 p-6 bg-green-500/10 border-2 border-green-500/30 rounded-3xl animate-in slide-in-from-top-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-400 shrink-0" />
              <div>
                <h4 className="text-lg font-bold text-green-400 mb-1">
                  ✅ Kirje päivitetty onnistuneesti!
                </h4>
                <p className="text-sm text-green-300/70">
                  {latestChanges}
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex gap-6">
          
                  {/* STYLE PANEL */}
          {showStylePanel && (
            <div className="w-80 bg-white dark:bg-card border border-gray-200 dark:border-border rounded-2xl p-6 h-fit sticky top-24 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Palette className="w-5 h-5 text-indigo-600 dark:text-primary" />
                  Muotoilu
                </h3>
                <button
                  onClick={() => setShowStylePanel(false)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-muted rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Header Color */}
                <div>
                  <label className="text-sm font-bold mb-2 block">Header-väri</label>
                  <input
                    type="color"
                    value={styleSettings.headerColor.startsWith('rgb') ? '#B59850' : styleSettings.headerColor}
                    onChange={(e) => setStyleSettings(prev => ({ ...prev, headerColor: e.target.value }))}
                    className="w-full h-12 rounded-lg cursor-pointer border border-gray-300 dark:border-border"
                  />
                </div>

                {/* Header Layout */}
                <div>
                  <label className="text-sm font-bold mb-2 block">Asettelu</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setStyleSettings(prev => ({ ...prev, headerLayout: 'top' }))}
                      className={`p-3 rounded-lg border-2 text-sm font-semibold transition-all ${
                        styleSettings.headerLayout === 'top'
                          ? 'border-indigo-600 dark:border-primary bg-indigo-50 dark:bg-primary/10 text-indigo-600 dark:text-primary'
                          : 'border-gray-300 dark:border-border hover:bg-gray-50 dark:hover:bg-muted'
                      }`}
                    >
                      Yläosa
                    </button>
                    <button
                      onClick={() => setStyleSettings(prev => ({ ...prev, headerLayout: 'left' }))}
                      className={`p-3 rounded-lg border-2 text-sm font-semibold transition-all ${
                        styleSettings.headerLayout === 'left'
                          ? 'border-indigo-600 dark:border-primary bg-indigo-50 dark:bg-primary/10 text-indigo-600 dark:text-primary'
                          : 'border-gray-300 dark:border-border hover:bg-gray-50 dark:hover:bg-muted'
                      }`}
                    >
                      Vasen
                    </button>
                  </div>
                </div>

                {/* Sidebar Content */}
                <div>
                  <label className="text-sm font-bold mb-2 block">Sivupalkki</label>
                  <select
                    value={styleSettings.sidebarContent}
                    onChange={(e) => setStyleSettings(prev => ({ ...prev, sidebarContent: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-white dark:bg-background border border-gray-300 dark:border-border rounded-lg text-sm"
                  >
                    <option value="contact">Yhteystiedot</option>
                    <option value="highlights">Vahvuudet</option>
                    <option value="none">Ei mitään</option>
                  </select>
                </div>

                {/* Font Size */}
                <div>
                  <label className="text-sm font-bold mb-2 block flex justify-between">
                    <span>Fonttikoko</span>
                    <span className="text-indigo-600 dark:text-primary">{styleSettings.fontSize}pt</span>
                  </label>
                  <input
                    type="range"
                    min="9"
                    max="14"
                    step="0.5"
                    value={styleSettings.fontSize}
                    onChange={(e) => setStyleSettings(prev => ({ ...prev, fontSize: parseFloat(e.target.value) }))}
                    className="w-full"
                  />
                </div>

                {/* Line Height */}
                <div>
                  <label className="text-sm font-bold mb-2 block flex justify-between">
                    <span>Riviväli</span>
                    <span className="text-indigo-600 dark:text-primary">{styleSettings.lineHeight}</span>
                  </label>
                  <input
                    type="range"
                    min="1.2"
                    max="2.5"
                    step="0.1"
                    value={styleSettings.lineHeight}
                    onChange={(e) => setStyleSettings(prev => ({ ...prev, lineHeight: parseFloat(e.target.value) }))}
                    className="w-full"
                  />
                </div>

                {/* Letter Spacing */}
                <div>
                  <label className="text-sm font-bold mb-2 block flex justify-between">
                    <span>Kirjainväli</span>
                    <span className="text-indigo-600 dark:text-primary">{styleSettings.letterSpacing}px</span>
                  </label>
                  <input
                    type="range"
                    min="-1"
                    max="3"
                    step="0.1"
                    value={styleSettings.letterSpacing}
                    onChange={(e) => setStyleSettings(prev => ({ ...prev, letterSpacing: parseFloat(e.target.value) }))}
                    className="w-full"
                  />
                </div>

                {/* Paragraph Spacing */}
                <div>
                  <label className="text-sm font-bold mb-2 block flex justify-between">
                    <span>Kappaleväli</span>
                    <span className="text-indigo-600 dark:text-primary">{styleSettings.paragraphSpacing}px</span>
                  </label>
                  <input
                    type="range"
                    min="8"
                    max="32"
                    step="4"
                    value={styleSettings.paragraphSpacing}
                    onChange={(e) => setStyleSettings(prev => ({ ...prev, paragraphSpacing: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                </div>

                {/* Text Alignment */}
                <div>
                  <label className="text-sm font-bold mb-2 block">Tekstin tasaus</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setStyleSettings(prev => ({ ...prev, textAlign: 'left' }))}
                      className={`flex-1 p-2 rounded-lg border-2 transition-all ${
                        styleSettings.textAlign === 'left'
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <AlignLeft className="w-4 h-4 mx-auto" />
                    </button>
                    <button
                      onClick={() => setStyleSettings(prev => ({ ...prev, textAlign: 'center' }))}
                      className={`flex-1 p-2 rounded-lg border-2 transition-all ${
                        styleSettings.textAlign === 'center'
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <AlignCenter className="w-4 h-4 mx-auto" />
                    </button>
                    <button
                      onClick={() => setStyleSettings(prev => ({ ...prev, textAlign: 'justify' }))}
                      className={`flex-1 p-2 rounded-lg border-2 transition-all ${
                        styleSettings.textAlign === 'justify'
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <AlignRight className="w-4 h-4 mx-auto" />
                    </button>
                  </div>
                </div>

                {/* Margins */}
                <div>
                  <label className="text-sm font-bold mb-2 block">Marginaalit (px)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={styleSettings.margins.top}
                      onChange={(e) => setStyleSettings(prev => ({
                        ...prev,
                        margins: { ...prev.margins, top: parseInt(e.target.value) }
                      }))}
                      placeholder="Ylä"
                      className="px-3 py-2 border rounded-lg text-sm"
                    />
                    <input
                      type="number"
                      value={styleSettings.margins.right}
                      onChange={(e) => setStyleSettings(prev => ({
                        ...prev,
                        margins: { ...prev.margins, right: parseInt(e.target.value) }
                      }))}
                      placeholder="Oikea"
                      className="px-3 py-2 border rounded-lg text-sm"
                    />
                    <input
                      type="number"
                      value={styleSettings.margins.bottom}
                      onChange={(e) => setStyleSettings(prev => ({
                        ...prev,
                        margins: { ...prev.margins, bottom: parseInt(e.target.value) }
                      }))}
                      placeholder="Ala"
                      className="px-3 py-2 border rounded-lg text-sm"
                    />
                    <input
                      type="number"
                      value={styleSettings.margins.left}
                      onChange={(e) => setStyleSettings(prev => ({
                        ...prev,
                        margins: { ...prev.margins, left: parseInt(e.target.value) }
                      }))}
                      placeholder="Vasen"
                      className="px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                </div>

                <button
                  onClick={handleResetStyles}
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-muted hover:bg-gray-200 dark:hover:bg-muted/80 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Palauta oletukset
                </button>
              </div>
            </div>
          )}

          {/* PREVIEW & EDIT */}
          <div className="flex-1 space-y-6">
            
            {/* PREVIEW */}
            <div className="bg-white dark:bg-card rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-border">
              <div className="flex items-center justify-center p-6 bg-gray-50 dark:bg-muted/20">
                {/* ... preview content (sama kuin dokumentissa 5) ... */}
              </div>
            </div>

            {/* ✅ ITERATIIVINEN MUOKKAUS */}
            <IterativeFeedback
              coverLetterId={id}
              iterationCost={iterationCost}
              currentTokens={tokens}
              onSuccess={handleIterationSuccess}
            />

            {/* ✅ MUUTOSHISTORIA */}
            {letterData?.ai_data?.iterations?.length > 0 && (
              <div className="bg-gray-900/40 border border-gray-800 rounded-3xl p-8">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-400" />
                  Muutoshistoria
                </h3>
                <div className="space-y-4">
                  {letterData.ai_data.iterations.map((iter: any, i: number) => (
                    <div 
                      key={i}
                      className="p-4 bg-black/20 border border-gray-800 rounded-2xl"
                    >
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <p className="text-sm font-bold text-white">
                          Versio {iter.version}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(iter.timestamp).toLocaleString('fi-FI')}
                        </p>
                      </div>
                      <p className="text-sm text-gray-400 mb-2">
                        💬 <span className="italic">"{iter.user_feedback}"</span>
                      </p>
                      <p className="text-xs text-gray-500">
                        ✅ {iter.changes_made}
                      </p>
                      {iter.affected_sections && (
                        <div className="mt-2 flex gap-2 flex-wrap">
                          {iter.affected_sections.map((section: string) => (
                            <span 
                              key={section}
                              className="px-2 py-1 bg-purple-500/20 border border-purple-500/30 rounded text-[10px] font-bold text-purple-300"
                            >
                              {section}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Info */}
            <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4">
              <p className="text-sm font-bold text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Klikkaa mitä tahansa tekstiä muokataksesi sitä suoraan tai käytä AI-muokkausta!
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateX(100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}