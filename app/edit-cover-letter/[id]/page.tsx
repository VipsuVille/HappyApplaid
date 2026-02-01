// app/edit-cover-letter/[id]/page.tsx - ✅ FULL VERSION
// Sama template kuin my-cover-letters + kaikki muokkausominaisuudet

'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { 
  Save, ArrowLeft, Trash2, Download, Loader2, 
  Type, Edit3, RotateCcw, X, Eye, Palette
} from 'lucide-react';

// ✅ SAMA TEMPLATE KUIN MY-COVER-LETTERS
import CoverLetterContainer from '@/components/cover-letter/CoverLetterContainer';
import CoverLetterTemplate from '@/components/cover-letter/CoverLetterTemplate';

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
}

export default function EditCoverLetterPage() {
  const params = useParams();
  const router = useRouter();
  const { getToken, userId } = useAuth();
  const id = params?.id as string;

  const [letterData, setLetterData] = useState<CoverLetter | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [showStylePanel, setShowStylePanel] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Edited fields
  const [editedName, setEditedName] = useState('');
  const [editedEmail, setEditedEmail] = useState('');
  const [editedPhone, setEditedPhone] = useState('');
  const [editedLocation, setEditedLocation] = useState('');
  const [editedContent, setEditedContent] = useState('');
  
  // Original values (for cancel)
  const [originalName, setOriginalName] = useState('');
  const [originalEmail, setOriginalEmail] = useState('');
  const [originalPhone, setOriginalPhone] = useState('');
  const [originalLocation, setOriginalLocation] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  
  const [styleSettings, setStyleSettings] = useState<StyleSettings>({
    headerColor: 'rgb(181, 152, 79)',
    headerLayout: 'top',
    sidebarContent: 'contact',
  });
  
  const [originalStyleSettings, setOriginalStyleSettings] = useState<StyleSettings>({
    headerColor: 'rgb(181, 152, 79)',
    headerLayout: 'top',
    sidebarContent: 'contact',
  });

  // ═══════════════════════════════════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════════════════════════════════

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
          
          // ✅ SAMA DATA EXTRACTION KUIN MY-COVER-LETTERS
          const name = letter.content?.contactInfo?.name || 
                       letter.ai_data?.name || 
                       letter.content?.name || 
                       'Hakija';
          
          const email = letter.content?.contactInfo?.email || 
                        letter.ai_data?.email || 
                        '';
          
          const phone = letter.content?.contactInfo?.phone || 
                        letter.ai_data?.phone || 
                        '';
          
          const location = letter.content?.contactInfo?.location || 
                           letter.ai_data?.location || 
                           '';
          
          const content = letter.content?.body || 
                         letter.ai_data?.html?.content || 
                         '';
          
          // Set edited values
          setEditedName(name);
          setEditedEmail(email);
          setEditedPhone(phone);
          setEditedLocation(location);
          setEditedContent(content);
          
          // Set originals (for cancel)
          setOriginalName(name);
          setOriginalEmail(email);
          setOriginalPhone(phone);
          setOriginalLocation(location);
          setOriginalContent(content);
          
          // Load style settings
          const loadedStyle: StyleSettings = {
            headerColor: letter.content?.headerColor || 'rgb(181, 152, 79)',
            headerLayout: letter.content?.headerLayout || 'top',
            sidebarContent: letter.content?.sidebarContent || 'contact',
          };
          
          setStyleSettings(loadedStyle);
          setOriginalStyleSettings(loadedStyle);
          
        } else {
          throw new Error('Hakukirjettä ei löytynyt');
        }

      } catch (err) {
        console.error('❌ [LOAD] Error:', err);
        setErrorMessage(
          err instanceof Error ? err.message : 'Hakukirjeen lataaminen epäonnistui'
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadCoverLetter();
  }, [id, userId, getToken]);

  // ═══════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════

  const handleSave = async () => {
    if (!letterData || !userId) return;
    setIsSaving(true);

    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) throw new Error('No authentication token');

      // ✅ TALLENNA KAIKKI: content + style
      const finalContent = {
        ...letterData.content,
        contactInfo: {
          name: editedName,
          email: editedEmail,
          phone: editedPhone,
          location: editedLocation,
        },
        body: editedContent,
        
        // Style settings
        headerColor: styleSettings.headerColor,
        headerLayout: styleSettings.headerLayout,
        sidebarContent: styleSettings.sidebarContent,
        
        // Preserve other fields
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
        body: JSON.stringify({
          content: finalContent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Save failed');
      }

      const result = await response.json();
      if (result.coverLetter) {
        setLetterData(result.coverLetter);
      }
      
      // Update originals
      setOriginalName(editedName);
      setOriginalEmail(editedEmail);
      setOriginalPhone(editedPhone);
      setOriginalLocation(editedLocation);
      setOriginalContent(editedContent);
      setOriginalStyleSettings(styleSettings);
      
      setSuccessMessage('✅ Hakukirje tallennettu!');
      setTimeout(() => setSuccessMessage(null), 3000);
      setIsEditMode(false);
      setShowStylePanel(false);
      
    } catch (error) {
      console.error('❌ Save error:', error);
      setErrorMessage('Tallennus epäonnistui: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (confirm('Hylätäänkö tallentamattomat muutokset?')) {
      // Restore originals
      setEditedName(originalName);
      setEditedEmail(originalEmail);
      setEditedPhone(originalPhone);
      setEditedLocation(originalLocation);
      setEditedContent(originalContent);
      setStyleSettings(originalStyleSettings);
      
      setIsEditMode(false);
      setShowStylePanel(false);
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
      alert('PDF:n luonti epäonnistui');
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
      alert('Poisto epäonnistui');
      setIsDeleting(false);
    }
  };

  const handleResetStyles = () => {
    setStyleSettings({
      headerColor: 'rgb(181, 152, 79)',
      headerLayout: 'top',
      sidebarContent: 'contact',
    });
  };

  // ═══════════════════════════════════════════════════════════════
  // DATA CONVERSION (sama kuin my-cover-letters)
  // ═══════════════════════════════════════════════════════════════

  function convertToCoverLetterData() {
    if (!letterData) return null;
    
    return {
      name: editedName,
      email: editedEmail,
      phone: editedPhone,
      location: editedLocation,
      
      jobTitle: letterData.content?.job_title || letterData.ai_data?.job_title || '',
      companyName: letterData.content?.company_name || letterData.ai_data?.company_name || '',
      
      title: letterData.title,
      content: editedContent,
      
      keyHighlights: letterData.ai_data?.key_highlights || [],
      language: letterData.content?.language || 'finnish',
      style: (letterData.content?.style || letterData.ai_data?.style || 'professional') as 'professional' | 'casual' | 'creative',
      
      headerColor: styleSettings.headerColor,
      headerLayout: styleSettings.headerLayout,
      sidebarContent: styleSettings.sidebarContent,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  if (isLoading || !letterData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="backdrop-blur-xl bg-card border border-border rounded-2xl p-8 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg font-bold">{errorMessage || 'Ladataan...'}</p>
          {errorMessage && (
            <button
              onClick={() => router.push('/my-cover-letters')}
              className="mt-4 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold"
            >
              ← Takaisin
            </button>
          )}
        </div>
      </div>
    );
  }

  const coverLetterData = convertToCoverLetterData();
  if (!coverLetterData) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      
      {/* ═══════════════════════════════════════════════════════════════
          TOOLBAR (sticky top)
          ═══════════════════════════════════════════════════════════════ */}
      <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            
            {/* Left: Back + Title */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button 
                onClick={() => router.push('/my-cover-letters')}
                className="p-2 hover:bg-muted rounded-xl transition-colors flex-shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              
              <div className="min-w-0">
                <h1 className="text-lg md:text-xl font-bold truncate">
                  {isEditMode ? 'Muokkaa hakukirjettä' : 'Esikatsele'}
                </h1>
                <p className="text-sm text-muted-foreground truncate">{letterData.title}</p>
              </div>
            </div>
            
            {/* Right: Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {!isEditMode ? (
                <>
                  <button 
                    onClick={handleDownloadPDF}
                    disabled={isDownloading}
                    className="p-2 md:p-3 hover:bg-muted rounded-xl transition-colors"
                    title="Lataa PDF"
                  >
                    {isDownloading ? (
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    ) : (
                      <Download className="w-5 h-5" />
                    )}
                  </button>
                  
                  <button 
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="p-2 md:p-3 hover:bg-destructive/20 rounded-xl transition-colors"
                    title="Poista"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-5 h-5 animate-spin text-destructive" />
                    ) : (
                      <Trash2 className="w-5 h-5 text-destructive" />
                    )}
                  </button>
                  
                  <button 
                    onClick={() => {
                      setIsEditMode(true);
                      if (!isMobile) setShowStylePanel(true);
                    }}
                    className="px-4 py-2 md:py-3 bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-xl font-bold"
                  >
                    <Edit3 className="w-4 h-4 inline mr-2" />
                    <span className="hidden sm:inline">Muokkaa</span>
                  </button>
                </>
              ) : (
                <>
                  {!isMobile && (
                    <button
                      onClick={() => setShowStylePanel(!showStylePanel)}
                      className={`p-2 md:p-3 rounded-xl transition-colors ${
                        showStylePanel 
                          ? 'bg-primary text-primary-foreground' 
                          : 'hover:bg-muted'
                      }`}
                      title="Muotoilu"
                    >
                      <Palette className="w-5 h-5" />
                    </button>
                  )}
                  
                  <button 
                    onClick={handleCancelEdit}
                    className="px-3 md:px-4 py-2 md:py-3 hover:bg-muted rounded-xl font-semibold"
                  >
                    <X className="w-4 h-4 inline mr-2" />
                    <span className="hidden sm:inline">Peruuta</span>
                  </button>
                  
                  <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-4 md:px-6 py-2 md:py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
                        <span className="hidden sm:inline">Tallennetaan...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 inline mr-2" />
                        <span className="hidden sm:inline">Tallenna</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          NOTIFICATIONS
          ═══════════════════════════════════════════════════════════════ */}
      {successMessage && (
        <div className="fixed top-20 right-4 z-50 bg-green-500/20 border border-green-500/50 rounded-xl p-4 shadow-xl animate-slide-in">
          <p className="text-green-100 font-bold text-sm md:text-base">{successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="fixed top-20 right-4 z-50 bg-red-500/20 border border-red-500/50 rounded-xl p-4 shadow-xl animate-slide-in">
          <p className="text-red-100 font-bold text-sm md:text-base">{errorMessage}</p>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MAIN CONTENT
          ═══════════════════════════════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        
        {/* MOBILE EDIT MODE - FORM FIELDS */}
        {isMobile && isEditMode ? (
          <div className="space-y-4">
            <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 text-center">
              <Eye className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="font-bold text-sm">Muokkaustila (mobiili)</p>
              <p className="text-xs text-muted-foreground mt-1">
                Esikatselu näkyy tallennuksen jälkeen
              </p>
            </div>

            <div className="space-y-4 bg-card border border-border rounded-xl p-4">
              <div>
                <label className="block text-sm font-bold mb-2">Nimi</label>
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">Sähköposti</label>
                <input
                  type="email"
                  value={editedEmail}
                  onChange={(e) => setEditedEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">Puhelin</label>
                <input
                  type="tel"
                  value={editedPhone}
                  onChange={(e) => setEditedPhone(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">Sijainti (valinnainen)</label>
                <input
                  type="text"
                  value={editedLocation}
                  onChange={(e) => setEditedLocation(e.target.value)}
                  placeholder="Esim. Helsinki, Suomi"
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">Sisältö</label>
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  rows={20}
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-primary resize-none text-sm font-serif"
                  style={{ lineHeight: '1.8' }}
                />
              </div>

              {/* Mobile Style Settings */}
              <div className="pt-4 border-t border-border">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Ulkoasu
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold mb-1 block">Header-väri</label>
                    <input
                      type="color"
                      value={styleSettings.headerColor.startsWith('rgb') ? '#B59850' : styleSettings.headerColor}
                      onChange={(e) => setStyleSettings(prev => ({ ...prev, headerColor: e.target.value }))}
                      className="w-full h-10 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold mb-1 block">Asettelu</label>
                    <select
                      value={styleSettings.headerLayout}
                      onChange={(e) => setStyleSettings(prev => ({ ...prev, headerLayout: e.target.value as any }))}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                    >
                      <option value="top">Yläosa</option>
                      <option value="left">Vasen sivupalkki</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold mb-1 block">Sivupalkki</label>
                    <select
                      value={styleSettings.sidebarContent}
                      onChange={(e) => setStyleSettings(prev => ({ ...prev, sidebarContent: e.target.value as any }))}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                    >
                      <option value="contact">Yhteystiedot</option>
                      <option value="highlights">Vahvuudet</option>
                      <option value="none">Ei mitään</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* DESKTOP OR PREVIEW MODE */
          <div className="flex gap-6">
            
            {/* STYLE PANEL (desktop edit mode only) */}
            {isEditMode && showStylePanel && !isMobile && (
              <div className="w-80 bg-card border border-border rounded-xl p-6 h-fit sticky top-24">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Palette className="w-5 h-5 text-primary" />
                    Muotoilu
                  </h3>
                  <button
                    onClick={() => setShowStylePanel(false)}
                    className="p-1 hover:bg-muted rounded transition-colors"
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
                      className="w-full h-12 rounded-lg cursor-pointer border border-border"
                    />
                  </div>

                  {/* Header Layout */}
                  <div>
                    <label className="text-sm font-bold mb-2 block">Header-asettelu</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setStyleSettings(prev => ({ ...prev, headerLayout: 'top' }))}
                        className={`p-3 rounded-lg border-2 text-sm font-semibold transition-all ${
                          styleSettings.headerLayout === 'top'
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:bg-muted'
                        }`}
                      >
                        Yläosa
                      </button>
                      <button
                        onClick={() => setStyleSettings(prev => ({ ...prev, headerLayout: 'left' }))}
                        className={`p-3 rounded-lg border-2 text-sm font-semibold transition-all ${
                          styleSettings.headerLayout === 'left'
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:bg-muted'
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
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                    >
                      <option value="contact">Yhteystiedot</option>
                      <option value="highlights">Vahvuudet</option>
                      <option value="none">Ei mitään</option>
                    </select>
                  </div>

                  {/* Reset Button */}
                  <button
                    onClick={handleResetStyles}
                    className="w-full px-4 py-2 bg-muted hover:bg-muted/80 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Palauta oletukset
                  </button>
                </div>

                {/* Edit Fields (desktop) */}
                {isEditMode && (
                  <div className="mt-6 pt-6 border-t border-border space-y-4">
                    <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                      <Type className="w-4 h-4" />
                      Muokkaa tekstiä
                    </h3>

                    <div>
                      <label className="text-xs font-bold mb-1 block text-muted-foreground">Nimi</label>
                      <input
                        type="text"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold mb-1 block text-muted-foreground">Sähköposti</label>
                      <input
                        type="email"
                        value={editedEmail}
                        onChange={(e) => setEditedEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold mb-1 block text-muted-foreground">Puhelin</label>
                      <input
                        type="tel"
                        value={editedPhone}
                        onChange={(e) => setEditedPhone(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold mb-1 block text-muted-foreground">Sijainti</label>
                      <input
                        type="text"
                        value={editedLocation}
                        onChange={(e) => setEditedLocation(e.target.value)}
                        placeholder="Helsinki"
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold mb-1 block text-muted-foreground">Sisältö</label>
                      <textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        rows={12}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm resize-none font-serif"
                        style={{ lineHeight: '1.6' }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PREVIEW - USES SAME TEMPLATE! */}
            <div className="flex-1">
              {isEditMode && !isMobile && (
                <div className="mb-4 bg-primary/10 border border-primary/30 rounded-xl p-3">
                  <p className="text-sm font-bold text-primary">
                    💡 Muokkaa kenttiä vasemmalla - esikatselu päivittyy reaaliaikaisesti
                  </p>
                </div>
              )}
              
              <div className="bg-muted/20 rounded-2xl overflow-hidden border border-border">
                {/* ✅ SAMA SKAALAUS KUIN MY-COVER-LETTERS (large = 0.95) */}
                <div className="flex items-center justify-center p-6">
                  <div
                    className="origin-center transition-transform duration-200"
                    style={{ 
                      transform: isMobile ? 'scale(0.35)' : 'scale(0.75)',
                      transformOrigin: isMobile ? 'top center' : 'center'
                    }}
                  >
                    <CoverLetterContainer className="bg-white shadow-2xl">
                      <CoverLetterTemplate
                        data={coverLetterData}
                        isPdfPreview={false}
                        isEditing={false}
                      />
                    </CoverLetterContainer>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
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