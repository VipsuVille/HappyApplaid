// app/edit-cover-letter/[id]/page.tsx - TÄYDELLINEN ATS-OPTIMOITU VERSIO
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { SaveIcon, ArrowLeftIcon, TrashIcon, Download, EyeIcon, PenIcon, Sparkles, RefreshCw, AlertTriangle, CheckCircle2, Lightbulb } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { fetchCoverLetterById, updateCoverLetter, deleteCoverLetter } from '@/services/coverLetterService-client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { HexColorPicker } from 'react-colorful';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';
import ATSReport from '@/components/ats-raportti';

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

interface ATSInsight {
  type: 'missing_keyword' | 'improvement' | 'warning' | 'success';
  title: string;
  description: string;
  suggestion: string;
  autoFixAvailable: boolean;
  keywords?: string[];
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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isApplyingFix, setIsApplyingFix] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // ATS-optimointi
  const [atsInsights, setAtsInsights] = useState<ATSInsight[]>([]);
  const [currentATSScore, setCurrentATSScore] = useState<number>(0);
  const [showATSPanel, setShowATSPanel] = useState(true);
  
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

        // Lataa ATS-data jos saatavilla
        if (data.ai_data?.ats_optimization?.report) {
          setCurrentATSScore(data.ai_data.ats_optimization.report.keyword_match_score || 0);
          generateATSInsights(data);
        } else {
          // Jos ei ole ATS-dataa, analysoi nyt
          analyzeATS(data.content?.body || '');
        }
      } catch (error) {
        console.error('Error loading cover letter:', error);
        setError('Hakukirjeen lataaminen epäonnistui');
        router.push('/my-cover-letters');
      }
    };

    if (id) loadCoverLetter();
  }, [id, getToken]);

  // Generoi ATS-oivallukset tallennetusta datasta
  const generateATSInsights = (letterData: any) => {
    const atsData = letterData.ai_data?.ats_optimization?.report;
    if (!atsData) return;

    const insights: ATSInsight[] = [];

    // Puuttuvat avainsanat
    if (atsData.missing_keywords && atsData.missing_keywords.length > 0) {
      insights.push({
        type: 'missing_keyword',
        title: `${atsData.missing_keywords.length} puuttuvaa avainsanaa`,
        description: 'Nämä työpaikkailmoituksen avainsanat puuttuvat hakukirjeestäsi',
        suggestion: 'Lisää nämä avainsanat luonnollisesti tekstiin parantaaksesi ATS-pisteitäsi',
        autoFixAvailable: true,
        keywords: atsData.missing_keywords.slice(0, 5)
      });
    }

    // Parannus ehdotukset
    if (atsData.improvement_suggestions && atsData.improvement_suggestions.length > 0) {
      atsData.improvement_suggestions.forEach((suggestion: string) => {
        insights.push({
          type: 'improvement',
          title: 'Parannusehdotus',
          description: suggestion,
          suggestion: 'Tarkista ja korjaa manuaalisesti',
          autoFixAvailable: false
        });
      });
    }

    // ATS-pisteet matala
    if (atsData.keyword_match_score < 75) {
      insights.push({
        type: 'warning',
        title: 'ATS-pisteet alle tavoitteen',
        description: `Nykyinen pistemääräsi on ${atsData.keyword_match_score}%, tavoite on 75%+`,
        suggestion: 'Lisää puuttuvia avainsanoja ja paranna tekstin laatua',
        autoFixAvailable: true
      });
    } else {
      insights.push({
        type: 'success',
        title: 'Erinomaiset ATS-pisteet!',
        description: `Hakukirjeesi on ${atsData.keyword_match_score}% yhteensopiva`,
        suggestion: 'Hakukirjeesi läpäisee todennäköisesti ATS-järjestelmät',
        autoFixAvailable: false
      });
    }

    setAtsInsights(insights);
  };

  // Analysoi ATS-pisteet reaaliajassa
  const analyzeATS = async (content: string) => {
    if (!coverLetter?.content?.job_description) return;

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/analyze-ats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coverLetterContent: content,
          jobDescription: coverLetter.content.job_description
        })
      });

      if (!response.ok) throw new Error('ATS analysis failed');

      const data = await response.json();
      setCurrentATSScore(data.keyword_match_score);
      
      // Generoi insights analyysistä
      const insights: ATSInsight[] = [];
      
      if (data.missing_keywords?.length > 0) {
        insights.push({
          type: 'missing_keyword',
          title: `${data.missing_keywords.length} puuttuvaa avainsanaa`,
          description: 'Lisää nämä parantaaksesi ATS-pisteitä',
          suggestion: 'Klikkaa "Lisää automaattisesti"',
          autoFixAvailable: true,
          keywords: data.missing_keywords.slice(0, 5)
        });
      }

      setAtsInsights(insights);
    } catch (error) {
      console.error('ATS analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Automaattinen korjaus: Lisää puuttuvat avainsanat
  const applyAutoFix = async (insight: ATSInsight) => {
    if (insight.type !== 'missing_keyword' || !insight.keywords) return;

    setIsApplyingFix(true);
    try {
      const response = await fetch('/api/improve-ats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentContent: editedContent,
          missingKeywords: insight.keywords,
          jobDescription: coverLetter.content?.job_description
        })
      });

      if (!response.ok) throw new Error('Auto-fix failed');

      const data = await response.json();
      setEditedContent(data.improvedContent);
      
      // Päivitä ATS-pisteet
      await analyzeATS(data.improvedContent);
      
      alert('Avainsanat lisätty onnistuneesti! Tarkista tulokset.');
    } catch (error) {
      console.error('Auto-fix failed:', error);
      alert('Automaattinen korjaus epäonnistui. Yritä manuaalista muokkausta.');
    } finally {
      setIsApplyingFix(false);
    }
  };

  // Manuaalinen avainsanan lisäys
  const insertKeyword = (keyword: string) => {
    const textarea = document.querySelector('textarea[data-content-editor]') as HTMLTextAreaElement;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBefore = editedContent.substring(0, cursorPos);
    const textAfter = editedContent.substring(cursorPos);
    
    // Lisää avainsana kursorin kohtaan luonnollisessa kontekstissa
    const newContent = `${textBefore} ${keyword}${textAfter}`;
    setEditedContent(newContent);
    
    // Päivitä ATS-pisteet
    setTimeout(() => analyzeATS(newContent), 500);
  };

  const handleSave = async () => {
    if (!coverLetter) return;

    setIsSaving(true);
    setError(null);

    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) throw new Error('No authentication token');

      // Analysoi ATS ennen tallennusta
      await analyzeATS(editedContent);

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
          },
          ats_optimization: {
            ...coverLetter.ai_data?.ats_optimization,
            last_edited: new Date().toISOString(),
            current_score: currentATSScore
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

  // Render ATS Insight
  const renderATSInsight = (insight: ATSInsight, index: number) => {
    const iconMap = {
      missing_keyword: <AlertTriangle className="w-5 h-5 text-yellow-600" />,
      improvement: <Lightbulb className="w-5 h-5 text-blue-600" />,
      warning: <AlertTriangle className="w-5 h-5 text-orange-600" />,
      success: <CheckCircle2 className="w-5 h-5 text-green-600" />
    };

    const bgColorMap = {
      missing_keyword: 'bg-yellow-50 border-yellow-200',
      improvement: 'bg-blue-50 border-blue-200',
      warning: 'bg-orange-50 border-orange-200',
      success: 'bg-green-50 border-green-200'
    };

    return (
      <div key={index} className={`p-4 border rounded-lg mb-3 ${bgColorMap[insight.type]}`}>
        <div className="flex items-start gap-3">
          {iconMap[insight.type]}
          <div className="flex-1">
            <h4 className="font-semibold text-gray-800 mb-1">{insight.title}</h4>
            <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
            
            {insight.keywords && insight.keywords.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {insight.keywords.map((keyword, idx) => (
                  <button
                    key={idx}
                    onClick={() => insertKeyword(keyword)}
                    className="px-2 py-1 bg-white border border-gray-300 rounded text-xs hover:bg-gray-100 transition-colors"
                    title="Klikkaa lisätäksesi tekstiin"
                  >
                    {keyword}
                  </button>
                ))}
              </div>
            )}

            <p className="text-xs text-gray-500 italic mb-2">{insight.suggestion}</p>

            {insight.autoFixAvailable && (
              <Button
                size="sm"
                onClick={() => applyAutoFix(insight)}
                disabled={isApplyingFix}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isApplyingFix ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Korjataan...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-3 w-3" />
                    Lisää automaattisesti
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!coverLetter) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto py-8 px-4 text-center pt-16">
          {error ? <div className="text-red-500">{error}</div> : <div>Ladataan...</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto py-6 px-4 pt-20">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Muokkaa: {getJobTitle()}</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-sm font-semibold ${currentATSScore >= 75 ? 'text-green-600' : currentATSScore >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                ATS-pisteet: {currentATSScore}%
              </span>
              <button
                onClick={() => analyzeATS(editedContent)}
                disabled={isAnalyzing}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Analysoidaan...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3 h-3" />
                    Päivitä pisteet
                  </>
                )}
              </button>
            </div>
          </div>
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

        {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">{error}</div>}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Vasen paneeli: Työpaikkailmoitus + ATS-oivallukset */}
          <div className="w-full lg:w-1/3 space-y-4">
            {/* Työpaikkailmoitus */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-2">Työpaikkailmoitus:</h2>
              <div className="p-4 bg-gray-50 rounded max-h-60 overflow-y-auto text-sm">
                {coverLetter.content?.job_description || 'Ei saatavilla'}
              </div>
            </div>

            {/* ATS-raportti */}
            {coverLetter.ai_data?.ats_optimization?.report && (
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <ATSReport report={coverLetter.ai_data.ats_optimization.report} />
              </div>
            )}
            
            {/* ATS-oivallukset ja korjausehdotukset */}
            {showATSPanel && atsInsights.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    ATS-parannukset
                  </h2>
                  <button
                    onClick={() => setShowATSPanel(false)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Piilota
                  </button>
                </div>
                <div className="space-y-3">
                  {atsInsights.map((insight, idx) => renderATSInsight(insight, idx))}
                </div>
              </div>
            )}

            {!showATSPanel && (
              <button
                onClick={() => setShowATSPanel(true)}
                className="w-full p-3 bg-blue-50 border-2 border-blue-200 rounded-lg text-blue-700 hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Näytä ATS-parannukset ({atsInsights.length})
              </button>
            )}
            
            {/* Muokkaustyökalut */}
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
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-gray-700">
                        Muokkaa hakukirjeen sisältöä
                      </label>
                      <textarea
                        data-content-editor
                        value={editedContent}
                        onChange={(e) => {
                          setEditedContent(e.target.value);
                          // Auto-analyysi debounced
                          clearTimeout((window as any).atsAnalysisTimeout);
                          (window as any).atsAnalysisTimeout = setTimeout(() => {
                            analyzeATS(e.target.value);
                          }, 2000); // Analysoi 2 sekunnin jälkeen
                        }}
                        className="w-full p-4 border rounded-md font-mono text-sm"
                        rows={12}
                        placeholder="Muokkaa sisältöä..."
                      />
                      <p className="text-xs text-gray-500">
                        💡 Vinkki: Klikkaa avainsanoja yllä lisätäksesi ne kursorin kohdalle
                      </p>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="appearance">
                    <div className="space-y-4">
                      <h3 className="font-medium">Värit</h3>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { key: 'mainColor', label: 'Pääväri' },
                          { key: 'accentColor', label: 'Korostus' },
                          { key: 'textColor', label: 'Teksti' }
                        ].map(({ key, label }) => (
                          <div key={key}>
                            <label className="text-xs text-gray-600 mb-1 block">{label}</label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  className="w-full h-10"
                                  style={{ backgroundColor: styles[key as keyof CoverLetterStyles] as string }} 
                                />
                              </PopoverTrigger>
                              <PopoverContent>
                                <HexColorPicker 
                                  color={styles[key as keyof CoverLetterStyles] as string} 
                                  onChange={(c) => setStyles({...styles, [key]: c})} 
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        ))}
                      </div>
                      
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input 
                            type="checkbox" 
                            checked={styles.enableAccent} 
                            onChange={(e) => setStyles({...styles, enableAccent: e.target.checked})} 
                            className="mr-2" 
                          />
                          <span className="text-sm">Näytä vasen reunatehoste</span>
                        </label>
                        <label className="flex items-center">
                          <input 
                            type="checkbox" 
                            checked={styles.enableTopAccent} 
                            onChange={(e) => setStyles({...styles, enableTopAccent: e.target.checked})} 
                            className="mr-2" 
                          />
                          <span className="text-sm">Näytä yläreunatehoste</span>
                        </label>
                      </div>

                      {styles.enableAccent && (
                        <div>
                          <label className="text-sm">Reunan leveys ({styles.borderWidth}px)</label>
                          <Slider 
                            value={[styles.borderWidth]} 
                            min={8} 
                            max={20} 
                            onValueChange={(v) => setStyles({...styles, borderWidth: v[0]})} 
                          />
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="typography">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Fontti</label>
                        <select 
                          value={styles.fontFamily} 
                          onChange={(e) => setStyles({...styles, fontFamily: e.target.value})} 
                          className="w-full p-2 border rounded"
                        >
                          {fontOptions.map(f => (
                            <option key={f.value} value={f.value}>{f.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-sm">Fonttikoko ({styles.fontSize}px)</label>
                        <Slider 
                          value={[styles.fontSize]} 
                          min={12} 
                          max={20} 
                          onValueChange={(v) => setStyles({...styles, fontSize: v[0]})} 
                        />
                      </div>

                      <div>
                        <label className="text-sm">Riviväli ({styles.lineHeight.toFixed(1)})</label>
                        <Slider 
                          value={[styles.lineHeight * 10]} 
                          min={12} 
                          max={25} 
                          onValueChange={(v) => setStyles({...styles, lineHeight: v[0]/10})} 
                        />
                      </div>

                      <div>
                        <label className="text-sm">Kirjainväli ({styles.letterSpacing}px)</label>
                        <Slider 
                          value={[styles.letterSpacing * 10]} 
                          min={0} 
                          max={10} 
                          onValueChange={(v) => setStyles({...styles, letterSpacing: v[0]/10})} 
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Tasaus</label>
                        <ToggleGroup 
                          type="single" 
                          value={styles.textAlign} 
                          onValueChange={(v: any) => v && setStyles({...styles, textAlign: v})}
                        >
                          <ToggleGroupItem value="left"><AlignLeft className="h-4 w-4" /></ToggleGroupItem>
                          <ToggleGroupItem value="center"><AlignCenter className="h-4 w-4" /></ToggleGroupItem>
                          <ToggleGroupItem value="right"><AlignRight className="h-4 w-4" /></ToggleGroupItem>
                          <ToggleGroupItem value="justify"><AlignJustify className="h-4 w-4" /></ToggleGroupItem>
                        </ToggleGroup>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Allekirjoitustyyli</label>
                        <ToggleGroup 
                          type="single" 
                          value={styles.signatureStyle} 
                          onValueChange={(v: any) => v && setStyles({...styles, signatureStyle: v})}
                        >
                          <ToggleGroupItem value="script">Käsikirjoitus</ToggleGroupItem>
                          <ToggleGroupItem value="normal">Normaali</ToggleGroupItem>
                        </ToggleGroup>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="applicant">
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Nimi</label>
                        <input 
                          type="text" 
                          value={applicantInfo.name || applicantInfo.full_name || ''} 
                          onChange={(e) => setApplicantInfo({
                            ...applicantInfo, 
                            name: e.target.value, 
                            full_name: e.target.value
                          })} 
                          className="w-full p-2 border rounded" 
                          placeholder="Etunimi Sukunimi" 
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Sähköposti</label>
                        <input 
                          type="email" 
                          value={applicantInfo.email || ''} 
                          onChange={(e) => handleInfoChange('applicant_info.email', e.target.value)} 
                          className="w-full p-2 border rounded" 
                          placeholder="nimi@email.com" 
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Puhelinnumero</label>
                        <input 
                          type="tel" 
                          value={applicantInfo.phone || ''} 
                          onChange={(e) => handleInfoChange('applicant_info.phone', e.target.value)} 
                          className="w-full p-2 border rounded" 
                          placeholder="+358 40 123 4567" 
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Sijainti</label>
                        <input 
                          type="text" 
                          value={applicantInfo.location || ''} 
                          onChange={(e) => handleInfoChange('applicant_info.location', e.target.value)} 
                          className="w-full p-2 border rounded" 
                          placeholder="Helsinki, Suomi" 
                        />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
          
          {/* Oikea paneeli: Esikatselu */}
          <div className="w-full lg:w-2/3">
            <div className="bg-white rounded-lg shadow-md p-6" style={{ minHeight: '842px' }}>
              <div 
                ref={coverLetterRef}
                style={{ 
                  fontFamily: styles.fontFamily, 
                  fontSize: `${styles.fontSize}px`, 
                  color: styles.textColor, 
                  lineHeight: styles.lineHeight, 
                  textAlign: styles.textAlign as any,
                  letterSpacing: `${styles.letterSpacing}px`
                }}
              >
                {/* Otsikko */}
                <h1 style={{
                  color: styles.textColor,
                  borderBottom: `3px solid ${styles.mainColor}`,
                  paddingBottom: '12px',
                  marginBottom: '30px',
                  fontWeight: 700
                }}>
                  {getJobTitle()}
                </h1>

                {/* Sisältö */}
                <div 
                  className="cover-letter-content"
                  dangerouslySetInnerHTML={{ __html: editedContent }} 
                />
                
                {/* Allekirjoitus */}
                <div style={{ marginTop: '50px' }}>
                  <div style={{ 
                    fontSize: '1rem', 
                    color: '#555', 
                    marginBottom: '8px' 
                  }}>
                    Ystävällisin terveisin,
                  </div>
                  <div style={{ 
                    borderBottom: `2px solid ${styles.mainColor}`, 
                    width: '230px', 
                    marginBottom: '12px' 
                  }} />
                  <div style={{ 
                    fontFamily: styles.signatureStyle === 'script' 
                      ? "'Dancing Script', cursive" 
                      : styles.fontFamily, 
                    fontSize: styles.signatureStyle === 'script' ? '1.5rem' : '1rem',
                    color: styles.textColor 
                  }}>
                    {applicantInfo.name || applicantInfo.full_name || 'Hakija'}
                  </div>
                </div>
              </div>

              {/* ATS Score indicator at bottom */}
              <div className="mt-6 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Viimeisin analyysi: {new Date().toLocaleTimeString('fi-FI')}
                  </span>
                  <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    currentATSScore >= 75 
                      ? 'bg-green-100 text-green-700' 
                      : currentATSScore >= 50 
                        ? 'bg-yellow-100 text-yellow-700' 
                        : 'bg-red-100 text-red-700'
                  }`}>
                    ATS: {currentATSScore}%
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