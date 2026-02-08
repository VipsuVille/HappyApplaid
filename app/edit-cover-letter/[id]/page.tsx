'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { 
  Save, ArrowLeft, Trash2, Download, Loader2, 
  Upload, User, Image as ImageIconLucide, Sparkles, 
  Eye, Edit3, ChevronLeft, ChevronRight, FileText, X
} from 'lucide-react';
import { fetchCVById, updateCV, deleteCV } from '@/services/cvService-client';
import { getAllAvailableImagesAction, type UserImage } from '@/app/actions/userImages';
import { BaseCV, CVTemplateProps } from '@/types';
import SimpleCVTemplate from '@/components/cv/CVSimpleTemplate';
import TechnicalCVTemplate from '@/components/cv/CVTemplateTechnical';
import CreativeCVTemplate from '@/components/cv/CVCreativeTemplate';
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
  
  // Inline editing states
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>('');
  
  const [availableImages, setAvailableImages] = useState<{
    profileImages: UserImage[];
    backgroundImages: UserImage[];
  }>({ profileImages: [], backgroundImages: [] });

  // Carousel states for mobile image selection
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
  const handleContentChange = useCallback(<K extends keyof any>(
    key: K, 
    value: any
  ) => {
    setCvData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        content: {
          ...prev.content,
          cv_data: {
            ...prev.content.cv_data,
            [key]: value,
          },
        },
      };
    });
  }, []);

  // Inline editing handlers
  const startEditing = (field: string, currentValue: string) => {
    setEditingField(field);
    setTempValue(currentValue || '');
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setEditingField(null);
    setTempValue('');
  };

  const saveField = (field: string) => {
    handleContentChange(field, tempValue);
    setEditingField(null);
    setTempValue('');
    toast.success(`${field} päivitetty!`);
  };

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
      
      console.log('📤 Uploading image:', { type, size: file.size });
      
      // ✅ PÄIVITÄ KAIKKI POLUT
      setCvData(prev => {
        if (!prev) return prev;
        
        const updated: any = {
          ...prev,
          // Päivitä top-level
          [type]: base64data,
          
          content: {
            ...prev.content,
            
            // Päivitä cv_data
            cv_data: {
              ...prev.content.cv_data,
              [type]: base64data,
            },
            
            // Päivitä ai_data
            ai_data: {
              ...prev.content.ai_data,
              [type === 'profileImage' ? 'profile_image' : 'background_image']: base64data,
            }
          },
        };
        
        console.log('✅ Image uploaded to state');
        return updated;
      });
      
      toast.success('Kuva ladattu!');
    };
    reader.readAsDataURL(file);
  };

  const handleSelectImage = (image: UserImage, type: 'profileImage' | 'backgroundImage') => {
    const imageUrl = image.signedUrl || '';
    
    console.log('🖼️ Selecting image:', { type, imageUrl });
    
    // ✅ PÄIVITÄ KAIKKI MAHDOLLISET POLUT
    setCvData(prev => {
      if (!prev) return prev;
      
      const updated: any = {
        ...prev,
        // Päivitä top-level kentät
        [type]: imageUrl,
        
        content: {
          ...prev.content,
          
          // Päivitä cv_data
          cv_data: {
            ...prev.content.cv_data,
            [type]: imageUrl,
          },
          
          // Päivitä ai_data
          ai_data: {
            ...prev.content.ai_data,
            [type === 'profileImage' ? 'profile_image' : 'background_image']: imageUrl,
          }
        },
      };
      
      console.log('✅ CV data updated:', {
        topLevel: updated[type],
        cvData: updated.content.cv_data[type],
        aiData: type === 'profileImage' ? updated.content.ai_data.profile_image : updated.content.ai_data.background_image
      });
      
      return updated;
    });
    
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
      setEditingField(null);
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Tallennus epäonnistui');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) throw new Error('No authentication token');

      const response = await fetch('/api/generate-cv-pdf', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ cvId: id }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('PDF generation error:', errorText);
        throw new Error('PDF generation failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CV_${cvData?.title || 'dokumentti'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('PDF ladattu!');
    } catch (error) {
      console.error('PDF error:', error);
      toast.error('PDF:n luonti epäonnistui. Yritä uudelleen hetken kuluttua.');
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

  // --- CAROUSEL NAVIGATION ---
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

  // --- RENDER TEMPLATE FUNCTION ---
  const renderTemplate = () => {
    if (!cvData) return null;

    const commonProps: CVTemplateProps = {
      data: {
        name: cvData.content?.cv_data?.name || cvData.title?.split(' - ')[0] || '',
        email: cvData.content?.cv_data?.email || '',
        phone: cvData.content?.cv_data?.phone || '',
        location: cvData.content?.cv_data?.location || '',
        language: cvData.content?.cv_data?.language || 'finnish',
        
        education: cvData.content?.cv_data?.education || '',
        workExperience: cvData.content?.cv_data?.workExperience || '',
        skills: cvData.content?.cv_data?.skills || '',
        languages: cvData.content?.cv_data?.languages || '',
        
        userId: cvData.user_id,
        cvId: cvData.id,
        
        title: cvData.content?.cv_data?.title || '',
        introText: cvData.content?.cv_data?.introText || '',
        backgroundImage: cvData.content?.cv_data?.backgroundImage || cvData.content?.ai_data?.background_image || '',
        profileImage: cvData.content?.cv_data?.profileImage || cvData.content?.ai_data?.profile_image || '',
        
        workingStyle: cvData.content?.cv_data?.workingStyle || '',
        problemSolving: cvData.content?.cv_data?.problemSolving || '',
        energySources: cvData.content?.cv_data?.energySources || '',
        uniqueStrength: cvData.content?.cv_data?.uniqueStrength || '',
        learningStyle: cvData.content?.cv_data?.learningStyle || '',
        teamRole: cvData.content?.cv_data?.teamRole || '',
        valuesExample: cvData.content?.cv_data?.valuesExample || '',
        superpower: cvData.content?.cv_data?.superpower || '',
        
        careerGoals: cvData.content?.cv_data?.careerGoals || '',
        bestProjectExample: cvData.content?.cv_data?.bestProjectExample || '',
        failureLesson: cvData.content?.cv_data?.failureLesson || '',
        
        cvType: (cvData.content?.cv_data?.cvType || 
                  cvData.metadata?.cv_type || 
                  'simple') as 'technical' | 'creative' | 'simple',
      },
      aiData: cvData.content?.ai_data || {},
      isEditing: isEditing,
      showEditControls: isEditing,
      editMode: 'content',
      onContentChange: handleContentChange
    };

    const cvType = commonProps.data.cvType;

    switch (cvType) {
      case 'technical':
        return <TechnicalCVTemplate {...commonProps} />;
      case 'creative':
        return <CreativeCVTemplate {...commonProps} />;
      case 'simple':
      default:
        return <SimpleCVTemplate {...commonProps} />;
    }
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

  // --- EXTRACT CURRENT IMAGES ---
  const currentBg = cvData.content?.cv_data?.backgroundImage || cvData.content?.ai_data?.background_image || '';
  const currentProfile = cvData.content?.cv_data?.profileImage || cvData.content?.ai_data?.profile_image || '';

  // Get editable fields
  const name = cvData.content?.cv_data?.name || '';
  const email = cvData.content?.cv_data?.email || '';
  const phone = cvData.content?.cv_data?.phone || '';
  const location = cvData.content?.cv_data?.location || '';
  const title = cvData.content?.cv_data?.title || '';

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
            
            {/* LEFT: Back + Title */}
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
            
            {/* RIGHT: Action Buttons */}
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
                    onClick={() => {
                      setIsEditing(false);
                      setEditingField(null);
                    }}
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

      {/* MAIN CONTENT GRID */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          
          {/* LEFT SIDEBAR - Image Controls + Text Editing */}
          <div className="lg:col-span-3 space-y-4">
            
            {/* EDITABLE FIELDS CARD */}
            {isEditing && (
              <div className="bg-white/80 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="bg-blue-500/10 border border-blue-500/20 p-2 rounded-xl">
                    <Edit3 className="w-4 h-4 text-blue-500" />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-wider">Muokkaa tietoja</h3>
                </div>

                <div className="space-y-3">
                  {/* Name */}
                  <div>
                    <label className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-1 block">Nimi</label>
                    {editingField === 'name' ? (
                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveField('name');
                            if (e.key === 'Escape') cancelEditing();
                          }}
                          className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border-2 border-orange-300 rounded-lg text-sm"
                          autoFocus
                        />
                        <button onClick={() => saveField('name')} className="px-2 bg-green-500 text-white rounded-lg">
                          <Save className="w-4 h-4" />
                        </button>
                        <button onClick={cancelEditing} className="px-2 bg-gray-500 text-white rounded-lg">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditing('name', name)}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-left transition-colors"
                      >
                        {name || 'Klikkaa muokataksesi'}
                      </button>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-1 block">Sähköposti</label>
                    {editingField === 'email' ? (
                      <div className="flex gap-1">
                        <input
                          type="email"
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveField('email');
                            if (e.key === 'Escape') cancelEditing();
                          }}
                          className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border-2 border-orange-300 rounded-lg text-sm"
                          autoFocus
                        />
                        <button onClick={() => saveField('email')} className="px-2 bg-green-500 text-white rounded-lg">
                          <Save className="w-4 h-4" />
                        </button>
                        <button onClick={cancelEditing} className="px-2 bg-gray-500 text-white rounded-lg">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditing('email', email)}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-left transition-colors"
                      >
                        {email || 'Klikkaa muokataksesi'}
                      </button>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-1 block">Puhelin</label>
                    {editingField === 'phone' ? (
                      <div className="flex gap-1">
                        <input
                          type="tel"
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveField('phone');
                            if (e.key === 'Escape') cancelEditing();
                          }}
                          className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border-2 border-orange-300 rounded-lg text-sm"
                          autoFocus
                        />
                        <button onClick={() => saveField('phone')} className="px-2 bg-green-500 text-white rounded-lg">
                          <Save className="w-4 h-4" />
                        </button>
                        <button onClick={cancelEditing} className="px-2 bg-gray-500 text-white rounded-lg">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditing('phone', phone)}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-left transition-colors"
                      >
                        {phone || 'Klikkaa muokataksesi'}
                      </button>
                    )}
                  </div>

                  {/* Location */}
                  <div>
                    <label className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-1 block">Sijainti</label>
                    {editingField === 'location' ? (
                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveField('location');
                            if (e.key === 'Escape') cancelEditing();
                          }}
                          className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border-2 border-orange-300 rounded-lg text-sm"
                          autoFocus
                        />
                        <button onClick={() => saveField('location')} className="px-2 bg-green-500 text-white rounded-lg">
                          <Save className="w-4 h-4" />
                        </button>
                        <button onClick={cancelEditing} className="px-2 bg-gray-500 text-white rounded-lg">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditing('location', location)}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-left transition-colors"
                      >
                        {location || 'Klikkaa muokataksesi'}
                      </button>
                    )}
                  </div>

                  {/* Title */}
                  <div>
                    <label className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-1 block">Ammattinimike</label>
                    {editingField === 'title' ? (
                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveField('title');
                            if (e.key === 'Escape') cancelEditing();
                          }}
                          className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border-2 border-orange-300 rounded-lg text-sm"
                          autoFocus
                        />
                        <button onClick={() => saveField('title')} className="px-2 bg-green-500 text-white rounded-lg">
                          <Save className="w-4 h-4" />
                        </button>
                        <button onClick={cancelEditing} className="px-2 bg-gray-500 text-white rounded-lg">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditing('title', title)}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-left transition-colors"
                      >
                        {title || 'Klikkaa muokataksesi'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Profile Picture Card */}
            <div className="bg-white/80 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-orange-500/10 border border-orange-500/20 p-2 rounded-xl">
                  <User className="w-4 h-4 text-orange-500" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-wider">Profiilikuva</h3>
              </div>
              
              {/* Current Profile Image */}
              <div className="relative w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden border-4 border-orange-500/20 shadow-lg bg-gray-100 dark:bg-gray-800">
                {currentProfile ? (
                  <img src={currentProfile} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-gray-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                )}
              </div>

              {/* Upload Button */}
              <label className="cursor-pointer w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-orange-600 dark:text-orange-400 rounded-xl text-sm font-bold transition-colors mb-4">
                <Upload className="w-4 h-4" />
                Lataa uusi
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'profileImage')} />
              </label>

              {/* Available Images - Mobile Carousel / Desktop Grid */}
              {availableImages.profileImages.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 font-bold uppercase tracking-wider">Valitse kuva:</p>
                  
                  {isMobile && availableImages.profileImages.length > 4 ? (
                    // MOBILE CAROUSEL
                    <div className="relative">
                      <div className="overflow-hidden rounded-xl">
                        <div className="flex transition-transform duration-300" style={{ transform: `translateX(-${profileCarouselIndex * 100}%)` }}>
                          {availableImages.profileImages.map((img) => (
                            <button 
                              key={img.id}
                              onClick={() => handleSelectImage(img, 'profileImage')}
                              className={`w-full flex-shrink-0 aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                                currentProfile === img.signedUrl 
                                  ? 'border-orange-500 ring-4 ring-orange-500/30' 
                                  : 'border-gray-200 dark:border-gray-700'
                              }`}
                            >
                              <img src={img.signedUrl} alt="" className="w-full h-full object-cover" />
                              {img.is_ai_generated && (
                                <div className="absolute top-2 right-2 bg-purple-500 rounded-lg p-1">
                                  <Sparkles className="w-3 h-3 text-white" />
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-center items-center gap-3 mt-3">
                        <button onClick={prevProfileImage} className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-bold">{profileCarouselIndex + 1} / {availableImages.profileImages.length}</span>
                        <button onClick={nextProfileImage} className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    // DESKTOP GRID
                    <div className="grid grid-cols-4 gap-2">
                      {availableImages.profileImages.slice(0, 8).map((img) => (
                        <button 
                          key={img.id}
                          onClick={() => handleSelectImage(img, 'profileImage')}
                          className={`aspect-square rounded-xl overflow-hidden border-2 transition-all relative ${
                            currentProfile === img.signedUrl 
                              ? 'border-orange-500 ring-2 ring-orange-500/30 scale-105' 
                              : 'border-gray-200 dark:border-gray-700 hover:border-orange-300'
                          }`}
                        >
                          <img src={img.signedUrl} alt="" className="w-full h-full object-cover" />
                          {img.is_ai_generated && (
                            <div className="absolute bottom-0 right-0 bg-purple-500 rounded-tl-lg p-0.5">
                              <Sparkles className="w-2 h-2 text-white" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Background Image Card */}
            <div className="bg-white/80 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl">
                  <ImageIconLucide className="w-4 h-4 text-amber-500" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-wider">Taustakuva</h3>
              </div>

              {/* Upload Button */}
              <label className="cursor-pointer w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-500/10 hover:bg-amber-500/20 border-2 border-dashed border-amber-500/30 text-amber-600 dark:text-amber-400 rounded-xl text-sm font-bold transition-colors mb-4">
                <Upload className="w-4 h-4" />
                Lataa taustakuva
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'backgroundImage')} />
              </label>

              {/* Available Background Images */}
              {availableImages.backgroundImages.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Valitse tausta:</p>
                    <span className="text-xs bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full font-bold border border-amber-500/30">
                      {availableImages.backgroundImages.length}
                    </span>
                  </div>
                  
                  {isMobile && availableImages.backgroundImages.length > 2 ? (
                    // MOBILE CAROUSEL
                    <div className="relative">
                      <div className="overflow-hidden rounded-xl">
                        <div className="flex transition-transform duration-300" style={{ transform: `translateX(-${bgCarouselIndex * 100}%)` }}>
                          {availableImages.backgroundImages.map((img) => (
                            <button
                              key={img.id}
                              onClick={() => handleSelectImage(img, 'backgroundImage')}
                              className={`w-full flex-shrink-0 aspect-video rounded-xl overflow-hidden border-2 relative transition-all ${
                                currentBg === img.signedUrl 
                                  ? 'border-amber-500 ring-4 ring-amber-500/30' 
                                  : 'border-gray-200 dark:border-gray-700'
                              }`}
                            >
                              <img src={img.signedUrl} alt="" className="w-full h-full object-cover" />
                              {img.is_ai_generated && (
                                <div className="absolute top-2 right-2 bg-purple-500 text-white text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Sparkles className="w-2.5 h-2.5" />
                                  AI
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-center items-center gap-3 mt-3">
                        <button onClick={prevBgImage} className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-bold">{bgCarouselIndex + 1} / {availableImages.backgroundImages.length}</span>
                        <button onClick={nextBgImage} className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    // DESKTOP GRID
                    <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto custom-scrollbar">
                      {availableImages.backgroundImages.map((img) => (
                        <button
                          key={img.id}
                          onClick={() => handleSelectImage(img, 'backgroundImage')}
                          className={`aspect-video rounded-xl overflow-hidden border-2 relative group transition-all ${
                            currentBg === img.signedUrl 
                              ? 'border-amber-500 ring-2 ring-amber-500/30 scale-105' 
                              : 'border-gray-200 dark:border-gray-700 hover:border-amber-300'
                          }`}
                        >
                          <img src={img.signedUrl} alt="" className="w-full h-full object-cover" />
                          {img.is_ai_generated && (
                            <div className="absolute top-1.5 right-1.5 bg-purple-500 text-white text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1 border border-white/20">
                              <Sparkles className="w-2.5 h-2.5" />
                              AI
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* CENTER: CV PREVIEW */}
          <div className="lg:col-span-9">
            <div className="bg-white/80 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-2 sm:p-6 overflow-hidden">
              <div className="overflow-x-auto custom-scrollbar flex justify-center bg-gray-50 dark:bg-black/20 rounded-xl border border-gray-200 dark:border-gray-800">
                <div 
                  className="origin-top transition-transform duration-300 bg-white shadow-2xl my-4"
                  style={{
                    width: '210mm',
                    minHeight: '297mm',
                    transform: isMobile ? 'scale(0.35)' : window.innerWidth < 1024 ? 'scale(0.6)' : 'scale(0.75)',
                    transformOrigin: 'top center'
                  }}
                >
                  {renderTemplate()}
                </div>
              </div>
            </div>

            {/* Info */}
            {isEditing && (
              <div className="mt-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <p className="text-sm font-bold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Klikkaa tekstikenttiä vasemmalla muokataksesi niitä!
                </p>
              </div>
            )}
          </div>

        </div>
      </div>

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