// app/edit-cover-letter/[id]/page.tsx - ✅ WYSIWYG INLINE EDITOR
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
  Type,
  AlignLeft,
  Maximize2,
  Edit3,
  Check,
  X as XIcon
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
  fontSize: number; // 9-14pt
  lineHeight: number; // 1.4-2.0
  padding: number; // 30-70px
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
  const [editedContent, setEditedContent] = useState('');
  
  // ✅ Inline editing state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isEditingContent, setIsEditingContent] = useState(false);

  const [styleSettings, setStyleSettings] = useState<StyleSettings>({
    headerColor: 'rgb(181, 152, 79)',
    headerLayout: 'top',
    sidebarContent: 'contact',
    fontSize: 11,
    lineHeight: 1.8,
    padding: 50,
  });

  const [showToolbar, setShowToolbar] = useState(false);
  const letterRef = useRef<HTMLDivElement>(null);
  const contentEditRef = useRef<HTMLTextAreaElement>(null);

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
      setEditedContent(content);
      setEditedName(data.coverLetter.content?.contactInfo?.name || data.coverLetter.ai_data?.name || 'Hakija');

      // Load saved styles
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
      if (data.coverLetter.content?.fontSize) {
        setStyleSettings((prev) => ({
          ...prev,
          fontSize: data.coverLetter.content.fontSize,
        }));
      }
      if (data.coverLetter.content?.lineHeight) {
        setStyleSettings((prev) => ({
          ...prev,
          lineHeight: data.coverLetter.content.lineHeight,
        }));
      }
      if (data.coverLetter.content?.padding) {
        setStyleSettings((prev) => ({
          ...prev,
          padding: data.coverLetter.content.padding,
        }));
      }
    } catch (error) {
      console.error('Error loading cover letter:', error);
      setError('Hakukirjeen lataaminen epäonnistui');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!letterData || !userId) return;

    setSaving(true);
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) throw new Error('No authentication token');

      const response = await fetch(`/api/cover-letters/${letterId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: {
            ...letterData.content,
            body: editedContent,
            contactInfo: {
              ...letterData.content?.contactInfo,
              name: editedName,
            },
            headerColor: styleSettings.headerColor,
            headerLayout: styleSettings.headerLayout,
            sidebarContent: styleSettings.sidebarContent,
            fontSize: styleSettings.fontSize,
            lineHeight: styleSettings.lineHeight,
            padding: styleSettings.padding,
          },
          ai_data: {
            ...letterData.ai_data,
            name: editedName,
            html: {
              ...letterData.ai_data?.html,
              content: editedContent,
            },
          },
        }),
      });

      if (!response.ok) throw new Error('Failed to save changes');

      alert('✅ Muutokset tallennettu!');
      setIsEditingName(false);
      setIsEditingContent(false);
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
    name: editedName,
    email: letterData.content?.contactInfo?.email || letterData.ai_data?.email || '',
    phone: letterData.content?.contactInfo?.phone || letterData.ai_data?.phone || '',
    location: letterData.content?.contactInfo?.location || letterData.ai_data?.location || '',
    jobTitle: letterData.content?.job_title || '',
    companyName: letterData.content?.company_name || '',
    title: letterData.title,
    content: editedContent,
    keyHighlights: letterData.ai_data?.key_highlights || [],
    language: letterData.content?.language || 'finnish',
    style: (letterData.content?.style || 'professional') as 'professional' | 'casual' | 'creative',
    headerColor: styleSettings.headerColor,
    headerLayout: styleSettings.headerLayout,
    sidebarContent: styleSettings.sidebarContent,
    fontSize: styleSettings.fontSize,
    lineHeight: styleSettings.lineHeight,
    padding: styleSettings.padding,
  };

  return (
    <div className="min-h-screen bg-[#030711] text-[#e7e3dc]">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto p-4 md:p-8">
        
        {/* ✅ MINIMAL HEADER */}
        <div className="mb-6 backdrop-blur-xl bg-[#1a1a1a]/70 border border-gray-800 rounded-2xl shadow-xl p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                href="/my-cover-letters"
                className="h-10 w-10 flex items-center justify-center rounded-xl bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-300" />
              </Link>
              <div>
                <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent">
                  Muokkaa hakukirjettä
                </h1>
                <p className="text-sm text-gray-400 mt-1">{letterData.title}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleDownloadPDF}
                disabled={downloading}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50"
              >
                {downloading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Ladataan...</>
                ) : (
                  <><Download className="w-4 h-4" /> PDF</>
                )}
              </button>

              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 text-sm bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50"
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

        {/* ✅ FLOATING TOOLBAR (näkyy vain kun hover preview) */}
        {showToolbar && (
          <div className="fixed top-24 right-8 z-50 backdrop-blur-xl bg-[#1a1a1a]/90 border border-gray-700 rounded-2xl shadow-2xl p-4 w-64 animate-in slide-in-from-right duration-300">
            <h3 className="text-sm font-bold text-gray-100 mb-3 flex items-center gap-2">
              <Type className="w-4 h-4 text-orange-400" />
              Muotoilu
            </h3>

            {/* Font Size */}
            <div className="mb-3">
              <label className="text-xs text-gray-400 mb-1 block">Fonttikoko</label>
              <input
                type="range"
                min="9"
                max="14"
                step="0.5"
                value={styleSettings.fontSize}
                onChange={(e) => setStyleSettings((prev) => ({ ...prev, fontSize: parseFloat(e.target.value) }))}
                className="w-full"
              />
              <div className="text-xs text-gray-500 text-right">{styleSettings.fontSize}pt</div>
            </div>

            {/* Line Height */}
            <div className="mb-3">
              <label className="text-xs text-gray-400 mb-1 block">Riviväli</label>
              <input
                type="range"
                min="1.4"
                max="2.0"
                step="0.1"
                value={styleSettings.lineHeight}
                onChange={(e) => setStyleSettings((prev) => ({ ...prev, lineHeight: parseFloat(e.target.value) }))}
                className="w-full"
              />
              <div className="text-xs text-gray-500 text-right">{styleSettings.lineHeight.toFixed(1)}</div>
            </div>

            {/* Padding */}
            <div className="mb-3">
              <label className="text-xs text-gray-400 mb-1 block">Marginaalit</label>
              <input
                type="range"
                min="30"
                max="70"
                step="5"
                value={styleSettings.padding}
                onChange={(e) => setStyleSettings((prev) => ({ ...prev, padding: parseInt(e.target.value) }))}
                className="w-full"
              />
              <div className="text-xs text-gray-500 text-right">{styleSettings.padding}px</div>
            </div>

            {/* Header Color */}
            <div className="mb-3">
              <label className="text-xs text-gray-400 mb-1 block">Header-väri</label>
              <input
                type="color"
                value={styleSettings.headerColor.startsWith('rgb') ? '#B59850' : styleSettings.headerColor}
                onChange={(e) => setStyleSettings((prev) => ({ ...prev, headerColor: e.target.value }))}
                className="w-full h-8 rounded-lg border border-gray-700 bg-gray-800 cursor-pointer"
              />
            </div>

            {/* Layout Quick Switch */}
            <div className="mb-3">
              <label className="text-xs text-gray-400 mb-1 block">Layout</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setStyleSettings((prev) => ({ ...prev, headerLayout: 'top' }))}
                  className={`flex-1 px-2 py-1 text-xs rounded ${
                    styleSettings.headerLayout === 'top'
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  Vaaka
                </button>
                <button
                  onClick={() => setStyleSettings((prev) => ({ ...prev, headerLayout: 'left' }))}
                  className={`flex-1 px-2 py-1 text-xs rounded ${
                    styleSettings.headerLayout === 'left'
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  Pysty
                </button>
              </div>
            </div>

            {/* Sidebar Content */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Sisältö</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setStyleSettings((prev) => ({ ...prev, sidebarContent: 'contact' }))}
                  className={`flex-1 px-2 py-1 text-xs rounded ${
                    styleSettings.sidebarContent === 'contact'
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  Yhteys
                </button>
                <button
                  onClick={() => setStyleSettings((prev) => ({ ...prev, sidebarContent: 'highlights' }))}
                  className={`flex-1 px-2 py-1 text-xs rounded ${
                    styleSettings.sidebarContent === 'highlights'
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  Vahv.
                </button>
                <button
                  onClick={() => setStyleSettings((prev) => ({ ...prev, sidebarContent: 'none' }))}
                  className={`flex-1 px-2 py-1 text-xs rounded ${
                    styleSettings.sidebarContent === 'none'
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  Tyhjä
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ✅ WYSIWYG PREVIEW */}
        <div
          className="relative backdrop-blur-xl bg-[#1a1a1a]/70 border border-gray-800 rounded-2xl shadow-xl p-6"
          onMouseEnter={() => setShowToolbar(true)}
          onMouseLeave={() => setShowToolbar(false)}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-orange-400" />
              Live Preview
              <span className="text-xs text-gray-500">(hover elementtiä muokataksesi)</span>
            </h2>
          </div>

          <div
            className="relative w-full overflow-hidden bg-gray-900/20 rounded-xl"
            style={{
              height: '900px',
              boxShadow: 'inset 0 4px 6px -1px rgba(0, 0, 0, 0.3)',
            }}
          >
            <div className="absolute inset-0 overflow-y-auto flex justify-center py-4">
              
              {/* ✅ INLINE NAME EDITOR */}
              {isEditingName ? (
                <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 bg-gray-900 border border-orange-500 rounded-lg p-4 shadow-2xl">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white mb-2 w-64"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsEditingName(false)}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm flex items-center justify-center gap-1"
                    >
                      <Check className="w-4 h-4" /> OK
                    </button>
                    <button
                      onClick={() => {
                        setEditedName(letterData.content?.contactInfo?.name || letterData.ai_data?.name || 'Hakija');
                        setIsEditingName(false);
                      }}
                      className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm"
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : null}

              {/* ✅ INLINE CONTENT EDITOR */}
              {isEditingContent ? (
                <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 bg-gray-900 border border-orange-500 rounded-lg p-4 shadow-2xl w-[600px]">
                  <textarea
                    ref={contentEditRef}
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="w-full h-[400px] px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white mb-2 resize-none"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsEditingContent(false)}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm flex items-center justify-center gap-1"
                    >
                      <Check className="w-4 h-4" /> Valmis
                    </button>
                    <button
                      onClick={() => {
                        setEditedContent(letterData.content?.body || letterData.ai_data?.html?.content || '');
                        setIsEditingContent(false);
                      }}
                      className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm"
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="transform scale-[0.75] origin-top">
                {/* ✅ Clickable overlay for editing */}
                <div className="relative">
                  <CoverLetterContainer
                    ref={letterRef}
                    data-template-type="standard"
                    className="shadow-lg bg-white"
                  >
                    <CoverLetterTemplate data={coverLetterData} isPdfPreview={false} isEditing={false} />
                  </CoverLetterContainer>

                  {/* ✅ Edit triggers overlays */}
                  <button
                    onClick={() => setIsEditingContent(true)}
                    className="absolute top-[200px] right-4 bg-orange-500/80 hover:bg-orange-600 text-white p-2 rounded-full shadow-lg transition-all"
                    title="Muokkaa sisältöä"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ✅ QUICK TIPS */}
          <div className="mt-4 text-xs text-gray-500 flex items-center gap-2">
            <AlignLeft className="w-3 h-3" />
            <span>Hover hakukirjeen yli nähdäksesi muotoilutyökalut →</span>
          </div>
        </div>
      </div>
    </div>
  );
}