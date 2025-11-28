//app/edit-cv/[id]/page.tsx - KORJATTU

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { BaseCV, UserFormData } from '@/types';
import { supabase } from '@/lib/supabase-client';
import { fetchCVById, updateCV, deleteCV } from '@/services/cvService-client';
import SimpleCVTemplate from '@/components/cv/CVSimpleTemplate';
import TechnicalCVTemplate from '@/components/cv/CVTemplateTechnical';
import CreativeCVTemplate from '@/components/cv/CVCreativeTemplate';
import { getDefaultImages } from '@/lib/imageUtils';
import { Button } from '@/components/ui/button';
import { 
  ImageIcon, 
  TextIcon, 
  SaveIcon, 
  ArrowLeftIcon, 
  TrashIcon,
  RotateCcwIcon
} from 'lucide-react';
import { toast } from 'sonner';

const EditCVPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { userId, getToken } = useAuth();

  // ✅ LISÄTTY: Säilytä alkuperäinen AI-generoitu taustakuva
  const [originalAIBackgroundImage, setOriginalAIBackgroundImage] = useState<string | null>(null);
  const [cvData, setCvData] = useState<BaseCV | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'content' | 'images'>('content');
  const [defaultImages, setDefaultImages] = useState<{
    profileImages: string[];
    backgroundImages: string[];
  }>({
    profileImages: [],
    backgroundImages: []
  });

  // ✅ LISÄTTY: Inline editing state
  const [isEditingName, setIsEditingName] = useState(false);
  const [isDraggingProfile, setIsDraggingProfile] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // CV:n lataus
  useEffect(() => {
    if (!userId || !id) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    let retryCount = 0;
    const MAX_RETRIES = 5;
    const RETRY_DELAY = 1000;

    const loadCV = async () => {
      try {
        console.log(`🔄 Loading CV (attempt ${retryCount + 1}/${MAX_RETRIES})...`);

        const token = await getToken({ template: "supabase" });
        
        if (!token) {
          throw new Error("Autentikaatiotoken puuttuu");
        }

        const { data, error: fetchError } = await fetchCVById(id, userId, token);

        if (fetchError) {
          console.error('❌ Supabase error:', fetchError);
          throw fetchError;
        }

        if (!data && retryCount < MAX_RETRIES - 1) {
          console.log(`⏳ CV not found yet, retrying in ${RETRY_DELAY}ms...`);
          retryCount++;
          setTimeout(() => {
            if (isMounted) loadCV();
          }, RETRY_DELAY);
          return;
        }

        if (data && isMounted) {
          console.log('✅ CV loaded successfully');
          setCvData(data);
          
          // ✅ KORJATTU: Tallenna AI-generoitu taustakuva JOS sitä ei ole vielä tallennettu
          if (data.content?.ai_data?.background_image && !originalAIBackgroundImage) {
            setOriginalAIBackgroundImage(data.content.ai_data.background_image);
          }
          
          setIsLoading(false);
          setError(null);
        } else if (!data) {
          setError('CV:tä ei löytynyt');
          setIsLoading(false);
        }

      } catch (err) {
        console.error('❌ Error loading CV:', err);
        setError(err instanceof Error ? err.message : 'CV:n lataaminen epäonnistui');
        setIsLoading(false);
      }
    };

    loadCV();

    return () => {
      isMounted = false;
    };
  }, [id, userId, getToken]);

  // Realtime-päivitykset
  useEffect(() => {
    if (!userId || !id) return;

    console.log('📡 Setting up realtime subscription for CV:', id);

    const channel = supabase
      .channel(`cv_${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cvs',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          console.log('🔔 CV inserted via realtime:', payload.new);
          setCvData(payload.new as BaseCV);
          setIsLoading(false);
          setError(null);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'cvs',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          console.log('🔔 CV updated via realtime');
          setCvData(payload.new as BaseCV);
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 Unsubscribing from realtime');
      channel.unsubscribe();
    };
  }, [id, userId]);

  // Lataa default-kuvat
  useEffect(() => {
    const loadImages = async () => {
      try {
        const images = await getDefaultImages();
        setDefaultImages(images);
      } catch (error) {
        console.error('⚠️ Kuvien lataus epäonnistui:', error);
      }
    };
    loadImages();
  }, []);

  // ✅ KORJATTU: Palauta AI-generoitu taustakuva
  const handleRestoreAIBackground = () => {
    if (originalAIBackgroundImage) {
      setCvData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          content: {
            ...prev.content,
            cv_data: {
              ...prev.content.cv_data,
              backgroundImage: originalAIBackgroundImage,
            },
          },
        };
      });
      toast.success('AI-generoitu taustakuva palautettu!');
    }
  };

  // ✅ KORJATTU: Valitse default-kuva
  const handleSelectDefaultImage = async (imageUrl: string, field: 'profileImage' | 'backgroundImage') => {
    try {
      const token = await getToken({ template: "supabase" });
      
      if (!token) {
        console.error("❌ No token available");
        toast.error("Kirjautuminen vanhentunut - päivitä sivu");
        return;
      }

      setCvData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          content: {
            ...prev.content,
            cv_data: {
              ...prev.content.cv_data,
              [field]: imageUrl,
            },
          },
        };
      });
      
      toast.success(field === 'backgroundImage' ? "Taustakuva vaihdettu!" : "Profiilikuva vaihdettu!");
    } catch (error) {
      console.error("❌ Error:", error);
      toast.error("Kuvan vaihto epäonnistui");
    }
  };

  // Handle content changes
  const handleContentChange = useCallback(<K extends keyof UserFormData>(
    key: K, 
    value: UserFormData[K]
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

  // Handle image uploads
  const handleImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>, 
    field: 'profileImage' | 'backgroundImage'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kuvan koko on liian suuri. Maksimikoko on 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      handleContentChange(field, reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // ✅ KORJATTU: Tallenna CV
  const handleSave = async () => {
    if (!cvData || !id) return;

    setIsSaving(true);
    try {
      console.log('💾 Saving CV...');

      const token = await getToken({ template: "supabase" });
      
      if (!token) {
        throw new Error("Autentikaatiotoken puuttuu");
      }

      await updateCV(id, {
        content: cvData.content,
      }, token);

      console.log('✅ CV saved successfully');
      toast.success('CV tallennettu onnistuneesti!');

    } catch (error) {
      console.error('❌ Error saving CV:', error);
      toast.error('CV:n tallentaminen epäonnistui: ' + (error instanceof Error ? error.message : 'Tuntematon virhe'));
    } finally {
      setIsSaving(false);
    }
  };

  // Poista CV
  const handleDelete = async () => {
    if (!confirm('Haluatko varmasti poistaa tämän CV:n?')) return;
    if (!userId) return;

    try {
      console.log('🗑️ Deleting CV...');

      const token = await getToken({ template: "supabase" });
      
      if (!token) {
        throw new Error("Autentikaatiotoken puuttuu");
      }

      await deleteCV(id, userId, token);

      console.log('✅ CV deleted successfully');
      toast.success('CV poistettu onnistuneesti!');
      router.push('/my-cvs');

    } catch (error) {
      console.error('❌ Error deleting CV:', error);
      toast.error('CV:n poistaminen epäonnistui: ' + (error instanceof Error ? error.message : 'Tuntematon virhe'));
    }
  };

  // Render the appropriate template
  const renderTemplate = () => {
    if (!cvData) return null;

    const commonProps = {
      data: {
        ...cvData.content.cv_data,
        bgHeight: cvData.content.cv_data.bgHeight || '80',
        blueBarHeight: cvData.content.cv_data.blueBarHeight || '11',
        profilePosition: cvData.content.cv_data.profilePosition || JSON.stringify({
          top: 10,
          right: 8,
          width: 55,
          height: 55
        }),
        infoBarItemsPosition: cvData.content.cv_data.infoBarItemsPosition || JSON.stringify([
          { id: 'phone', content: cvData.content.cv_data.phone || '', icon: '📞', position: 0 },
          { id: 'email', content: cvData.content.cv_data.email || '', icon: '📧', position: 1 },
          { id: 'age', content: cvData.content.cv_data.age || '', icon: '🎂', position: 2 }
        ])
      },
      aiData: cvData.content.ai_data,
      isEditing: true,
      editMode: selectedTab,
      showEditControls: true,
      onContentChange: handleContentChange
    };

    const cvType = cvData.content.cv_data.cvType || cvData.content.ai_data?.cvType || 'simple';

    switch (cvType) {
      case 'technical':
        return <TechnicalCVTemplate {...commonProps} />;
      case 'simple':
      default:
        return <SimpleCVTemplate {...commonProps} />;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-yellow-50">
        <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="text-2xl font-bold text-center">Ladataan CV:tä...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-100 border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-red-700 font-bold text-xl mb-4">{error}</p>
          <button
            onClick={() => router.push('/my-cvs')}
            className="bg-blue-400 border-4 border-black px-6 py-3 font-bold hover:translate-x-1 hover:translate-y-1 hover:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
          >
            Palaa omiin CV:hin
          </button>
        </div>
      </div>
    );
  }

  // No CV found
  if (!cvData) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-gray-800 font-bold text-xl mb-4">CV:tä ei löytynyt</p>
          <button
            onClick={() => router.push('/my-cvs')}
            className="bg-blue-400 border-4 border-black px-6 py-3 font-bold hover:translate-x-1 hover:translate-y-1 hover:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
          >
            Palaa omiin CV:hin
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-yellow-50 py-8">
      <div className="container mx-auto px-4">
        {/* ✅ NEO-BRUTALISM HEADER */}
        <div className="bg-white border-4 border-black p-6 mb-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h1 className="text-3xl md:text-4xl font-black uppercase">Muokkaa CV:tä</h1>
            
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-green-400 border-4 border-black px-6 py-3 font-bold hover:translate-x-1 hover:translate-y-1 hover:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <SaveIcon className="h-5 w-5" />
                {isSaving ? 'Tallennetaan...' : 'Tallenna'}
              </button>
              
              <button
                onClick={() => router.push('/my-cvs')}
                className="bg-blue-400 border-4 border-black px-6 py-3 font-bold hover:translate-x-1 hover:translate-y-1 hover:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-2"
              >
                <ArrowLeftIcon className="h-5 w-5" />
                Takaisin
              </button>
              
              <button
                onClick={handleDelete}
                className="bg-red-400 border-4 border-black px-6 py-3 font-bold hover:translate-x-1 hover:translate-y-1 hover:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-2"
              >
                <TrashIcon className="h-5 w-5" />
                Poista
              </button>
            </div>
          </div>
        </div>

        {/* ✅ NEO-BRUTALISM TABS */}
        <div className="bg-white border-4 border-black mb-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex border-b-4 border-black">
            <button
              className={`flex-1 p-4 font-bold text-lg transition-colors ${
                selectedTab === 'content' 
                  ? 'bg-yellow-300' 
                  : 'bg-white hover:bg-gray-100'
              } border-r-4 border-black flex items-center justify-center gap-2`}
              onClick={() => setSelectedTab('content')}
            >
              <TextIcon className="h-5 w-5" />
              SISÄLTÖ
            </button>
            <button
              className={`flex-1 p-4 font-bold text-lg transition-colors ${
                selectedTab === 'images' 
                  ? 'bg-yellow-300' 
                  : 'bg-white hover:bg-gray-100'
              } flex items-center justify-center gap-2`}
              onClick={() => setSelectedTab('images')}
            >
              <ImageIcon className="h-5 w-5" />
              KUVAT
            </button>
          </div>

          {/* ✅ IMAGES TAB CONTENT */}
          {selectedTab === 'images' && (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Profile image section */}
              <div className="bg-pink-100 border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <h3 className="text-xl font-black mb-4 uppercase">Profiilikuva</h3>
                <div className="mb-4">
                  <label className="block font-bold mb-2">Lataa oma kuva</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, 'profileImage')}
                    className="block w-full text-sm border-2 border-black p-2 font-mono"
                  />
                </div>
                
                {defaultImages.profileImages.length > 0 && (
                  <div>
                    <p className="font-bold mb-2">Valmiit kuvat:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {defaultImages.profileImages.map((imgUrl, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSelectDefaultImage(imgUrl, 'profileImage')}
                          className={`border-4 border-black p-1 hover:translate-x-1 hover:translate-y-1 transition-transform ${
                            cvData.content.cv_data.profileImage === imgUrl ? 'bg-yellow-300' : 'bg-white'
                          }`}
                        >
                          <img 
                            src={imgUrl} 
                            alt={`Profile ${idx + 1}`} 
                            className="w-full h-auto rounded-full"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Background image section */}
              <div className="bg-blue-100 border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <h3 className="text-xl font-black mb-4 uppercase">Taustakuva</h3>
                
                {/* ✅ PALAUTA AI-KUVA NAPPI */}
                {originalAIBackgroundImage && (
                  <button
                    onClick={handleRestoreAIBackground}
                    className="w-full bg-purple-400 border-4 border-black px-4 py-2 font-bold mb-4 hover:translate-x-1 hover:translate-y-1 hover:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-2"
                  >
                    <RotateCcwIcon className="h-5 w-5" />
                    Palauta AI-generoitu tausta
                  </button>
                )}
                
                <div className="mb-4">
                  <label className="block font-bold mb-2">Lataa oma kuva</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, 'backgroundImage')}
                    className="block w-full text-sm border-2 border-black p-2 font-mono"
                  />
                </div>
                
                {defaultImages.backgroundImages.length > 0 && (
                  <div>
                    <p className="font-bold mb-2">Valmiit kuvat:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {defaultImages.backgroundImages.map((imgUrl, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSelectDefaultImage(imgUrl, 'backgroundImage')}
                          className={`border-4 border-black p-1 hover:translate-x-1 hover:translate-y-1 transition-transform ${
                            cvData.content.cv_data.backgroundImage === imgUrl ? 'bg-yellow-300' : 'bg-white'
                          }`}
                        >
                          <img 
                            src={imgUrl} 
                            alt={`Background ${idx + 1}`} 
                            className="w-full h-20 object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ✅ CV PREVIEW */}
        <div className="bg-white border-4 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="relative md:h-[310mm] h-auto overflow-hidden">
            {renderTemplate()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditCVPage;