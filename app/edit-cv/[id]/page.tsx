'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { 
  Save, ArrowLeft, Trash2, Download, Loader2, 
  Upload, User, Image as ImageIconLucide, Sparkles, 
  Eye, Edit3, ChevronLeft, ChevronRight, FileText, X, Camera
} from 'lucide-react';
import { fetchCVById, updateCV, deleteCV } from '@/services/cvService-client';
import { getAllAvailableImagesAction, type UserImage } from '@/app/actions/userImages';
import { BaseCV } from '@/types';
import { toast } from 'sonner';

export default function EditCVPage() {
  const params = useParams();
  const router = useRouter();
  const { userId, getToken } = useAuth();
  const id = params?.id as string;

  // --- STATE ---
  const [cvData, setCvData] = useState<BaseCV | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Modal states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showBgModal, setShowBgModal] = useState(false);
  
  const [availableImages, setAvailableImages] = useState<{
    profileImages: UserImage[];
    backgroundImages: UserImage[];
  }>({ profileImages: [], backgroundImages: [] });

  // Carousel states
  const [profileCarouselIndex, setProfileCarouselIndex] = useState(0);
  const [bgCarouselIndex, setBgCarouselIndex] = useState(0);

  // --- DETECT MOBILE ---
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // --- INITIAL LOAD ---
  useEffect(() => {
    const init = async () => {
      if (!userId || !id) return;

      try {
        const token = await getToken({ template: 'supabase' });
        if (!token) throw new Error('No authentication token');

        const { data, error } = await fetchCVById(id, userId, token);
        if (error) throw error;
        
        if (data) {
          const processImageUrl = (url: string | null | undefined): string => {
            if (!url || url.trim() === "") return "";
            const trimmed = url.trim();
            
            if (trimmed.startsWith('data:image') && !trimmed.includes('svg+xml')) {
              return trimmed;
            }
            
            if (trimmed.startsWith('http')) {
              return trimmed;
            }
            
            if (trimmed.includes('/')) {
              const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
              if (!supabaseUrl) return "";
              return `${supabaseUrl}/storage/v1/object/public/cv_files/${trimmed}`;
            }
            
            return "";
          };
          
          const profileImage = processImageUrl(
            data.content?.cv_data?.profileImage || 
            data.content?.ai_data?.profile_image
          );
          
          const backgroundImage = processImageUrl(
            data.content?.cv_data?.backgroundImage || 
            data.content?.ai_data?.background_image
          );
          
          if (data.content) {
            if (!data.content.ai_data) data.content.ai_data = {};
            
            if (profileImage) {
              data.content.cv_data.profileImage = profileImage;
              data.content.ai_data.profile_image = profileImage;
            }
            
            if (backgroundImage) {
              data.content.cv_data.backgroundImage = backgroundImage;
              data.content.ai_data.background_image = backgroundImage;
            }
          }
          
          setCvData(data);
        }

        const images = await getAllAvailableImagesAction();
        setAvailableImages(images);

      } catch (err) {
        console.error('Error initializing CV page:', err);
        toast.error('CV:n lataaminen epäonnistui');
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [id, userId, getToken]);

  // --- HANDLERS ---
  const handleContentChange = useCallback((field: string, value: any) => {
    setCvData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        content: {
          ...prev.content,
          cv_data: {
            ...prev.content.cv_data,
            [field]: value,
          },
        },
      };
    });
  }, []);

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>, 
    type: 'profileImage' | 'backgroundImage'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kuva on liian suuri (max 5MB)');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64data = reader.result as string;
      
      setCvData(prev => {
        if (!prev) return prev;
        
        const updated: any = {
          ...prev,
          [type]: base64data,
          content: {
            ...prev.content,
            cv_data: {
              ...prev.content.cv_data,
              [type]: base64data,
            },
            ai_data: {
              ...prev.content.ai_data,
              [type === 'profileImage' ? 'profile_image' : 'background_image']: base64data,
            }
          },
        };
        
        return updated;
      });
      
      setShowProfileModal(false);
      setShowBgModal(false);
      toast.success('Kuva ladattu!');
    };
    reader.readAsDataURL(file);
  };

  const handleSelectImage = (image: UserImage, type: 'profileImage' | 'backgroundImage') => {
    const imageUrl = image.signedUrl || '';
    
    setCvData(prev => {
      if (!prev) return prev;
      
      const updated: any = {
        ...prev,
        [type]: imageUrl,
        content: {
          ...prev.content,
          cv_data: {
            ...prev.content.cv_data,
            [type]: imageUrl,
          },
          ai_data: {
            ...prev.content.ai_data,
            [type === 'profileImage' ? 'profile_image' : 'background_image']: imageUrl,
          }
        },
      };
      
      return updated;
    });
    
    setShowProfileModal(false);
    setShowBgModal(false);
    toast.success('Kuva valittu!');
  };

  const handleSave = async () => {
    if (!cvData || !userId) return;
    setIsSaving(true);
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) throw new Error('No token');

      await updateCV(id, { content: cvData.content }, token);
      
      toast.success('✅ CV tallennettu!');
      setIsEditing(false);
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Tallennus epäonnistui');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!cvData || !userId) return;
    
    setIsDownloading(true);
    try {
      // Use the same approach as my-cvs page - direct API call without auth header
      const response = await fetch(`/api/cvs/${id}/pdf`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('PDF generation failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CV_${cvData.title || 'dokumentti'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('✅ PDF ladattu!');
    } catch (error) {
      console.error('PDF error:', error);
      toast.error('PDF:n luonti epäonnistui');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Haluatko varmasti poistaa tämän CV:n?')) return;
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token || !userId) throw new Error('No token');
      await deleteCV(id, userId, token);
      toast.success('CV poistettu');
      router.push('/my-cvs');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Poisto epäonnistui');
    }
  };

  // Carousel navigation
  const nextProfileImage = () => {
    setProfileCarouselIndex((prev) => 
      prev === availableImages.profileImages.length - 1 ? 0 : prev + 1
    );
  };

  const prevProfileImage = () => {
    setProfileCarouselIndex((prev) => 
      prev === 0 ? availableImages.profileImages.length - 1 : prev - 1
    );
  };

  const nextBgImage = () => {
    setBgCarouselIndex((prev) => 
      prev === availableImages.backgroundImages.length - 1 ? 0 : prev + 1
    );
  };

  const prevBgImage = () => {
    setBgCarouselIndex((prev) => 
      prev === 0 ? availableImages.backgroundImages.length - 1 : prev - 1
    );
  };

  // --- LOADING STATE ---
  if (isLoading || !cvData) {
    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-[#030711] flex flex-col items-center justify-center">
        <Sparkles className="w-10 h-10 text-orange-500 animate-pulse mb-4" />
        <p className="text-xs font-bold tracking-[0.2em] text-gray-500 uppercase">Ladataan CV:tä...</p>
      </div>
    );
  }

  const currentBg = cvData.content?.cv_data?.backgroundImage || cvData.content?.ai_data?.background_image || '';
  const currentProfile = cvData.content?.cv_data?.profileImage || cvData.content?.ai_data?.profile_image || '';

  // Get all content
  const name = cvData.content?.cv_data?.name || '';
  const email = cvData.content?.cv_data?.email || '';
  const phone = cvData.content?.cv_data?.phone || '';
  const location = cvData.content?.cv_data?.location || '';
  const title = cvData.content?.cv_data?.title || '';

  // --- EDITABLE TEXT COMPONENT ---
  const EditableText = ({ 
    field, 
    value, 
    placeholder = 'Klikkaa muokataksesi',
    multiline = false,
    className = '',
    style = {}
  }: { 
    field: string; 
    value: string; 
    placeholder?: string;
    multiline?: boolean;
    className?: string;
    style?: React.CSSProperties;
  }) => {
    const [isLocalEditing, setIsLocalEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value);

    useEffect(() => {
      setTempValue(value);
    }, [value]);

    const handleSave = () => {
      handleContentChange(field, tempValue);
      setIsLocalEditing(false);
      toast.success('Päivitetty!');
    };

    const handleCancel = () => {
      setTempValue(value);
      setIsLocalEditing(false);
    };

    if (isEditing && isLocalEditing) {
      return (
        <div className="relative inline-block w-full">
          {multiline ? (
            <textarea
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => {
                if (e.key === 'Escape') handleCancel();
                if (e.key === 'Enter' && e.ctrlKey) handleSave();
              }}
              className="w-full px-2 py-1 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-orange-400 rounded outline-none"
              style={style}
              autoFocus
              rows={4}
            />
          ) : (
            <input
              type="text"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => {
                if (e.key === 'Escape') handleCancel();
                if (e.key === 'Enter') handleSave();
              }}
              className="w-full px-2 py-1 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-orange-400 rounded outline-none"
              style={style}
              autoFocus
            />
          )}
          <div className="absolute -top-6 right-0 flex gap-1 text-xs">
            <button
              onClick={handleSave}
              className="px-2 py-0.5 bg-green-500 text-white rounded"
            >
              ✓
            </button>
            <button
              onClick={handleCancel}
              className="px-2 py-0.5 bg-gray-500 text-white rounded"
            >
              ✕
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        onClick={() => isEditing && setIsLocalEditing(true)}
        className={`${className} ${isEditing ? 'cursor-pointer hover:bg-orange-50/30 dark:hover:bg-orange-900/10 transition-colors rounded px-1' : ''}`}
        style={style}
      >
        {value || placeholder}
      </div>
    );
  };

  // --- MAIN RENDER ---
  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#030711] text-gray-900 dark:text-[#e7e3dc] transition-colors duration-500">
      
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 dark:bg-orange-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 dark:bg-emerald-500/5 rounded-full blur-[120px]" />
      </div>

      {/* TOP BAR */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <button 
                onClick={() => router.push('/my-cvs')}
                className="p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shadow-sm flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <FileText className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  <h1 className="text-sm sm:text-lg font-black truncate">
                    {cvData.title || 'Nimetön CV'}
                  </h1>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              {!isEditing ? (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="px-3 sm:px-4 h-9 sm:h-11 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl flex items-center gap-2 shadow-lg transition-all text-xs sm:text-sm font-bold"
                >
                  <Edit3 className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Muokkaa</span>
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="px-3 h-9 sm:h-11 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-xs sm:text-sm font-semibold flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Esikatsele</span>
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-3 sm:px-4 h-9 sm:h-11 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl flex items-center gap-2 shadow-lg disabled:opacity-50 transition-all text-xs sm:text-sm font-bold"
                  >
                    {isSaving ? <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" /> : <Save className="w-3 h-3 sm:w-4 sm:h-4" />}
                    <span className="hidden sm:inline">Tallenna</span>
                  </button>
                </>
              )}
              
              <button 
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="p-2 h-9 sm:h-11 w-9 sm:w-11 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shadow-sm flex items-center justify-center"
              >
                {isDownloading ? <Loader2 className="w-4 h-4 animate-spin text-orange-500" /> : <Download className="w-4 h-4" />}
              </button>
              
              <button 
                onClick={handleDelete} 
                className="p-2 h-9 sm:h-11 w-9 sm:w-11 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all shadow-sm flex items-center justify-center"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        
        {/* Info Banner */}
        {isEditing && (
          <div className="mb-6 p-4 sm:p-6 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-2 border-orange-200 dark:border-orange-800 rounded-2xl">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm sm:text-lg font-bold text-orange-600 dark:text-orange-400 mb-2">
                  💡 Muokkaa CV:tä klikkaamalla
                </h4>
                <ul className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 space-y-1">
                  <li>• <strong>Klikkaa mitä tahansa tekstiä</strong> muokataksesi sitä</li>
                  <li>• <strong>Klikkaa kuvia</strong> vaihtaaksesi profiilikuvan tai taustakuvan</li>
                  <li>• Tallenna <kbd className="px-1 py-0.5 bg-white dark:bg-gray-800 rounded border">Enter</kbd>, peruuta <kbd className="px-1 py-0.5 bg-white dark:bg-gray-800 rounded border">Esc</kbd></li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* CV PREVIEW */}
        <div className="bg-white/80 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-2 sm:p-6 overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar flex justify-center bg-gray-50 dark:bg-black/20 rounded-xl border border-gray-200 dark:border-gray-800">
            <div 
              className="origin-top transition-transform duration-300 bg-white shadow-2xl my-4"
              style={{
                width: '210mm',
                minHeight: '297mm',
                transform: isMobile ? 'scale(0.35)' : window.innerWidth < 1024 ? 'scale(0.6)' : 'scale(0.75)',
                transformOrigin: 'top center',
                fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
              }}
            >
              {/* Google Fonts */}
              <link
                href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@600;700&display=swap"
                rel="stylesheet"
              />

              {/* LEFT COLUMN - DARK */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: "70mm",
                  height: "297mm",
                  background: "linear-gradient(180deg, #1a1a1a 0%, #2d2d2d 100%)",
                  color: "white",
                }}
              >
                {/* PROFILE IMAGE - Clickable */}
                <div 
                  style={{ width: "100%", height: "85mm", overflow: "hidden", position: "relative" }}
                  className={isEditing ? "group cursor-pointer" : ""}
                  onClick={() => isEditing && setShowProfileModal(true)}
                >
                  {currentProfile ? (
                    <>
                      <img
                        src={currentProfile}
                        alt=""
                        className="w-full h-full object-cover"
                        style={{ filter: "contrast(1.05) brightness(0.95)" }}
                      />
                      {isEditing && (
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Camera className="w-12 h-12 text-white" />
                        </div>
                      )}
                    </>
                  ) : (
                    <div 
                      className={`w-full h-full flex items-center justify-center ${isEditing ? 'hover:bg-gray-700' : ''}`}
                      style={{
                        fontSize: "48pt",
                        fontWeight: 300,
                        background: "linear-gradient(135deg, #4a4a4a 0%, #2a2a2a 100%)",
                        fontFamily: "'Inter', sans-serif",
                        letterSpacing: "0.05em"
                      }}
                    >
                      {name.substring(0, 2).toUpperCase() || "??"}
                      {isEditing && (
                        <Camera className="absolute w-12 h-12 text-white/50" />
                      )}
                    </div>
                  )}
                </div>

                {/* SKILLS SECTION */}
                <div style={{ padding: "7mm 8mm" }}>
                  <h2
                    style={{
                      fontSize: "13pt",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.18em",
                      borderBottom: "1.5px solid rgba(255,255,255,0.25)",
                      paddingBottom: "3.5mm",
                      marginBottom: "5mm",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Taidot
                  </h2>
                  
                  <EditableText
                    field="skills"
                    value={cvData.content?.cv_data?.skills || ''}
                    placeholder="Klikkaa lisätäksesi taitoja"
                    multiline
                    style={{
                      fontSize: "8.5pt",
                      lineHeight: 1.65,
                      fontWeight: 300,
                      fontFamily: "'Inter', sans-serif",
                      color: "rgba(255,255,255,0.92)",
                    }}
                  />
                </div>
              </div>

              {/* RIGHT COLUMN - LIGHT */}
              <div
                style={{
                  marginLeft: "70mm",
                  width: "140mm",
                  height: "297mm",
                }}
              >
                {/* HEADER WITH BACKGROUND - Clickable */}
                <div
                  style={{
                    height: "85mm",
                    position: "relative",
                    backgroundImage: currentBg
                      ? `url(${currentBg})`
                      : "linear-gradient(135deg, #2c3e50 0%, #34495e 100%)",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    color: "white",
                  }}
                  className={isEditing ? "group cursor-pointer" : ""}
                  onClick={() => isEditing && setShowBgModal(true)}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "linear-gradient(135deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.35) 100%)",
                    }}
                  />
                  
                  {isEditing && (
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="w-16 h-16 text-white" />
                    </div>
                  )}

                  <div
                    style={{
                      position: "relative",
                      zIndex: 10,
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      padding: "10mm",
                    }}
                  >
                    <EditableText
                      field="name"
                      value={name}
                      placeholder="Nimesi"
                      style={{
                        fontSize: "30pt",
                        fontWeight: 700,
                        marginBottom: "2mm",
                        fontFamily: "'Playfair Display', serif",
                        letterSpacing: "0.02em",
                        textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
                      }}
                    />
                    
                    <EditableText
                      field="title"
                      value={title}
                      placeholder="Ammattinimike"
                      style={{
                        fontSize: "13pt",
                        marginTop: "2mm",
                        marginBottom: "4mm",
                        fontWeight: 400,
                        fontFamily: "'Inter', sans-serif",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        opacity: 0.95,
                      }}
                    />

                    <div
                      style={{
                        marginTop: "4mm",
                        fontSize: "8.5pt",
                        opacity: 0.92,
                        display: "flex",
                        gap: "7mm",
                        flexWrap: "wrap",
                        justifyContent: "center",
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 300,
                      }}
                    >
                      <EditableText
                        field="email"
                        value={email ? `✉ ${email}` : ''}
                        placeholder="✉ sähköposti"
                      />
                      <EditableText
                        field="phone"
                        value={phone ? `☎ ${phone}` : ''}
                        placeholder="☎ puhelin"
                      />
                      <EditableText
                        field="location"
                        value={location ? `⚲ ${location}` : ''}
                        placeholder="⚲ sijainti"
                      />
                    </div>
                  </div>
                </div>

                {/* CONTENT AREA */}
                <div style={{ 
                  padding: "9mm 10mm", 
                  fontSize: "9.5pt", 
                  lineHeight: 1.55,
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 300,
                }}>
                  
                  {/* WORK EXPERIENCE */}
                  <section style={{ marginBottom: "7mm" }}>
                    <h2
                      style={{
                        fontSize: "11.5pt",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        borderBottom: "2px solid #1a1a1a",
                        paddingBottom: "2mm",
                        marginBottom: "4mm",
                        letterSpacing: "0.12em",
                        fontFamily: "'Inter', sans-serif",
                        color: "#1a1a1a",
                      }}
                    >
                      Työkokemus
                    </h2>
                    
                    <EditableText
                      field="workExperience"
                      value={cvData.content?.cv_data?.workExperience || ''}
                      placeholder="Klikkaa lisätäksesi työkokemusta"
                      multiline
                      style={{
                        fontSize: "9pt",
                        lineHeight: 1.6,
                        fontWeight: 300,
                      }}
                    />
                  </section>

                  {/* EDUCATION */}
                  <section style={{ marginBottom: "7mm" }}>
                    <h2
                      style={{
                        fontSize: "11.5pt",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        borderBottom: "2px solid #1a1a1a",
                        paddingBottom: "2mm",
                        marginBottom: "4mm",
                        letterSpacing: "0.12em",
                        fontFamily: "'Inter', sans-serif",
                        color: "#1a1a1a",
                      }}
                    >
                      Koulutus
                    </h2>
                    
                    <EditableText
                      field="education"
                      value={cvData.content?.cv_data?.education || ''}
                      placeholder="Klikkaa lisätäksesi koulutusta"
                      multiline
                      style={{
                        fontSize: "8.5pt",
                        lineHeight: 1.6,
                        fontWeight: 300,
                      }}
                    />
                  </section>

                  {/* LANGUAGES */}
                  <section>
                    <h2
                      style={{
                        fontSize: "11.5pt",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        borderBottom: "2px solid #1a1a1a",
                        paddingBottom: "2mm",
                        marginBottom: "4mm",
                        letterSpacing: "0.12em",
                        fontFamily: "'Inter', sans-serif",
                        color: "#1a1a1a",
                      }}
                    >
                      Kielet
                    </h2>
                    
                    <EditableText
                      field="languages"
                      value={cvData.content?.cv_data?.languages || ''}
                      placeholder="Klikkaa lisätäksesi kieliä"
                      multiline
                      style={{
                        fontSize: "9.5pt",
                        lineHeight: 1.6,
                        color: "#333",
                        fontWeight: 300,
                      }}
                    />
                  </section>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PROFILE IMAGE MODAL */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <User className="w-6 h-6 text-orange-500" />
                Valitse profiilikuva
              </h3>
              <button
                onClick={() => setShowProfileModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Upload */}
              <label className="cursor-pointer w-full flex items-center justify-center gap-2 px-6 py-4 bg-orange-500/10 hover:bg-orange-500/20 border-2 border-dashed border-orange-500/30 text-orange-600 dark:text-orange-400 rounded-xl text-sm font-bold transition-colors mb-6">
                <Upload className="w-5 h-5" />
                Lataa uusi kuva
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'profileImage')} />
              </label>

              {/* Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                {availableImages.profileImages.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => handleSelectImage(img, 'profileImage')}
                    className={`aspect-square rounded-xl overflow-hidden border-2 transition-all relative ${
                      currentProfile === img.signedUrl 
                        ? 'border-orange-500 ring-4 ring-orange-500/30 scale-95' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-orange-300 hover:scale-105'
                    }`}
                  >
                    <img src={img.signedUrl} alt="" className="w-full h-full object-cover" />
                    {img.is_ai_generated && (
                      <div className="absolute bottom-1 right-1 bg-purple-500 rounded-lg p-1">
                        <Sparkles className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BACKGROUND IMAGE MODAL */}
      {showBgModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <ImageIconLucide className="w-6 h-6 text-amber-500" />
                Valitse taustakuva
              </h3>
              <button
                onClick={() => setShowBgModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Upload */}
              <label className="cursor-pointer w-full flex items-center justify-center gap-2 px-6 py-4 bg-amber-500/10 hover:bg-amber-500/20 border-2 border-dashed border-amber-500/30 text-amber-600 dark:text-amber-400 rounded-xl text-sm font-bold transition-colors mb-6">
                <Upload className="w-5 h-5" />
                Lataa uusi taustakuva
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'backgroundImage')} />
              </label>

              {/* Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {availableImages.backgroundImages.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => handleSelectImage(img, 'backgroundImage')}
                    className={`aspect-video rounded-xl overflow-hidden border-2 transition-all relative ${
                      currentBg === img.signedUrl 
                        ? 'border-amber-500 ring-4 ring-amber-500/30 scale-95' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-amber-300 hover:scale-105'
                    }`}
                  >
                    <img src={img.signedUrl} alt="" className="w-full h-full object-cover" />
                    {img.is_ai_generated && (
                      <div className="absolute top-2 right-2 bg-purple-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        AI
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 8px;
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(156, 163, 175, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(156, 163, 175, 0.3);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(156, 163, 175, 0.5);
        }
      `}</style>
    </div>
  );
}