'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { 
  Save, ArrowLeft, Trash2, Download, Loader2, 
  Upload, User, Image as ImageIconLucide, Sparkles
} from 'lucide-react';
import { fetchCVById, updateCV, deleteCV } from '@/services/cvService-client';
import { getAllAvailableImagesAction, type UserImage } from '@/app/actions/userImages';
import { BaseCV, CVTemplateProps } from '@/types';
import SimpleCVTemplate from '@/components/cv/CVSimpleTemplate';
import TechnicalCVTemplate from '@/components/cv/CVTemplateTechnical';
import CreativeCVTemplate from '@/components/cv/CVCreativeTemplate';

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
  
  const [availableImages, setAvailableImages] = useState<{
    profileImages: UserImage[];
    backgroundImages: UserImage[];
  }>({ profileImages: [], backgroundImages: [] });
  
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // --- INITIAL LOAD ---
// app/edit-cv/[id]/page.tsx - INITIAL LOAD (KORJATTU)

useEffect(() => {
  const init = async () => {
    if (!userId || !id) return;

    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) throw new Error('No authentication token');

      const { data, error } = await fetchCVById(id, userId, token);
      if (error) throw error;
      
      if (data) {
        // ✅ PROSESSOI KUVAT ENNEN TALLENNUSTA
        const processImageUrl = (url: string | null | undefined): string => {
          if (!url || url.trim() === "") return "";
          const trimmed = url.trim();
          
          // Base64 → OK (paitsi SVG)
          if (trimmed.startsWith('data:image') && !trimmed.includes('svg+xml')) {
            return trimmed;
          }
          
          // HTTP URL → OK
          if (trimmed.startsWith('http')) {
            return trimmed;
          }
          
          // Supabase path → Rakenna public URL
          if (trimmed.includes('/')) {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            if (!supabaseUrl) return "";
            return `${supabaseUrl}/storage/v1/object/public/cv_files/${trimmed}`;
          }
          
          return "";
        };
        
        // ✅ HAE PROFIILIKUVA
        const profileImage = processImageUrl(
          data.content?.cv_data?.profileImage || 
          data.content?.ai_data?.profile_image
        );
        
        // ✅ HAE TAUSTAKUVA
        const backgroundImage = processImageUrl(
          data.content?.cv_data?.backgroundImage || 
          data.content?.ai_data?.background_image
        );
        
        // ✅ TALLENNA PROSESSOIDUT KUVAT
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
        
        console.log(`✅ CV loaded with images:`, {
          hasProfile: !!profileImage,
          hasBackground: !!backgroundImage
        });
        
        setCvData(data);
      }

      const images = await getAllAvailableImagesAction();
      setAvailableImages(images);

    } catch (err) {
      console.error('Error initializing CV page:', err);
      setErrorMessage('CV:n lataaminen epäonnistui');
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

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>, 
    type: 'profileImage' | 'backgroundImage'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Kuva on liian suuri (max 5MB)');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64data = reader.result as string;
      handleContentChange(type, base64data);
    };
    reader.readAsDataURL(file);
  };

  const handleSelectImage = (image: UserImage, type: 'profileImage' | 'backgroundImage') => {
    handleContentChange(type, image.signedUrl || '');
  };

  const handleSave = async () => {
    if (!cvData || !userId) return;
    setIsSaving(true);
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) throw new Error('No token');

      await updateCV(id, { content: cvData.content }, token);
      
      setSuccessMessage('✅ CV tallennettu!');
      setTimeout(() => setSuccessMessage(null), 3000);
      setIsEditing(false);
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
      const response = await fetch('/api/generate-cv-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvId: id }),
      });

      if (!response.ok) throw new Error('PDF generation failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CV_${cvData?.title || 'dokumentti'}.pdf`;
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
    if (!confirm('Haluatko varmasti poistaa tämän CV:n?')) return;
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token || !userId) throw new Error('No token');
      await deleteCV(id, userId, token);
      router.push('/my-cvs');
    } catch (error) {
      console.error('Delete error:', error);
      alert('Poisto epäonnistui');
    }
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
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex items-center justify-center">
        <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-2xl shadow-2xl p-8 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-lg font-bold text-gray-900">Ladataan CV:tä...</p>
        </div>
      </div>
    );
  }

  // --- EXTRACT CURRENT IMAGES ---
  const currentBg = cvData.content?.cv_data?.backgroundImage || cvData.content?.ai_data?.background_image || '';
  const currentProfile = cvData.content?.cv_data?.profileImage || cvData.content?.ai_data?.profile_image || '';

  // --- MAIN RENDER ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 font-sans text-gray-900 relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-indigo-400/30 to-purple-400/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-pink-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      {/* TOP BAR */}
      <div className="px-2 md:px-6 py-3 md:py-4 mt-16 sticky top-16 z-40">
        <div className="max-w-[1800px] mx-auto backdrop-blur-xl bg-white/80 border-2 border-white/40 rounded-xl md:rounded-2xl shadow-xl p-3 md:p-4">
          <div className="flex items-center justify-between gap-2">
            
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <button 
                onClick={() => router.push('/my-cvs')}
                className="p-2 h-9 w-9 md:h-10 md:w-10 bg-white/90 border-2 border-white/60 rounded-full flex items-center justify-center shadow-lg hover:bg-gray-50 flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 text-gray-700" />
              </button>
              
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm md:text-xl font-bold text-gray-800 truncate">
                    {cvData.title || 'Nimetön CV'}
                  </h1>
                  <span className="hidden sm:inline-flex px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full flex-shrink-0 capitalize">
                    {cvData.content?.cv_data?.cvType || 'Simple'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
              {!isEditing ? (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="p-2 h-9 md:h-10 md:px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 flex items-center gap-1 md:gap-2 shadow-md text-xs md:text-sm font-semibold"
                >
                  <span className="hidden sm:inline">Muokkaa</span>
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="p-2 md:px-3 h-9 md:h-10 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-xs md:text-sm font-semibold"
                  >
                    Lopeta
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="p-2 md:px-3 h-9 md:h-10 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg hover:from-green-600 hover:to-teal-700 flex items-center gap-1 shadow-md disabled:opacity-50 text-xs md:text-sm font-semibold"
                  >
                    {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    <span className="hidden sm:inline">Tallenna</span>
                  </button>
                </>
              )}
              
              <button 
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="p-2 h-9 w-9 md:h-10 md:w-10 bg-white/90 border-2 border-white/60 rounded-full flex items-center justify-center shadow-lg hover:bg-gray-50"
                title="Lataa PDF"
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

      {/* Notifications */}
      {successMessage && (
        <div className="fixed top-24 right-4 bg-green-500 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg shadow-lg z-50 animate-fade-in">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="fixed top-24 right-4 bg-red-500 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg shadow-lg z-50 animate-fade-in">
          {errorMessage}
        </div>
      )}

      {/* MAIN CONTENT GRID */}
      <div className="max-w-[1800px] mx-auto p-2 md:p-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
          
          {/* LEFT SIDEBAR */}
          <div className="lg:col-span-3 space-y-4">
            
            {/* Profile Picture */}
            <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-xl shadow-xl p-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-600" />
                Profiilikuva
              </h3>
              
              <div className="flex items-center gap-4 mb-4">
                <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-md bg-gray-100">
                  {currentProfile ? (
                    <img src={currentProfile} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-gray-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                  )}
                </div>
                <div className="flex-1">
                   <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold hover:bg-indigo-100 transition-colors w-full justify-center">
                    <Upload className="w-3 h-3" />
                    Lataa uusi
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'profileImage')} />
                   </label>
                </div>
              </div>

              {availableImages.profileImages.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500 mb-2">Valitse valmis:</p>
                  <div className="grid grid-cols-4 gap-2">
                    {availableImages.profileImages.slice(0, 8).map((img) => (
                      <button 
                        key={img.id}
                        onClick={() => handleSelectImage(img, 'profileImage')}
                        className={`aspect-square rounded-full overflow-hidden border-2 transition-all relative group ${currentProfile === img.signedUrl ? 'border-indigo-500 scale-110' : 'border-transparent hover:border-indigo-300'}`}
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
                </div>
              )}
            </div>

            {/* Background Image */}
            <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-xl shadow-xl p-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <ImageIconLucide className="w-4 h-4 text-purple-600" />
                Taustakuva
              </h3>

              <div className="mb-4">
                <label className="cursor-pointer w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-50 border-2 border-dashed border-purple-200 text-purple-700 rounded-xl text-sm font-semibold hover:bg-purple-100 transition-colors">
                  <Upload className="w-4 h-4" />
                  Lataa taustakuva
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'backgroundImage')} />
                </label>
              </div>

              {availableImages.backgroundImages.length > 0 && (
                <div className="mb-2">
                   <div className="flex items-center justify-between mb-2">
                     <p className="text-xs text-gray-500">Valitse taustakuva:</p>
                     <span className="text-xs text-purple-600 font-semibold">{availableImages.backgroundImages.length} kuvaa</span>
                   </div>
                   <div className="grid grid-cols-3 gap-2 max-h-80 overflow-y-auto p-1 custom-scrollbar">
                      {availableImages.backgroundImages.map((img) => (
                        <button
                          key={img.id}
                          onClick={() => handleSelectImage(img, 'backgroundImage')}
                          className={`aspect-video rounded-lg overflow-hidden border-2 relative group transition-all ${
                            currentBg === img.signedUrl 
                              ? 'border-purple-500 ring-2 ring-purple-200 scale-105' 
                              : 'border-gray-200 hover:border-purple-300'
                          }`}
                          title={img.name}
                        >
                          <img src={img.signedUrl} alt="" className="w-full h-full object-cover" />
                          
                          {img.is_ai_generated && (
                            <div className="absolute top-1 right-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[8px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                              <Sparkles className="w-2 h-2" />
                              AI
                            </div>
                          )}
                          
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <p className="text-white text-[10px] px-2 text-center">{img.name}</p>
                          </div>
                        </button>
                      ))}
                   </div>
                </div>
              )}

              {availableImages.backgroundImages.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">
                  Ei tallennettuja taustakuvia
                </p>
              )}
            </div>

          </div>

          {/* CENTER: CV PREVIEW */}
          <div className="lg:col-span-9">
            <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-xl md:rounded-2xl shadow-xl p-1 md:p-4 overflow-hidden">
               <div className="overflow-x-auto pb-4 custom-scrollbar flex justify-center bg-gray-50/50 rounded-lg border border-gray-100 inner-shadow">
                  <div 
                    className="origin-top transition-transform duration-300 bg-white shadow-2xl mt-4 mb-4 print:shadow-none print:m-0"
                    style={{
                      width: '210mm',
                      minHeight: '297mm',
                      transform: 'scale(0.95)',
                    }}
                  >
                    {renderTemplate()}
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
          background: rgba(0,0,0,0.05);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0,0,0,0.2);
        }
        .inner-shadow {
          box-shadow: inset 0 0 20px rgba(0,0,0,0.02);
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}