'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { 
  Save, ArrowLeft, Trash2, Download, Loader2, 
  Upload, User, Image as ImageIconLucide, Sparkles, Eye, Edit3
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center">
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-[2rem] shadow-2xl p-8 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-orange-400 mx-auto mb-4" />
          <p className="text-lg font-bold text-gray-100">Ladataan CV:tä...</p>
        </div>
      </div>
    );
  }

  // --- EXTRACT CURRENT IMAGES ---
  const currentBg = cvData.content?.cv_data?.backgroundImage || cvData.content?.ai_data?.background_image || '';
  const currentProfile = cvData.content?.cv_data?.profileImage || cvData.content?.ai_data?.profile_image || '';

  // --- MAIN RENDER ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 font-sans text-gray-100 relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-orange-500/10 to-amber-600/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-orange-500/8 to-gray-700/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-gradient-to-br from-amber-500/8 to-orange-600/8 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      {/* TOP BAR */}
      <div className="px-2 md:px-6 py-3 md:py-4 mt-16 sticky top-16 z-40">
        <div className="max-w-[1800px] mx-auto backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl md:rounded-2xl shadow-2xl p-3 md:p-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            
            {/* LEFT: Back + Title */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <button 
                onClick={() => router.push('/my-cvs')}
                className="p-2 h-9 w-9 md:h-10 md:w-10 bg-white/5 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center shadow-lg hover:bg-white/10 transition-colors flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 text-gray-300" />
              </button>
              
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-sm md:text-xl font-bold text-gray-100 truncate">
                    {cvData.title || 'Nimetön CV'}
                  </h1>
                  <span className="hidden sm:inline-flex px-2 py-0.5 bg-orange-500/20 text-orange-300 text-xs font-semibold rounded-full border border-orange-400/30 flex-shrink-0 capitalize">
                    {cvData.content?.cv_data?.cvType || 'Simple'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* RIGHT: Action Buttons */}
            <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
              {!isEditing ? (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="px-3 md:px-4 h-9 md:h-10 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl flex items-center gap-2 shadow-lg transition-all text-xs md:text-sm font-bold"
                >
                  <Edit3 className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">Muokkaa</span>
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="px-3 h-9 md:h-10 bg-white/5 backdrop-blur-md border border-white/10 text-gray-300 rounded-xl hover:bg-white/10 transition-colors text-xs md:text-sm font-semibold flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">Esikatsele</span>
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-3 md:px-4 h-9 md:h-10 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl flex items-center gap-2 shadow-lg disabled:opacity-50 transition-all text-xs md:text-sm font-bold"
                  >
                    {isSaving ? <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" /> : <Save className="w-3 h-3 md:w-4 md:h-4" />}
                    <span className="hidden sm:inline">Tallenna</span>
                  </button>
                </>
              )}
              
              <button 
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="p-2 h-9 w-9 md:h-10 md:w-10 bg-white/5 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center shadow-lg hover:bg-white/10 transition-colors"
                title="Lataa PDF"
              >
                {isDownloading ? <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin text-orange-400" /> : <Download className="w-3 h-3 md:w-4 md:h-4 text-gray-300" />}
              </button>
              
              <button 
                onClick={handleDelete} 
                className="p-2 h-9 w-9 md:h-10 md:w-10 bg-white/5 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center shadow-lg hover:bg-red-500/20 transition-colors"
                title="Poista CV"
              >
                <Trash2 className="w-4 h-4 md:w-5 md:h-5 text-red-400" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="fixed top-24 right-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 md:px-6 py-3 rounded-xl shadow-2xl z-50 animate-fade-in font-bold flex items-center gap-2 border border-green-400/30">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="fixed top-24 right-4 bg-gradient-to-r from-red-500 to-pink-600 text-white px-4 md:px-6 py-3 rounded-xl shadow-2xl z-50 animate-fade-in font-bold border border-red-400/30">
          {errorMessage}
        </div>
      )}

      {/* MAIN CONTENT GRID */}
      <div className="max-w-[1800px] mx-auto p-2 md:p-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
          
          {/* LEFT SIDEBAR */}
          <div className="lg:col-span-3 space-y-4">
            
            {/* Profile Picture */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-xl p-4 md:p-5">
              <h3 className="text-sm md:text-base font-bold text-gray-100 mb-4 flex items-center gap-2">
                <div className="bg-orange-500/20 backdrop-blur-md p-1.5 rounded-lg border border-orange-400/30">
                  <User className="w-4 h-4 text-orange-400" />
                </div>
                Profiilikuva
              </h3>
              
              <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
                <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-2 border-orange-400/30 shadow-lg bg-gray-800/50 flex-shrink-0">
                  {currentProfile ? (
                    <img src={currentProfile} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 md:w-12 md:h-12 text-gray-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                  )}
                </div>
                <div className="flex-1 w-full">
                   <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500/20 backdrop-blur-md border border-orange-400/30 text-orange-300 rounded-xl text-xs md:text-sm font-bold hover:bg-orange-500/30 transition-colors w-full">
                    <Upload className="w-3 h-3 md:w-4 md:h-4" />
                    Lataa uusi
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'profileImage')} />
                   </label>
                </div>
              </div>

              {availableImages.profileImages.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-gray-400 mb-3 font-semibold">Valitse valmis kuva:</p>
                  <div className="grid grid-cols-4 gap-2">
                    {availableImages.profileImages.slice(0, 8).map((img) => (
                      <button 
                        key={img.id}
                        onClick={() => handleSelectImage(img, 'profileImage')}
                        className={`aspect-square rounded-full overflow-hidden border-2 transition-all relative group ${
                          currentProfile === img.signedUrl 
                            ? 'border-orange-400 ring-2 ring-orange-400/30 scale-110' 
                            : 'border-white/10 hover:border-orange-300/50'
                        }`}
                      >
                        <img src={img.signedUrl} alt="" className="w-full h-full object-cover" />
                        {img.is_ai_generated && (
                          <div className="absolute bottom-0 right-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-tl-lg p-0.5">
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
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-xl p-4 md:p-5">
              <h3 className="text-sm md:text-base font-bold text-gray-100 mb-4 flex items-center gap-2">
                <div className="bg-amber-500/20 backdrop-blur-md p-1.5 rounded-lg border border-amber-400/30">
                  <ImageIconLucide className="w-4 h-4 text-amber-400" />
                </div>
                Taustakuva
              </h3>

              <div className="mb-4">
                <label className="cursor-pointer w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-500/20 backdrop-blur-md border-2 border-dashed border-amber-400/30 text-amber-300 rounded-xl text-xs md:text-sm font-bold hover:bg-amber-500/30 transition-colors">
                  <Upload className="w-4 h-4" />
                  Lataa taustakuva
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'backgroundImage')} />
                </label>
              </div>

              {availableImages.backgroundImages.length > 0 && (
                <div className="mb-2">
                   <div className="flex items-center justify-between mb-3">
                     <p className="text-xs text-gray-400 font-semibold">Valitse taustakuva:</p>
                     <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-400/30">
                       {availableImages.backgroundImages.length}
                     </span>
                   </div>
                   <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-80 overflow-y-auto p-1 custom-scrollbar">
                      {availableImages.backgroundImages.map((img) => (
                        <button
                          key={img.id}
                          onClick={() => handleSelectImage(img, 'backgroundImage')}
                          className={`aspect-video rounded-xl overflow-hidden border-2 relative group transition-all ${
                            currentBg === img.signedUrl 
                              ? 'border-amber-400 ring-2 ring-amber-400/30 scale-105' 
                              : 'border-white/10 hover:border-amber-300/50'
                          }`}
                          title={img.name}
                        >
                          <img src={img.signedUrl} alt="" className="w-full h-full object-cover" />
                          
                          {img.is_ai_generated && (
                            <div className="absolute top-1.5 right-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg border border-white/20">
                              <Sparkles className="w-2.5 h-2.5" />
                              AI
                            </div>
                          )}
                          
                          <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                            <p className="text-white text-[10px] text-center font-semibold">{img.name}</p>
                          </div>
                        </button>
                      ))}
                   </div>
                </div>
              )}

              {availableImages.backgroundImages.length === 0 && (
                <p className="text-xs text-gray-500 text-center py-6 bg-gray-800/30 rounded-xl border border-dashed border-gray-700">
                  Ei tallennettuja taustakuvia
                </p>
              )}
            </div>

          </div>

          {/* CENTER: CV PREVIEW */}
          <div className="lg:col-span-9">
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl md:rounded-3xl shadow-2xl p-2 md:p-6 overflow-hidden">
               <div className="overflow-x-auto pb-4 custom-scrollbar flex justify-center bg-gray-900/30 rounded-xl border border-white/5 inner-shadow">
                  <div 
                    className="origin-top transition-transform duration-300 bg-white shadow-2xl mt-4 mb-4 print:shadow-none print:m-0"
                    style={{
                      width: '210mm',
                      minHeight: '297mm',
                      transform: window.innerWidth < 640 ? 'scale(0.4)' : window.innerWidth < 1024 ? 'scale(0.6)' : 'scale(0.85)',
                      transformOrigin: 'top center'
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
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        
        /* Mobile optimizations */
        @media (max-width: 640px) {
          .custom-scrollbar {
            scrollbar-width: thin;
          }
        }
      `}</style>
    </div>
  );
}