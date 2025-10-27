// app/edit-cover-letter/[id]/page.tsx - TÄYDELLINEN VERSIO
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { SaveIcon, ArrowLeftIcon, TrashIcon, Download, EyeIcon, PenIcon } from 'lucide-react';
import Header from '@/components/ui/Header';
import { Loader2 } from 'lucide-react';
import { fetchCoverLetterById, updateCoverLetter, deleteCoverLetter } from '@/services/coverLetterService-client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { HexColorPicker } from 'react-colorful';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';

interface CoverLetterStyles {
  mainColor: string;
  accentColor: string;
  textColor: string;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  textAlign: string;
  letterSpacing: number;
  padding: number;
  borderWidth: number;
  enableAccent: boolean;
  enableTopAccent: boolean;
  signatureStyle: string;
}

const fontOptions = [
  { value: '"Merriweather", serif', label: 'Merriweather' },
  { value: '"Open Sans", sans-serif', label: 'Open Sans' },
  { value: '"Roboto", sans-serif', label: 'Roboto' },
  { value: '"Playfair Display", serif', label: 'Playfair' },
  { value: '"Lato", sans-serif', label: 'Lato' },
  { value: '"Montserrat", sans-serif', label: 'Montserrat' },
  { value: '"Georgia", serif', label: 'Georgia' },
  { value: '"Times New Roman", serif', label: 'Times New Roman' },
];

export default function EditCoverLetterPage() {
  const params = useParams();
  const router = useRouter();
  const { getToken } = useAuth();
  const id = params?.id as string;
  const coverLetterRef = useRef<HTMLDivElement>(null);

  const [coverLetter, setCoverLetter] = useState<any>(null);
  const [editedContent, setEditedContent] = useState('');
  const [applicantInfo, setApplicantInfo] = useState<any>({});
  const [date, setDate] = useState(new Date().toLocaleDateString('fi-FI'));
  
  const [activeTab, setActiveTab] = useState('content');
  const [viewMode, setViewMode] = useState('edit');
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [styles, setStyles] = useState<CoverLetterStyles>({
    mainColor: '#3498db',
    accentColor: '#2980b9',
    textColor: '#333333',
    fontFamily: '"Merriweather", serif',
    fontSize: 16,
    lineHeight: 1.5,
    textAlign: 'left',
    letterSpacing: 0.2,
    padding: 20,
    borderWidth: 12,
    enableAccent: true,
    enableTopAccent: true,
    signatureStyle: 'script',
  });

  useEffect(() => {
    const loadCoverLetter = async () => {
      try {
        const token = await getToken({ template: 'supabase' });
        if (!token) throw new Error('No authentication token');
        
        const { data, error } = await fetchCoverLetterById(id, token);
        
        if (error) throw error;
        if (!data) throw new Error('Hakukirjettä ei löytynyt');
        
        setCoverLetter(data);
        setEditedContent(data.content?.body || data.ai_data?.html?.content || '');
        
        if (data.content?.applicant_info) {
          setApplicantInfo(data.content.applicant_info);
        }
        
        if (data.ai_data?.styles?.custom_styles) {
          try {
            const customStyles = JSON.parse(data.ai_data.styles.custom_styles);
            setStyles({ ...styles, ...customStyles });
          } catch (e) {
            console.warn('Could not parse custom styles');
          }
        }
      } catch (error) {
        console.error('Error loading cover letter:', error);
        setError('Hakukirjeen lataaminen epäonnistui');
        router.push('/my-cover-letters');
      }
    };

    if (id) loadCoverLetter();
  }, [id, getToken]);

  const handleSave = async () => {
    if (!coverLetter) return;

    setIsSaving(true);
    setError(null);

    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) throw new Error('No authentication token');

      const updatedData = {
        content: {
          ...coverLetter.content,
          body: editedContent,
          applicant_info: applicantInfo
        },
        ai_data: {
          ...coverLetter.ai_data,
          html: {
            ...coverLetter.ai_data.html,
            content: editedContent
          },
          styles: {
            ...coverLetter.ai_data.styles,
            main_style: generateCssFromStyles(),
            custom_styles: JSON.stringify(styles)
          }
        }
      };

      const { data, error } = await updateCoverLetter(id, updatedData, token);

      if (error) throw error;
      
      setCoverLetter(data);
      alert('Hakukirje tallennettu onnistuneesti!');
    } catch (error) {
      console.error('Error saving cover letter:', error);
      setError('Hakukirjeen tallennus epäonnistui');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Haluatko varmasti poistaa tämän hakukirjeen?')) return;

    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) throw new Error('No authentication token');

      const { error } = await deleteCoverLetter(id, token);
      if (error) throw error;
      
      alert('Hakukirje poistettu onnistuneesti!');
      router.push('/my-cover-letters');
    } catch (error) {
      console.error('Error deleting cover letter:', error);
      setError('Hakukirjeen poistaminen epäonnistui');
    }
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const combinedStyles = `
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&family=Merriweather:wght@300;400;700&family=Open+Sans:wght@300;400;600&family=Roboto:wght@300;400;500&family=Playfair+Display:wght@400;700&family=Lato:wght@300;400;700&family=Montserrat:wght@300;400;500&display=swap');
        
        body { 
          margin: 0; 
          padding: 0;
          background-color: white;
        }
        
        ${generateCssFromStyles()}
      `;

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>${combinedStyles}</style>
          </head>
          <body>
            <div class="cover-letter-container" style="position: relative; width: 210mm; min-height: 297mm; padding: ${styles.padding}mm;">
              ${styles.enableAccent ? `
                <div class="cover-letter-accent" style="
                  position: absolute;
                  top: 0;
                  left: 0;
                  width: ${styles.borderWidth}px;
                  height: 100%;
                  background: linear-gradient(to bottom, ${styles.mainColor}, ${styles.accentColor}, ${styles.mainColor});
                "></div>
              ` : ''}
              
              ${styles.enableTopAccent ? `
                <div class="cover-letter-top-accent" style="
                  position: absolute;
                  top: 0;
                  left: ${styles.enableAccent ? `${styles.borderWidth}px` : '0'};
                  right: 0;
                  height: 8px;
                  background: linear-gradient(to right, ${styles.mainColor}, #ede7f6);
                  opacity: 0.7
                "></div>
              ` : ''}
              
              <div style="margin-left: ${styles.enableAccent ? '20px' : '0'};">
                ${editedContent}
                
                <div class="signature-section" style="margin-top: 50px;">
                  <div style="font-size: 1rem; color: #555; margin-bottom: 8px;">
                  </div>
                  <div style="border-bottom: 2px solid ${styles.mainColor}; width: 230px; margin-bottom: 12px;"></div>
                  <div style="
                    font-family: ${styles.signatureStyle === 'script' ? "'Dancing Script', cursive" : styles.fontFamily};
                    font-size: ${styles.signatureStyle === 'script' ? '1.5rem' : '1rem'};
                    color: ${styles.textColor};
                  ">
                    ${applicantInfo.name || applicantInfo.full_name || 'Hakija'}
                  </div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;

      const response = await fetch('/api/generate-cover-letter-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ htmlContent: html, letterId: coverLetter.id }),
      });

      if (!response.ok) throw new Error('PDF generation failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hakukirje_${coverLetter.title || coverLetter.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('PDF generation failed:', error);
      setError('PDF:n luonti epäonnistui');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleInfoChange = (field: string, value: string) => {
    const fieldParts = field.split('.');
    if (fieldParts[0] === 'applicant_info') {
      setApplicantInfo({ ...applicantInfo, [fieldParts[1]]: value });
    } else if (field === 'date') {
      setDate(value);
    }
  };

  const generateCssFromStyles = () => {
    return `
      .cover-letter-container {
        font-family: ${styles.fontFamily};
        font-size: ${styles.fontSize}px;
        color: ${styles.textColor};
        line-height: ${styles.lineHeight};
        text-align: ${styles.textAlign};
        letter-spacing: ${styles.letterSpacing}px;
      }
      
      .cover-letter-content h1 {
        color: ${styles.textColor};
        border-bottom: 3px solid ${styles.mainColor};
        padding-bottom: 12px;
        margin-bottom: 30px;
        font-weight: 700;
      }
      
      .cover-letter-content p {
        margin-bottom: 16px;
        line-height: ${styles.lineHeight};
      }
    `;
  };

  const getJobTitle = () => {
    if (coverLetter?.content?.job_description) {
      const firstLine = coverLetter.content.job_description.split('\n')[0];
      return firstLine.substring(0, 60).trim();
    }
    return coverLetter?.title || 'Työhakemus';
  };

  if (!coverLetter) {
    return (
      <div className="min-h-screen">
        <Header isLoading />
        <div className="container mx-auto py-8 px-4 text-center pt-16">
          {error ? <div className="text-red-500">{error}</div> : <div>Ladataan...</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header isLoading />
      <main className="container mx-auto py-6 px-4 pt-20">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Muokkaa: {getJobTitle()}</h1>
          <div className="flex gap-2">
            <ToggleGroup type="single" value={viewMode} onValueChange={(v: any) => v && setViewMode(v)}>
              <ToggleGroupItem value="edit"><PenIcon className="h-4 w-4 mr-1" />Muokkaa</ToggleGroupItem>
              <ToggleGroupItem value="preview"><EyeIcon className="h-4 w-4 mr-1" />Esikatselu</ToggleGroupItem>
            </ToggleGroup>
            <Button onClick={handleDownloadPDF} disabled={isDownloading} variant="outline">
              {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Lataa PDF
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600">
              <SaveIcon className="mr-2 h-4 w-4" />{isSaving ? 'Tallennetaan...' : 'Tallenna'}
            </Button>
            <Button onClick={() => router.push('/my-cover-letters')} variant="outline">
              <ArrowLeftIcon className="mr-2 h-4 w-4" />Takaisin
            </Button>
            <Button onClick={handleDelete} variant="destructive">
              <TrashIcon className="mr-2 h-4 w-4" />Poista
            </Button>
          </div>
        </div>

        {error && <div className="mb-4 text-red-500">{error}</div>}

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-1/3">
            <div className="bg-white rounded-lg shadow-md p-6 mb-4">
              <h2 className="text-lg font-semibold mb-2">Työpaikkailmoitus:</h2>
              <div className="p-4 bg-gray-50 rounded max-h-96 overflow-y-auto text-sm">
                {coverLetter.content?.job_description || 'Ei saatavilla'}
              </div>
            </div>
            
            {viewMode === 'edit' && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="content">Sisältö</TabsTrigger>
                    <TabsTrigger value="appearance">Ulkoasu</TabsTrigger>
                    <TabsTrigger value="typography">Typografia</TabsTrigger>
                    <TabsTrigger value="applicant">Tiedot</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="content">
                    <textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="w-full p-4 border rounded-md"
                      rows={12}
                      placeholder="Muokkaa sisältöä..."
                    />
                  </TabsContent>
                  
                  <TabsContent value="appearance">
                    <div className="space-y-4">
                      <h3 className="font-medium">Värit</h3>
                      <div className="grid grid-cols-3 gap-2">
                        {['mainColor', 'accentColor', 'textColor'].map(color => (
                          <Popover key={color}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" style={{ backgroundColor: styles[color as keyof CoverLetterStyles] as string }} />
                            </PopoverTrigger>
                            <PopoverContent>
                              <HexColorPicker color={styles[color as keyof CoverLetterStyles] as string} onChange={(c) => setStyles({...styles, [color]: c})} />
                            </PopoverContent>
                          </Popover>
                        ))}
                      </div>
                      <div className="flex gap-4">
                        <label className="flex items-center">
                          <input type="checkbox" checked={styles.enableAccent} onChange={(e) => setStyles({...styles, enableAccent: e.target.checked})} className="mr-2" />
                          Vasen reuna
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" checked={styles.enableTopAccent} onChange={(e) => setStyles({...styles, enableTopAccent: e.target.checked})} className="mr-2" />
                          Yläreuna
                        </label>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="typography">
                    <div className="space-y-4">
                      <select value={styles.fontFamily} onChange={(e) => setStyles({...styles, fontFamily: e.target.value})} className="w-full p-2 border rounded">
                        {fontOptions.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                      </select>
                      <div>
                        <label className="text-sm">Koko ({styles.fontSize}px)</label>
                        <Slider value={[styles.fontSize]} min={12} max={24} onValueChange={(v) => setStyles({...styles, fontSize: v[0]})} />
                      </div>
                      <div>
                        <label className="text-sm">Riviväli ({styles.lineHeight})</label>
                        <Slider value={[styles.lineHeight * 10]} min={10} max={25} onValueChange={(v) => setStyles({...styles, lineHeight: v[0]/10})} />
                      </div>
                      <ToggleGroup type="single" value={styles.textAlign} onValueChange={(v: any) => v && setStyles({...styles, textAlign: v})}>
                        <ToggleGroupItem value="left"><AlignLeft className="h-4 w-4" /></ToggleGroupItem>
                        <ToggleGroupItem value="center"><AlignCenter className="h-4 w-4" /></ToggleGroupItem>
                        <ToggleGroupItem value="right"><AlignRight className="h-4 w-4" /></ToggleGroupItem>
                        <ToggleGroupItem value="justify"><AlignJustify className="h-4 w-4" /></ToggleGroupItem>
                      </ToggleGroup>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="applicant">
                    <div className="space-y-3">
                      <input type="text" value={applicantInfo.name || applicantInfo.full_name || ''} 
                        onChange={(e) => setApplicantInfo({...applicantInfo, name: e.target.value, full_name: e.target.value})} 
                        className="w-full p-2 border rounded" placeholder="Nimi" />
                      <input type="email" value={applicantInfo.email || ''} onChange={(e) => handleInfoChange('applicant_info.email', e.target.value)} 
                        className="w-full p-2 border rounded" placeholder="Email" />
                      <input type="tel" value={applicantInfo.phone || ''} onChange={(e) => handleInfoChange('applicant_info.phone', e.target.value)} 
                        className="w-full p-2 border rounded" placeholder="Puhelin" />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
          
          <div className="w-full lg:w-2/3">
            <div className="bg-white rounded-lg shadow-md p-6" style={{ minHeight: '842px' }}>
              <div style={{ fontFamily: styles.fontFamily, fontSize: `${styles.fontSize}px`, color: styles.textColor, lineHeight: styles.lineHeight, textAlign: styles.textAlign as any }}>
                <div dangerouslySetInnerHTML={{ __html: editedContent }} />
                <div style={{ marginTop: '50px' }}>
                  <div style={{ fontSize: '1rem', color: '#555', marginBottom: '8px' }}>Ystävällisin terveisin,</div>
                  <div style={{ borderBottom: `2px solid ${styles.mainColor}`, width: '230px', marginBottom: '12px' }} />
                  <div style={{ fontFamily: styles.signatureStyle === 'script' ? "'Dancing Script', cursive" : styles.fontFamily, fontSize: styles.signatureStyle === 'script' ? '1.5rem' : '1rem' }}>
                    {applicantInfo.name || applicantInfo.full_name || 'Hakija'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}