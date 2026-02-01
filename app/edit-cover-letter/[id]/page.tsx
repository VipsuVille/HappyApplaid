// app/edit-cover-letter/[id]/page.tsx - ✅ INLINE EDITING + NIMIKIRJOITUS
// Klikkaa tekstiä muokataksesi sitä!

'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { 
  Save, ArrowLeft, Trash2, Download, Loader2, 
  Type, Edit3, RotateCcw, X, Eye, Palette
} from 'lucide-react';

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
  const [editedSignature, setEditedSignature] = useState(''); // ✅ UUSI
  
  // Original values
  const [originalName, setOriginalName] = useState('');
  const [originalEmail, setOriginalEmail] = useState('');
  const [originalPhone, setOriginalPhone] = useState('');
  const [originalLocation, setOriginalLocation] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [originalSignature, setOriginalSignature] = useState(''); // ✅ UUSI
  
  // ✅ INLINE EDITING STATES
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [isEditingSignature, setIsEditingSignature] = useState(false);
  
  const nameInputRef = useRef<HTMLInputElement>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  
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

  // ✅ AUTO-FOCUS when editing starts
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  useEffect(() => {
    if (isEditingContent && contentTextareaRef.current) {
      contentTextareaRef.current.focus();
    }
  }, [isEditingContent]);

  useEffect(() => {
    if (isEditingSignature && signatureInputRef.current) {
      signatureInputRef.current.focus();
      signatureInputRef.current.select();
    }
  }, [isEditingSignature]);

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
          
          const signature = letter.content?.signature || name; // ✅ SIGNATURE fallback to name
          
          setEditedName(name);
          setEditedEmail(email);
          setEditedPhone(phone);
          setEditedLocation(location);
          setEditedContent(content);
          setEditedSignature(signature);
          
          setOriginalName(name);
          setOriginalEmail(email);
          setOriginalPhone(phone);
          setOriginalLocation(location);
          setOriginalContent(content);
          setOriginalSignature(signature);
          
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

  const handleSave = async () => {
    if (!letterData || !userId) return;
    setIsSaving(true);

    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) throw new Error('No authentication token');

      const finalContent = {
        ...letterData.content,
        contactInfo: {
          name: editedName,
          email: editedEmail,
          phone: editedPhone,
          location: editedLocation,
        },
        body: editedContent,
        signature: editedSignature, // ✅ TALLENNA NIMIKIRJOITUS
        
        headerColor: styleSettings.headerColor,
        headerLayout: styleSettings.headerLayout,
        sidebarContent: styleSettings.sidebarContent,
        
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
      
      setOriginalName(editedName);
      setOriginalEmail(editedEmail);
      setOriginalPhone(editedPhone);
      setOriginalLocation(editedLocation);
      setOriginalContent(editedContent);
      setOriginalSignature(editedSignature);
      setOriginalStyleSettings(styleSettings);
      
      setSuccessMessage('✅ Hakukirje tallennettu!');
      setTimeout(() => setSuccessMessage(null), 3000);
      setIsEditMode(false);
      setShowStylePanel(false);
      setIsEditingName(false);
      setIsEditingContent(false);
      setIsEditingSignature(false);
      
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
      setEditedName(originalName);
      setEditedEmail(originalEmail);
      setEditedPhone(originalPhone);
      setEditedLocation(originalLocation);
      setEditedContent(originalContent);
      setEditedSignature(originalSignature);
      setStyleSettings(originalStyleSettings);
      
      setIsEditMode(false);
      setShowStylePanel(false);
      setIsEditingName(false);
      setIsEditingContent(false);
      setIsEditingSignature(false);
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

  const today = new Date().toLocaleDateString('fi-FI', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      
      {/* TOOLBAR */}
      <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            
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

      {/* NOTIFICATIONS */}
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

      <div className="max-w-7xl mx-auto px-4 py-6">
        
        {/* MOBILE EDIT MODE */}
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
                <label className="block text-sm font-bold mb-2">Sijainti</label>
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

              <div>
                <label className="block text-sm font-bold mb-2">Nimikirjoitus</label>
                <input
                  type="text"
                  value={editedSignature}
                  onChange={(e) => setEditedSignature(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                />
              </div>

              {/* Mobile Styles */}
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
          /* DESKTOP OR PREVIEW */
          <div className="flex gap-6">
            
            {/* STYLE PANEL */}
            {isEditMode && showStylePanel && !isMobile && (
              <div className="w-80 bg-card border border-border rounded-xl p-6 h-fit sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto">
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
                  <div>
                    <label className="text-sm font-bold mb-2 block">Header-väri</label>
                    <input
                      type="color"
                      value={styleSettings.headerColor.startsWith('rgb') ? '#B59850' : styleSettings.headerColor}
                      onChange={(e) => setStyleSettings(prev => ({ ...prev, headerColor: e.target.value }))}
                      className="w-full h-12 rounded-lg cursor-pointer border border-border"
                    />
                  </div>

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

                  <button
                    onClick={handleResetStyles}
                    className="w-full px-4 py-2 bg-muted hover:bg-muted/80 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Palauta oletukset
                  </button>
                </div>
              </div>
            )}

            {/* ✅ PREVIEW WITH INLINE EDITING */}
            <div className="flex-1">
              {isEditMode && !isMobile && (
                <div className="mb-4 bg-primary/10 border border-primary/30 rounded-xl p-3">
                  <p className="text-sm font-bold text-primary">
                    💡 <strong>Klikkaa tekstiä muokataksesi sitä suoraan!</strong> (Nimi, sisältö, nimikirjoitus)
                  </p>
                </div>
              )}
              
              <div className="bg-muted/20 rounded-2xl overflow-hidden border border-border">
                <div className="flex items-center justify-center p-6">
                  <div
                    className="origin-center transition-transform duration-200"
                    style={{ 
                      transform: isMobile ? 'scale(0.35)' : 'scale(0.75)',
                      transformOrigin: isMobile ? 'top center' : 'center'
                    }}
                  >
                    <CoverLetterContainer className="bg-white shadow-2xl">
                      {/* ✅ INLINE EDITABLE WRAPPER */}
                      <div 
                        className="relative"
                        style={{
                          width: '210mm',
                          minHeight: '297mm',
                          fontFamily: "'Merriweather', serif",
                          color: '#1a202c',
                        }}
                      >
                        {/* HEADER */}
                        <div 
                          className="mb-8 p-6 rounded-lg"
                          style={{ backgroundColor: styleSettings.headerColor }}
                        >
                          {/* ✅ INLINE EDITABLE NAME */}
                          {isEditMode && !isMobile && isEditingName ? (
                            <input
                              ref={nameInputRef}
                              type="text"
                              value={editedName}
                              onChange={(e) => setEditedName(e.target.value)}
                              onBlur={() => setIsEditingName(false)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') setIsEditingName(false);
                                if (e.key === 'Escape') {
                                  setEditedName(originalName);
                                  setIsEditingName(false);
                                }
                              }}
                              className="w-full bg-white/80 border-2 border-blue-500 rounded px-3 py-2 font-bold outline-none text-gray-900"
                              style={{ fontSize: '48px' }}
                            />
                          ) : (
                            <h1
                              onClick={() => isEditMode && !isMobile && setIsEditingName(true)}
                              className={isEditMode && !isMobile ? 'cursor-pointer hover:bg-white/20 rounded px-3 py-2 transition-colors' : ''}
                              style={{ fontSize: '48px', fontWeight: 'bold', color: '#2C3E50' }}
                            >
                              {editedName}
                            </h1>
                          )}
                          
                          <div className="flex flex-wrap gap-4 text-sm mt-2" style={{ color: '#5A6C7D' }}>
                            {editedEmail && <span>📧 {editedEmail}</span>}
                            {editedPhone && <span>📞 {editedPhone}</span>}
                            {editedLocation && <span>📍 {editedLocation}</span>}
                          </div>
                        </div>

                        {/* DATE */}
                        <div className="mb-6 px-6 text-sm" style={{ color: '#5A6C7D' }}>
                          {today}
                        </div>

                        {/* ✅ INLINE EDITABLE CONTENT */}
                        <div className="px-6">
                          {isEditMode && !isMobile && isEditingContent ? (
                            <textarea
                              ref={contentTextareaRef}
                              value={editedContent}
                              onChange={(e) => setEditedContent(e.target.value)}
                              onBlur={() => setIsEditingContent(false)}
                              className="w-full min-h-[500px] p-4 bg-blue-50/50 border-2 border-blue-500 rounded resize-none outline-none font-serif"
                              style={{
                                fontSize: '11pt',
                                lineHeight: '1.8',
                              }}
                            />
                          ) : (
                            <div
                              onClick={() => isEditMode && !isMobile && setIsEditingContent(true)}
                              className={isEditMode && !isMobile ? 'cursor-pointer hover:bg-blue-50/30 p-4 rounded transition-colors min-h-[400px]' : 'min-h-[400px]'}
                              style={{
                                fontSize: '11pt',
                                lineHeight: '1.8',
                                whiteSpace: 'pre-wrap',
                              }}
                            >
                              {editedContent.split('\n\n').map((paragraph, index) => (
                                <p key={index} className="mb-4" style={{ textAlign: 'justify' }}>
                                  {paragraph}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* ✅ INLINE EDITABLE SIGNATURE */}
                        <div className="mt-12 px-6">
                          <p className="text-sm mb-2" style={{ fontStyle: 'italic', color: '#5A6C7D' }}>
                            Ystävällisin terveisin,
                          </p>
                          
                          {isEditMode && !isMobile && isEditingSignature ? (
                            <input
                              ref={signatureInputRef}
                              type="text"
                              value={editedSignature}
                              onChange={(e) => setEditedSignature(e.target.value)}
                              onBlur={() => setIsEditingSignature(false)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') setIsEditingSignature(false);
                                if (e.key === 'Escape') {
                                  setEditedSignature(originalSignature);
                                  setIsEditingSignature(false);
                                }
                              }}
                              className="w-full bg-blue-50/50 border-2 border-blue-500 rounded px-3 py-2 outline-none"
                              style={{ 
                                fontSize: '24px',
                                fontFamily: "'Brush Script MT', cursive",
                                color: '#3b82f6',
                              }}
                            />
                          ) : (
                            <p 
                              onClick={() => isEditMode && !isMobile && setIsEditingSignature(true)}
                              className={isEditMode && !isMobile ? 'cursor-pointer hover:bg-blue-50/30 inline-block px-3 py-1 rounded transition-colors' : ''}
                              style={{ 
                                fontSize: '24px',
                                fontFamily: "'Brush Script MT', cursive",
                                color: '#3b82f6',
                              }}
                            >
                              {editedSignature}
                            </p>
                          )}
                        </div>
                      </div>
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