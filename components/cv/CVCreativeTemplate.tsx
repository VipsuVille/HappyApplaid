import React from 'react';
import { CVTemplateProps } from '@/types'; // Tuo yhteinen tyyppi täältä
import { MapPin, Phone, Mail, Globe } from 'lucide-react'; // Asenna lucide-react jos ei ole

const CreativeCVTemplate: React.FC<CVTemplateProps> = ({
  data,
  aiData,
  isEditing,
  showEditControls,
  editMode,
  onContentChange,
}) => {
  if (!data) return <div>Ladataan...</div>;

  // 1. Kuvien logiikka (sama kuin Simple-templatessa)
  const getBackgroundImage = () => {
    const bg = aiData?.background_image || aiData?.background_image_url;
    if (bg?.startsWith('http') || bg?.startsWith('data:')) return bg;
    return null;
  };

  const bgImage = getBackgroundImage();

  // 2. Profiilikuva
  const profileImg = data.profileImage || aiData?.profile_image;

  return (
    <div
      className="creative-cv-wrapper bg-white shadow-2xl"
      style={{
        width: '210mm',
        height: '297mm',
        display: 'flex',
        overflow: 'hidden',
        fontFamily: "'Poppins', sans-serif", // Varmista fontin lataus
      }}
    >
      {/* --- VASEN PALKKI (Tumma / Kuva) --- */}
      <div
        className="left-sidebar text-white relative"
        style={{
          width: '75mm',
          backgroundColor: '#1a1a1a', // Fallback väri
          backgroundImage: bgImage ? `url(${bgImage})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Overlay jotta teksti erottuu taustakuvan päältä */}
        <div className="absolute inset-0 bg-black/70" />

        <div className="relative z-10 p-8 h-full flex flex-col">
          
          {/* Profiilikuva */}
          <div className="mb-8 flex justify-center">
            <div className="w-40 h-40 rounded-full border-4 border-white/20 overflow-hidden shadow-xl">
              {profileImg ? (
                <img src={profileImg} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-white/10 flex items-center justify-center text-4xl font-bold">
                  {aiData?.profile_initials || 'CV'}
                </div>
              )}
            </div>
          </div>

          {/* Yhteystiedot */}
          <div className="space-y-4 text-sm">
            <h3 className="uppercase tracking-widest text-white/50 border-b border-white/20 pb-2 mb-4 font-bold">
              Yhteystiedot
            </h3>
            
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-emerald-400" />
              {isEditing ? (
                <input 
                  value={data.phone || ''} 
                  onChange={(e) => onContentChange?.('phone', e.target.value)}
                  className="bg-transparent border-b border-white/20 w-full focus:outline-none text-white"
                />
              ) : <span>{data.phone}</span>}
            </div>

            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-emerald-400" />
              {isEditing ? (
                <input 
                  value={data.email || ''} 
                  onChange={(e) => onContentChange?.('email', e.target.value)}
                  className="bg-transparent border-b border-white/20 w-full focus:outline-none text-white"
                />
              ) : <span>{data.email}</span>}
            </div>

            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-emerald-400" />
              {isEditing ? (
                <input 
                  value={data.location || ''} 
                  onChange={(e) => onContentChange?.('location', e.target.value)}
                  className="bg-transparent border-b border-white/20 w-full focus:outline-none text-white"
                />
              ) : <span>{data.location}</span>}
            </div>
          </div>

          {/* Taidot (AI Data) */}
          <div className="mt-10">
             <h3 className="uppercase tracking-widest text-white/50 border-b border-white/20 pb-2 mb-4 font-bold">
              Taidot
            </h3>
            <div 
              className="text-sm text-gray-300 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: aiData?.html?.skills_section || '' }} 
            />
          </div>
        </div>
      </div>

      {/* --- OIKEA PUOLI (Vaalea / Sisältö) --- */}
      <div className="main-content flex-1 p-10 bg-white text-gray-800 flex flex-col">
        
        {/* Header: Nimi ja titteli */}
        <div className="mb-10">
          {isEditing ? (
            <input
              value={data.name || ''}
              onChange={(e) => onContentChange?.('name', e.target.value)}
              className="text-5xl font-black uppercase tracking-tighter w-full mb-2 text-gray-900 border-none focus:ring-0 p-0"
              placeholder="NIMI"
            />
          ) : (
            <h1 className="text-5xl font-black uppercase tracking-tighter mb-2 text-gray-900">
              {data.name}
            </h1>
          )}

          {isEditing ? (
            <input
              value={data.title || ''}
              onChange={(e) => onContentChange?.('title', e.target.value)}
              className="text-xl font-medium text-emerald-600 uppercase tracking-widest w-full border-none focus:ring-0 p-0"
              placeholder="AMMATTINIMIKE"
            />
          ) : (
            <h2 className="text-xl font-medium text-emerald-600 uppercase tracking-widest">
              {data.title}
            </h2>
          )}
        </div>

        {/* Profiiliteksti */}
        <div className="mb-8">
           <h3 className="font-bold text-gray-900 uppercase tracking-wide mb-3 flex items-center gap-2">
             <span className="w-8 h-1 bg-gray-900 block"></span> Profiili
           </h3>
           {isEditing ? (
             <textarea 
               value={aiData?.personal_description || ''}
               onChange={(e) => onContentChange?.('personalDescription', e.target.value as any)}
               className="w-full h-32 p-2 border border-gray-200 rounded text-gray-600 leading-relaxed"
             />
           ) : (
             <p className="text-gray-600 leading-relaxed">
               {aiData?.personal_description}
             </p>
           )}
        </div>

        {/* Työkokemus (HTML renderöinti) */}
        <div className="flex-1">
            <h3 className="font-bold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
             <span className="w-8 h-1 bg-gray-900 block"></span> Työkokemus
           </h3>
           <div 
             className="prose prose-sm max-w-none text-gray-600"
             dangerouslySetInnerHTML={{ __html: aiData?.html?.experience_section || '' }}
           />
        </div>

      </div>
    </div>
  );
};

export default CreativeCVTemplate;