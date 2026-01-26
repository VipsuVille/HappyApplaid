// app/edit-cover-letter/[id]/page.tsx
// ✅ FINAL: Sidebar-sisältö valitsin lisätty

'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Loader2,
  Download,
  Palette,
  LayoutPanelLeft,
  AlignHorizontalJustifyCenter,
  User,
  Sparkles,
  X
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
  const letterId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [letterData, setLetterData] = useState<CoverLetter | null>(null);
  const [editedParagraphs, setEditedParagraphs] = useState<string[]>([]);

  // ✅ STYLE SETTINGS (header + sidebar sisältö)
  const [styleSettings, setStyleSettings] = useState<StyleSettings>({
    headerColor: 'rgb(181, 152, 79)', // Kultainen/pronssi oletus
    headerLayout: 'top',
    sidebarContent: 'contact', // Oletus: yhteystiedot
  });

  const letterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId) return;
    loadCoverLetter();
  }, [userId, letterId]);

  const loadCoverLetter = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) throw new Error('No authentication token');

      const response = await fetch(`/api/cover-letters/${letterId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to load cover letter');

      const data = await response.json();
      setLetterData(data.coverLetter);

      const content = data.coverLetter.content?.body || data.coverLetter.ai_data?.html?.content || '';
      const paragraphs = content.split('\n\n').filter((p: string) => p.trim());
      setEditedParagraphs(paragraphs);

      // ✅ Lataa tallennetut style-asetukset
      if (data.coverLetter.content?.headerColor) {
        setStyleSettings((prev) => ({
          ...prev,
          headerColor: data.coverLetter.content.headerColor,
        }));
      }
      if (data.coverLetter.content?.headerLayout) {
        setStyleSettings((prev) => ({
          ...prev,
          headerLayout: data.coverLetter.content.headerLayout,
        }));
      }
      if (data.coverLetter.content?.sidebarContent) {
        setStyleSettings((prev) => ({
          ...prev,
          sidebarContent: data.coverLetter.content.sidebarContent,
        }));
      }
    } catch (error) {
      console.error('Error loading cover letter:', error);
      setError('Hakukirjeen lataaminen epäonnistui');
    } finally {
      setLoading(false);
    }
  };

  const handleParagraphChange = (index: number, value: string) => {
    const updated = [...editedParagraphs];
    updated[index] = value;
    setEditedParagraphs(updated);
  };

  const handleSave = async () => {
    if (!letterData || !userId) return;

    setSaving(true);
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) throw new Error('No authentication token');

      const updatedContent = editedParagraphs.join('\n\n');

      const response = await fetch(`/api/cover-letters/${letterId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: {
            ...letterData.content,
            body: updatedContent,
            headerColor: styleSettings.headerColor,
            headerLayout: styleSettings.headerLayout,
            sidebarContent: styleSettings.sidebarContent,
          },
          ai_data: {
            ...letterData.ai_data,
            html: {
              ...letterData.ai_data?.html,
              content: updatedContent,
            },
          },
        }),
      });

      if (!response.ok) throw new Error('Failed to save changes');

      alert('✅ Muutokset tallennettu!');
    } catch (error) {
      console.error('Error saving:', error);
      alert('❌ Tallennus epäonnistui');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const response = await fetch('/api/generate-cover-letter-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ letterId }),
      });

      if (!response.ok) throw new Error('PDF generation failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hakukirje_${letterData?.title || 'muokattu'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('PDF download failed:', error);
      alert('PDF:n lataus epäonnistui');
    } finally {
      setDownloading(false);
    }
  };

  const resetStyles = () => {
    setStyleSettings({
      headerColor: 'rgb(181, 152, 79)',
      headerLayout: 'top',
      sidebarContent: 'contact',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030711] flex items-center justify-center">
        <div className="backdrop-blur-xl bg-[#1a1a1a]/70 border border-gray-800 rounded-2xl shadow-2xl p-8 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-lg font-bold text-gray-100">Ladataan hakukirjettä...</p>
        </div>
      </div>
    );
  }

  if (error || !letterData) {
    return (
      <div className="min-h-screen bg-[#030711] flex items-center justify-center p-4">
        <div className="backdrop-blur-xl bg-[#1a1a1a]/70 border border-gray-800 rounded-2xl shadow-2xl p-8 text-center max-w-md">
          <div className="h-16 w-16 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-100 mb-4">Virhe</h2>
          <p className="text-red-400 mb-6">{error || 'Hakukirjettä ei löytynyt'}</p>
          <Link
            href="/my-cover-letters"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
            Takaisin
          </Link>
        </div>
      </div>
    );
  }

  const coverLetterData = {
    name: letterData.content?.contactInfo?.name || letterData.ai_data?.name || 'Hakija',
    email: letterData.content?.contactInfo?.email || letterData.ai_data?.email || '',
    phone: letterData.content?.contactInfo?.phone || letterData.ai_data?.phone || '',
    location: letterData.content?.contactInfo?.location || letterData.ai_data?.location || '',
    jobTitle: letterData.content?.job_title || '',
    companyName: letterData.content?.company_name || '',
    title: letterData.title,
    content: editedParagraphs.join('\n\n'),
    keyHighlights: letterData.ai_data?.key_highlights || [],
    language: letterData.content?.language || 'finnish',
    style: (letterData.content?.style || 'professional') as 'professional' | 'casual' | 'creative',
    headerColor: styleSettings.headerColor,
    headerLayout: styleSettings.headerLayout,
    sidebarContent: styleSettings.sidebarContent,
  };

  return (
    <div className="min-h-screen bg-[#030711] text-[#e7e3dc]">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-[1800px] mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="mb-6 backdrop-blur-xl bg-[#1a1a1a]/70 border border-gray-800 rounded-2xl shadow-xl p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link
                href="/my-cover-letters"
                className="h-10 w-10 flex items-center justify-center rounded-xl bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-300" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent">
                  Muokkaa hakukirjettä
                </h1>
                <p className="text-sm text-gray-400 mt-1">{letterData.title}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleDownloadPDF}
                disabled={downloading}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50"
              >
                {downloading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Ladataan...</>
                ) : (
                  <><Download className="w-4 h-4" /> Lataa PDF</>
                )}
              </button>

              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50"
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Tallennetaan...</>
                ) : (
                  <><Save className="w-4 h-4" /> Tallenna</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ✅ STYLE CONTROLS */}
        <div className="mb-6 backdrop-blur-xl bg-[#1a1a1a]/70 border border-gray-800 rounded-2xl shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
              <Palette className="w-5 h-5 text-orange-400" />
              Ulkoasu
            </h2>
            <button
              onClick={resetStyles}
              className="text-xs text-gray-400 hover:text-orange-400 transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Palauta oletukset
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Header väri */}
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">Header-väri</label>
              <input
                type="color"
                value={styleSettings.headerColor.startsWith('rgb') 
                  ? '#B59850' 
                  : styleSettings.headerColor}
                onChange={(e) =>
                  setStyleSettings((prev) => ({ ...prev, headerColor: e.target.value }))
                }
                className="w-full h-10 rounded-lg border border-gray-700 bg-gray-800 cursor-pointer"
              />
            </div>

            {/* Layout */}
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">Layout</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setStyleSettings((prev) => ({ ...prev, headerLayout: 'top' }))}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                    styleSettings.headerLayout === 'top'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white'
                      : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                  }`}
                >
                  <AlignHorizontalJustifyCenter className="w-4 h-4" />
                  Vaaka
                </button>
                <button
                  onClick={() => setStyleSettings((prev) => ({ ...prev, headerLayout: 'left' }))}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                    styleSettings.headerLayout === 'left'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white'
                      : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                  }`}
                >
                  <LayoutPanelLeft className="w-4 h-4" />
                  Pysty
                </button>
              </div>
            </div>

            {/* ✅ UUSI: Sidebar/Header sisältö */}
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">Sivupalkin sisältö</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setStyleSettings((prev) => ({ ...prev, sidebarContent: 'contact' }))}
                  className={`flex-1 px-3 py-2 rounded-lg font-bold text-xs transition-all ${
                    styleSettings.sidebarContent === 'contact'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white'
                      : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                  }`}
                  title="Yhteystiedot"
                >
                  <User className="w-4 h-4 mx-auto" />
                </button>
                <button
                  onClick={() => setStyleSettings((prev) => ({ ...prev, sidebarContent: 'highlights' }))}
                  className={`flex-1 px-3 py-2 rounded-lg font-bold text-xs transition-all ${
                    styleSettings.sidebarContent === 'highlights'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white'
                      : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                  }`}
                  title="Vahvuudet"
                >
                  <Sparkles className="w-4 h-4 mx-auto" />
                </button>
                <button
                  onClick={() => setStyleSettings((prev) => ({ ...prev, sidebarContent: 'none' }))}
                  className={`flex-1 px-3 py-2 rounded-lg font-bold text-xs transition-all ${
                    styleSettings.sidebarContent === 'none'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white'
                      : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                  }`}
                  title="Ei mitään"
                >
                  <X className="w-4 h-4 mx-auto" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {styleSettings.sidebarContent === 'contact' && 'Näyttää yhteystiedot'}
                {styleSettings.sidebarContent === 'highlights' && 'Näyttää vahvuudet'}
                {styleSettings.sidebarContent === 'none' && 'Ei näytä mitään'}
              </p>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor */}
          <div className="backdrop-blur-xl bg-[#1a1a1a]/70 border border-gray-800 rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-gray-100 mb-4">Muokkaa sisältöä</h2>
            <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2">
              {editedParagraphs.map((paragraph, index) => (
                <div key={index}>
                  <label className="block text-sm font-bold text-gray-400 mb-2">
                    Kappale {index + 1}
                  </label>
                  <textarea
                    value={paragraph}
                    onChange={(e) => handleParagraphChange(index, e.target.value)}
                    className="w-full min-h-[120px] p-4 bg-gray-900/50 border border-gray-700 rounded-xl text-gray-100 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all resize-y"
                    style={{ lineHeight: '1.6' }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="backdrop-blur-xl bg-[#1a1a1a]/70 border border-gray-800 rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-gray-100 mb-4">Esikatselu</h2>
            <div
              className="relative w-full overflow-hidden bg-gray-900/20 rounded-xl"
              style={{
                height: '800px',
                boxShadow: 'inset 0 4px 6px -1px rgba(0, 0, 0, 0.3)',
              }}
            >
              <div className="absolute inset-0 overflow-y-auto flex justify-center py-4">
                <div className="transform scale-[0.70] origin-top">
                  <CoverLetterContainer
                    ref={letterRef}
                    data-template-type="standard"
                    className="shadow-lg bg-white"
                  >
                    <CoverLetterTemplate data={coverLetterData} isPdfPreview={false} isEditing={false} />
                  </CoverLetterContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}