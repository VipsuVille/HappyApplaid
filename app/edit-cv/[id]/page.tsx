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
import { getDefaultImages } from '@/lib/imageUtils'; // ✅ LISÄTTY IMPORT
import { Button } from '@/components/ui/button';
import { 
  ImageIcon, 
  TextIcon, 
  SaveIcon, 
  ArrowLeftIcon, 
  TrashIcon
} from 'lucide-react';
import { toast } from 'sonner';

const EditCVPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { userId, getToken } = useAuth();
 // edit-cv/[id]/page.tsx - LISÄÄ TÄMÄ

const [originalBackgroundImage, setOriginalBackgroundImage] = useState<string | null>(null);
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

  // ✅ KORJATTU CV:n lataus
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

  // ✅ Realtime-päivitykset
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

  // ✅ Lataa default-kuvat
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



// Tallenna alkuperäinen taustakuva kun CV ladataan
useEffect(() => {
  if (cvData?.content?.ai_data?.background_image && !originalBackgroundImage) {
    setOriginalBackgroundImage(cvData.content.ai_data.background_image);
  }
}, [cvData]);

// Lisää funktio taustakuvan palauttamiseen
const handleRestoreOriginalBackground = () => {
  if (originalBackgroundImage) {
    setCvData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        content: {
          ...prev.content,
          ai_data: {
            ...prev.content.ai_data,
            background_image: originalBackgroundImage,
          },
        },
      };
    });
    alert('Alkuperäinen taustakuva palautettu!');
  }
};

// Muuta handleSelectDefaultImage
// UUSI KOODI (edit-cv/[id]/page.tsx)
const handleSelectDefaultImage = async (imageUrl: string, field: string) => {
  try {
    // ✅ 1. HAE UUSI TOKEN (jos vanha vanhentunut)
    const token = await getToken({ template: "supabase" });
    
    if (!token) {
      // ✅ 2. JOS TOKEN PUUTTUU, NÄYTÄ VIESTI
      console.error("❌ No token available");
      toast.error("Kirjautuminen vanhentunut - päivitä sivu");
      return; // ← PYSÄYTÄ TÄHÄN
    }

    // ✅ 3. VASTA NYT VAIHDA KUVA (token on validi)
    if (field === 'backgroundImage') {
      setCvData(prev => {
  if (!prev) return prev; // ← Palauttaa null
  return {
    ...prev,
    content: {
      ...prev.content,
      ai_data: {
        ...prev.content.ai_data,
        background_image: imageUrl,
      },
    },
  };
  });
      toast.success("Taustakuva vaihdettu!");
    }
  } catch (error) {
    // ✅ 4. KÄSITTELE VIRHEET
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
      alert('Kuvan koko on liian suuri. Maksimikoko on 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      handleContentChange(field, reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // ✅ KORJATTU handleSave
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
      alert('CV tallennettu onnistuneesti!');

    } catch (error) {
      console.error('❌ Error saving CV:', error);
      alert('CV:n tallentaminen epäonnistui: ' + (error instanceof Error ? error.message : 'Tuntematon virhe'));
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ KORJATTU handleDelete - LISÄTTY TOKEN
  const handleDelete = async () => {
    if (!confirm('Haluatko varmasti poistaa tämän CV:n?')) return;
    if (!userId) return;

    try {
      console.log('🗑️ Deleting CV...');

      // ✅ HAE TOKEN
      const token = await getToken({ template: "supabase" });
      
      if (!token) {
        throw new Error("Autentikaatiotoken puuttuu");
      }

      // ✅ LISÄTTY TOKEN PARAMETRIKSI
      await deleteCV(id, userId, token);

      console.log('✅ CV deleted successfully');
      alert('CV poistettu onnistuneesti!');
      router.push('/my-cvs');

    } catch (error) {
      console.error('❌ Error deleting CV:', error);
      alert('CV:n poistaminen epäonnistui: ' + (error instanceof Error ? error.message : 'Tuntematon virhe'));
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg mb-2">Ladataan CV:tä...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center py-8">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => router.push('/my-cvs')}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
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
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">CV:tä ei löytynyt</p>
          <button
            onClick={() => router.push('/my-cvs')}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Palaa omiin CV:hin
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header and action buttons */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h1 className="text-xl md:text-2xl font-bold mb-4 md:mb-0">Muokkaa CV:tä</h1>
        <div className="flex flex-wrap gap-2 md:gap-4">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            <SaveIcon className="mr-2 h-4 w-4" />
            {isSaving ? 'Tallennetaan...' : 'Tallenna muutokset'}
          </Button>
          <Button
            onClick={() => router.push('/my-cvs')}
            variant="outline"
            className="border-gray-300"
          >
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Takaisin CV-listaan
          </Button>
          <Button
            onClick={handleDelete}
            variant="destructive"
          >
            <TrashIcon className="mr-2 h-4 w-4" />
            Poista CV
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <ul className="flex flex-wrap -mb-px text-sm font-medium text-center text-gray-500">
          <li className="mr-2">
            <button
              className={`inline-flex items-center p-4 border-b-2 rounded-t-lg ${
                selectedTab === 'content' ? 'text-blue-600 border-blue-600' : 'border-transparent hover:text-gray-600 hover:border-gray-300'
              }`}
              onClick={() => setSelectedTab('content')}
            >
              <TextIcon className="mr-2 h-4 w-4" />
              Sisältö
            </button>
          </li>
          <li className="mr-2">
            <button
              className={`inline-flex items-center p-4 border-b-2 rounded-t-lg ${
                selectedTab === 'images' ? 'text-blue-600 border-blue-600' : 'border-transparent hover:text-gray-600 hover:border-gray-300'
              }`}
              onClick={() => setSelectedTab('images')}
            >
              <ImageIcon className="mr-2 h-4 w-4" />
              Kuvat
            </button>
          </li>
        </ul>
      </div>

      {/* Images tab */}
      {selectedTab === 'images' && cvData && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Profile image section */}
          <div className="p-4 border rounded-lg">
            <h3 className="text-lg font-medium mb-3">Profiilikuva</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Lataa oma profiilikuva
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageChange(e, 'profileImage')}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
              />
            </div>
            
            {defaultImages.profileImages.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Tai valitse valmiista kuvista:</p>
                <div className="grid grid-cols-3 gap-2">
                  {defaultImages.profileImages.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectDefaultImage(imgUrl, 'profileImage')}
                      className={`relative p-1 border-2 rounded-lg ${
                        cvData.content.cv_data.profileImage === imgUrl ? 'border-blue-500' : 'border-transparent'
                      }`}
                    >
                      <img 
                        src={imgUrl} 
                        alt={`Default profile ${idx + 1}`} 
                        className="w-full h-auto rounded-full"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Background image section */}
          <div className="p-4 border rounded-lg">
            <h3 className="text-lg font-medium mb-3">Taustakuva</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Lataa oma taustakuva
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageChange(e, 'backgroundImage')}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
              />
            </div>
            
            {defaultImages.backgroundImages.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Tai valitse valmiista kuvista:</p>
                <div className="grid grid-cols-3 gap-2">
                  {defaultImages.backgroundImages.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectDefaultImage(imgUrl, 'backgroundImage')}
                      className={`relative p-1 border-2 rounded-lg ${
                        cvData.content.cv_data.backgroundImage === imgUrl ? 'border-blue-500' : 'border-transparent'
                      }`}
                    >
                      <img 
                        src={imgUrl} 
                        alt={`Default background ${idx + 1}`} 
                        className="w-full h-20 object-cover rounded"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CV preview with edit controls */}
      <div 
        className="relative md:h-[310mm] h-auto w-max p-8 md:p-0 ml-3 mr-3 md:ml-0 md:mr-0 md:w-full overflow-hidden rounded-lg shadow-inner" 
        style={{ 
          boxShadow: 'inset 0 4px 6px -1px rgba(0, 0, 0, 0.1), inset 0 -4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}
      >
        {renderTemplate()}
      </div>
    </div>
  );
};

export default EditCVPage;