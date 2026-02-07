// app/create-cv/page.tsx - COMPLETE VERSION WITH VALIDATION
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Sparkles, Zap, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGeneration, GenerationQuestion } from '@/context/GenerationContext';
import { validateProfile } from '@/lib/profileValidation';
import ProfileValidationBanner from '@/components/ProfileValidationBanner';

export default function CreateCVPage() {
  const { user } = useUser();
  const router = useRouter();
  
  const {
    cvState,
    startGeneration,
    setQuestions,
    setAnswer,
    completeGeneration,
    failGeneration,
    cancelGeneration,
    resetState,
    isGenerating,
  } = useGeneration();

  // Local modal state
  const [showQuestionsModal, setShowQuestionsModal] = useState(false);
  
  // ✅ LOCAL STATE kysymyksille (välittömästi käytettävissä)
  const [localQuestions, setLocalQuestions] = useState<GenerationQuestion[]>([]);
  const [localAnswers, setLocalAnswers] = useState<Record<string, string>>({});
  
  // ✅ Pre-filled vastaukset user_responses taulusta
  const [preFilled, setPreFilled] = useState<Record<string, boolean>>({});

  const [selectedTemplate, setSelectedTemplate] = useState<'simple' | 'technical' | 'professional'>('simple');
  const [selectedLanguage, setSelectedLanguage] = useState<'finnish' | 'english'>('finnish');
  const [useATS, setUseATS] = useState(false);
  const [jobPosting, setJobPosting] = useState('');
  const [skipConfirmation, setSkipConfirmation] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingViolations, setPendingViolations] = useState<any[]>([]);

  // ✅ PROFILE VALIDATION
  const profileValidation = useMemo(() => {
    if (!profileData) return null;
    return validateProfile(profileData);
  }, [profileData]);

  // ✅ CLEANUP: Reset CV state kun komponentti mountataan
  useEffect(() => {
    console.log('🧹 CV page mounted - resetting CV state');
    resetState('cv');
    window.scrollTo(0, 0); // Scroll to top
  }, []);

  // ✅ TIMEOUT PROTECTION: 60s timeout
  useEffect(() => {
    if (!isGenerating) return;
    
    const timeoutId = setTimeout(() => {
      if (isGenerating && cvState.stage !== 'complete') {
        console.error('⏰ Generation timeout - resetting state');
        failGeneration('Generointi kesti liian kauan (timeout)');
        toast.error('Generointi kesti liian kauan. Yritä uudelleen.');
      }
    }, 60000); // 60s
    
    return () => clearTimeout(timeoutId);
  }, [isGenerating, cvState.stage]);

  // Ladataan profiili
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      try {
        const res = await fetch(`/api/user-profile/${user.id}`);
        const data = await res.json();

        if (data.success && data.profile) {
          setProfileData(data.profile);
        } else {
          toast.error('Täytä ensin profiilisi!');
          setTimeout(() => router.push('/profile'), 2000);
        }
      } catch (error) {
        console.error('Profile load error:', error);
        toast.error('Profiilin lataus epäonnistui');
      } finally {
        setIsLoadingProfile(false);
      }
    };

    loadProfile();
  }, [user, router]);

  // ✅ HELPER: Hae tallennetut vastaukset user_responses taulusta
  const fetchSavedResponses = async () => {
    try {
      const res = await fetch('/api/user-responses?context=cv_generation&limit=100');
      const data = await res.json();
      
      if (data.success && data.responses) {
        // Muunna array mapiksi: question_text -> answer
        const savedMap: Record<string, string> = {};
        data.responses.forEach((r: any) => {
          savedMap[r.question_text] = r.answer;
        });
        return savedMap;
      }
    } catch (error) {
      console.error('Error fetching saved responses:', error);
    }
    return {};
  };

  // ✅ HELPER: Tallenna vastaus user_responses tauluun
  const saveResponse = async (questionText: string, answer: string, category: string) => {
    try {
      await fetch('/api/user-responses/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText,
          answer,
          category,
          context: 'cv_generation',
          jobTitle: null
        })
      });
    } catch (error) {
      console.error('Error saving response:', error);
    }
  };

  // ✅ KORJATTU: Submit-funktio modalille
  const handleSubmitQuestions = async () => {
    console.log('📝 Submitting answers:', localAnswers);
    
    // Tarkista että kaikki kysymykset on vastattu
    const unansweredQuestions = localQuestions.filter(
      (q: GenerationQuestion) => !localAnswers[q.id]?.trim()
    );

    if (unansweredQuestions.length > 0) {
      toast.error(`Vastaa kaikkiin kysymyksiin (${unansweredQuestions.length} puuttuu)`);
      return;
    }

    // ✅ TALLENNA VASTAUKSET user_responses tauluun
    for (const q of localQuestions) {
      const answer = localAnswers[q.id];
      if (answer && !preFilled[q.id]) { // Tallenna vain uudet vastaukset
        await saveResponse(q.question, answer, q.category || 'other');
      }
    }

    // Sulje modaali
    setShowQuestionsModal(false);
    
    // ✅ ANNA HETKINEN ENNEN UUTTA GENEROINTIA
    setTimeout(() => {
      handleGenerateCV(localAnswers);
    }, 300);
  };

  // Main generation function
  const handleGenerateCV = async (finalAnswers?: Record<string, string>) => {
    // ✅ VALIDOI PROFIILI
    if (!profileValidation?.isValid) {
      toast.error('Täydennä profiilisi ensin!');
      return;
    }

    if (!user || !profileData) {
      toast.error('Täytä ensin profiilisi!');
      router.push('/profile');
      return;
    }

    try {
      // ✅ HAE TALLENNETUT VASTAUKSET
      const savedResponses = await fetchSavedResponses();
      
      const currentAnswers = finalAnswers || localAnswers;
      const hasAnswers = Object.keys(currentAnswers).length > 0;

      if (!hasAnswers) {
        console.log('🚀 Starting generation (type: cv)');
        startGeneration('cv', {
          templateType: selectedTemplate,
          language: selectedLanguage
        });
      }

      // ✅ PARSE JSON ARRAYS - TURVALLINEN VERSIO
      const parseJsonField = (field: any): any[] => {
        if (field == null) return [];
        if (Array.isArray(field)) return field;
        if (typeof field === 'string') {
          if (field.trim() === '') return [];
          try {
            const parsed = JSON.parse(field);
            return Array.isArray(parsed) ? parsed : [];
          } catch (e) {
            return [];
          }
        }
        return [];
      };

      // ✅ CONVERT ARRAY TO STRING - TURVALLINEN VERSIO
      const arrayToString = (field: any): string => {
        if (field == null) return '';
        if (typeof field === 'string') return field;
        if (Array.isArray(field)) {
          return field
            .filter(item => item != null && item !== '')
            .join(', ');
        }
        return '';
      };

      // ✅ HELPER: Muunna arrayt API:n odottamaan string-muotoon
      const formatEducationForApi = (education: any): string => {
        if (!education) return '';
        const eduArray = Array.isArray(education) ? education : 
                         typeof education === 'string' ? JSON.parse(education) : [];
        
        return eduArray
          .filter((edu: any) => edu.school && edu.degree)
          .map((edu: any) => {
            const period = edu.isOngoing ? `${edu.year} - Kesken` : edu.year;
            return `${edu.degree}, ${edu.school}${period ? ` (${period})` : ""}`;
          })
          .join("\n");
      };

      const formatWorkExperienceForApi = (workExperience: any): string => {
        if (!workExperience) return '';
        const workArray = Array.isArray(workExperience) ? workExperience :
                          typeof workExperience === 'string' ? JSON.parse(workExperience) : [];
        
        return workArray
          .filter((work: any) => work.company || work.position)
          .map((work: any) => {
            let formatted = "";
            if (work.position && work.company) {
              formatted = `${work.position}, ${work.company}`;
            } else if (work.position) {
              formatted = work.position;
            } else if (work.company) {
              formatted = work.company;
            }

            if (work.duration) {
              formatted += ` (${work.duration})`;
            }

            if (work.description) {
              formatted += `\n${work.description}`;
            }

            return formatted;
          })
          .join("\n\n");
      };

      const requestBody = {
        profileData: {
          name: profileData?.name,
          email: profileData?.email,
          phone: profileData?.phone,
          location: profileData?.location,
          jobTitle: profileData?.job_title || profileData?.jobTitle,
          
          // ✅ STRING-MUOTO (sama kuin types/index.ts)
          education: formatEducationForApi(profileData?.education),
          workExperience: formatWorkExperienceForApi(profileData?.work_experience),
          skills: arrayToString(profileData?.skills),
          languages: arrayToString(profileData?.languages),
          hobbies: profileData?.hobbies || '',
          
          // Persoonallisuus
          workingStyle: profileData?.working_style || '',
          problemSolving: profileData?.problem_solving || '',
          energySources: profileData?.energy_sources || '',
          uniqueStrength: profileData?.unique_strength || '',
          learningStyle: profileData?.learning_style || '',
          teamRole: profileData?.team_role || '',
          valuesExample: profileData?.values_example || '',
          superpower: profileData?.superpower || '',
          
          // Storyt
          careerGoals: profileData?.career_goals || '',
          bestProjectExample: profileData?.best_project_example || '',
          failureLesson: profileData?.failure_lesson || '',
          
          // Kuvat
          profileImage: profileData?.profile_image || profileData?.profileImage,
          backgroundImage: profileData?.background_image || profileData?.backgroundImage,
        },
        cvType: selectedTemplate,
        language: selectedLanguage === 'english' ? 'english' : 'finnish',
        jobPosting: useATS ? jobPosting : undefined,
        enableRAG: false,
        answeredQuestions: hasAnswers 
          ? Object.entries(currentAnswers).map(([id, answer]) => ({
              id,
              question: localQuestions.find((q: GenerationQuestion) => q.id === id)?.question || '',
              answer
            }))
          : [],
        skipQuestions: hasAnswers,
        skipConfirmation,
      };

      console.log('📤 Sending CV generation request:', {
        cvType: requestBody.cvType,
        language: requestBody.language,
        hasJobPosting: !!requestBody.jobPosting,
        hasAnswers: hasAnswers,
        answerCount: requestBody.answeredQuestions?.length || 0,
        profileData: {
          hasName: !!requestBody.profileData.name,
          hasEmail: !!requestBody.profileData.email,
          educationType: typeof requestBody.profileData.education,
          educationLength: requestBody.profileData.education?.length || 0,
          workExpType: typeof requestBody.profileData.workExperience,
          workExpLength: requestBody.profileData.workExperience?.length || 0,
          skillsType: typeof requestBody.profileData.skills,
        }
      });

      const response = await fetch('/api/generate-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      // Handle questions
      if (result.needsMoreInfo && result.questions?.length > 0) {
        console.log('❓ AI kysyy lisäkysymyksiä:', result.questions.length);
        console.log('📝 Kysymykset:', result.questions);
        
        // ✅ PRE-FILL: Täytä vastaukset jos löytyvät user_responses taulusta
        const preFilledAnswers: Record<string, string> = {};
        const preFilledFlags: Record<string, boolean> = {};
        
        result.questions.forEach((q: GenerationQuestion) => {
          const saved = savedResponses[q.question];
          if (saved) {
            preFilledAnswers[q.id] = saved;
            preFilledFlags[q.id] = true;
            console.log(`✅ Pre-filled answer for: ${q.question.substring(0, 50)}...`);
          }
        });
        
        // ✅ TALLENNA LOCAL STATE (välittömästi käytettävissä)
        setLocalQuestions(result.questions);
        setLocalAnswers(preFilledAnswers);
        setPreFilled(preFilledFlags);
        
        // ✅ TALLENNA MYÖS CONTEXT (taustalle)
        setQuestions(result.questions);
        
        // ✅ AVAA MODAALI
        setShowQuestionsModal(true);
        
        return;
      }

      // Handle confirmation
      if (result.needsConfirmation && !skipConfirmation) {
        console.log('⚠️ Tarvitaan käyttäjän vahvistus');
        setPendingViolations(result.violations);
        setShowConfirmation(true);
        cancelGeneration();
        return;
      }

      // Success
      if (result.success && result.cvId) {
        console.log('✅ CV luotu onnistuneesti:', result.cvId);
        completeGeneration(result.cvId);
        toast.success('CV luotu! Siirrytään muokkaukseen...');
        setTimeout(() => router.push(`/edit-cv/${result.cvId}`), 500);
      } else {
        throw new Error(result.error || 'CV generointi epäonnistui');
      }

    } catch (error: any) {
      console.error('CV generation error:', error);
      failGeneration(error.message || 'Generointi epäonnistui');
      toast.error(error.message || 'Jotain meni pieleen');
    }
  };

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-700 via-gray-800 to-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-700 via-gray-800 to-slate-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        
        {/* HEADER */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black bg-gradient-to-r from-orange-400 via-amber-500 to-orange-500 bg-clip-text text-transparent mb-4">
            Luo uusi CV
          </h1>
          <p className="text-gray-300 text-lg">
            Valitse tyyli, kieli ja anna AI:n tehdä loput
          </p>
        </div>

        {/* ✅ PROFILE VALIDATION BANNER */}
        {profileValidation && !profileValidation.isValid && (
          <div className="mb-8">
            <ProfileValidationBanner 
              validation={profileValidation}
              context="cv"
              language="fi"
            />
          </div>
        )}

        {/* TEMPLATE SELECTION */}
        <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl mb-8">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-orange-400" />
            Valitse CV-tyyli
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { 
                id: 'simple', 
                name: 'Simple', 
                desc: 'Selkeä ja minimalistinen',
                emoji: '📄',
                features: ['Perus layout', 'Helppolukuinen', 'ATS-ystävällinen']
              },
              { 
                id: 'technical', 
                name: 'Technical', 
                desc: 'IT-alan ammattilaisille',
                emoji: '💻',
                features: ['Tekninen tyyli', 'Projektilistaukset', 'Skill bars']
              },
              { 
                id: 'professional', 
                name: 'Professional', 
                desc: 'Liikemaailmaan',
                emoji: '👔',
                features: ['Premium design', 'Taustaväri', 'Profiilkuva']
              }
            ].map((template) => (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template.id as any)}
                className={`group p-6 rounded-2xl border-2 transition-all text-left ${
                  selectedTemplate === template.id
                    ? 'bg-gradient-to-br from-orange-500 to-amber-600 border-orange-400 shadow-xl scale-105'
                    : 'bg-white/5 border-white/10 hover:border-orange-400/50 hover:scale-102'
                }`}
              >
                <div className="text-4xl mb-3">{template.emoji}</div>
                <h3 className="font-bold text-xl text-white mb-2">{template.name}</h3>
                <p className="text-sm text-gray-300 mb-3">{template.desc}</p>
                <ul className="space-y-1">
                  {template.features.map((f, i) => (
                    <li key={i} className="text-xs text-gray-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-orange-400" />
                      {f}
                    </li>
                  ))}
                </ul>
              </button>
            ))}
          </div>
        </div>

        {/* LANGUAGE SELECTION */}
        <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">Kieli</h2>
          
          <div className="grid grid-cols-2 gap-4">
            {[
              { id: 'finnish', name: '🇫🇮 Suomi' },
              { id: 'english', name: '🇬🇧 English' }
            ].map((lang) => (
              <button
                key={lang.id}
                onClick={() => setSelectedLanguage(lang.id as any)}
                className={`p-4 rounded-2xl border-2 transition-all ${
                  selectedLanguage === lang.id
                    ? 'bg-gradient-to-br from-orange-500 to-amber-600 border-orange-400'
                    : 'bg-white/5 border-white/10 hover:border-orange-400/50'
                }`}
              >
                <span className="font-bold text-lg text-white">{lang.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ATS OPTIMIZATION */}
        <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl mb-8">
          <div className="flex items-start gap-4 mb-4">
            <input
              type="checkbox"
              checked={useATS}
              onChange={(e) => setUseATS(e.target.checked)}
              className="w-5 h-5 rounded mt-1"
              id="ats-checkbox"
            />
            <div className="flex-1">
              <label htmlFor="ats-checkbox" className="text-2xl font-bold text-white cursor-pointer block mb-2">
                ATS-optimointi 🎯
              </label>
              <p className="text-sm text-gray-400">
                Optimoi CV työpaikkailmoituksen perusteella. AI analysoi ilmoituksen ja räätälöi CV:n sen mukaan.
              </p>
            </div>
          </div>
          
          {useATS && (
            <div className="mt-4">
              <label className="block text-sm font-bold text-gray-300 mb-2">
                Liitä työpaikkailmoitus tähän:
              </label>
              <textarea
                value={jobPosting}
                onChange={(e) => setJobPosting(e.target.value)}
                placeholder="Kopioi koko työpaikkailmoitus tähän (tehtävänkuvaus, vaatimukset, toiveet...)"
                className="w-full h-40 bg-black/30 border border-white/10 rounded-2xl p-4 text-white placeholder-gray-500 focus:border-orange-400/50 focus:outline-none transition-all resize-none"
              />
              <p className="text-xs text-gray-500 mt-2">
                💡 Mitä enemmän tietoa annat, sitä paremmin AI voi optimoida CV:n
              </p>
            </div>
          )}
        </div>

        {/* GENERATE BUTTON */}
        <Button
          onClick={() => handleGenerateCV()}
          disabled={isGenerating || !profileValidation?.isValid}
          className="w-full h-16 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xl font-black rounded-2xl shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin" />
                Generoidaan...
              </div>
              {cvState.progress > 0 && (
                <span className="text-xs font-normal opacity-80">
                  {cvState.progress}% valmis
                </span>
              )}
            </div>
          ) : !profileValidation?.isValid ? (
            <>
              <AlertCircle className="w-6 h-6 mr-2" />
              Täydennä profiili ensin
            </>
          ) : (
            <>
              <Zap className="w-6 h-6 mr-2" />
              Luo CV
            </>
          )}
        </Button>

        {/* Info text */}
        <p className="text-center text-sm text-gray-400 mt-4">
          {isGenerating 
            ? 'Tämä voi kestää 30-60 sekuntia...'
            : !profileValidation?.isValid
            ? 'Täydennä puuttuvat profiilitiedot aloittaaksesi'
            : 'AI luo sinulle ammattimaisen CV:n muutamassa sekunnissa'
          }
        </p>
      </div>

      {/* ✅ KYSYMYSMODAALI - ISOMPI JA PAREMPI */}
      {showQuestionsModal && localQuestions.length > 0 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowQuestionsModal(false)} />
          
          <div className="relative bg-gradient-to-br from-gray-900/95 via-slate-900/95 to-gray-900/95 backdrop-blur-2xl rounded-3xl border-2 border-orange-400/30 shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-600 p-6">
              <h2 className="text-2xl font-black text-white mb-2">
                Tarkennetaanko hieman?
              </h2>
              <p className="text-white/90">
                AI haluaa varmistaa, että CV:stä tulee mahdollisimman vakuuttava.
              </p>
            </div>

            {/* Questions */}
            <div className="p-6 space-y-6 max-h-[50vh] overflow-y-auto">
              {localQuestions.map((q: GenerationQuestion) => (
                <div key={q.id} className="space-y-3 group">
                  <label className="text-sm font-bold text-gray-200 block">
                    {q.question}
                    {preFilled[q.id] && (
                      <span className="ml-2 text-xs text-green-400 font-normal">
                        ✓ Tallennettu vastaus
                      </span>
                    )}
                  </label>
                  {q.why && (
                    <div className="flex gap-2 items-start text-xs text-gray-500">
                      <span className="text-orange-500/50">Miksi:</span>
                      <span>{q.why}</span>
                    </div>
                  )}
                  <textarea
                    className="w-full bg-black/40 border border-gray-800 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-all min-h-[120px] resize-none"
                    value={localAnswers[q.id] || ""}
                    onChange={(e) => {
                      setLocalAnswers(prev => ({
                        ...prev,
                        [q.id]: e.target.value
                      }));
                      setAnswer(q.id, e.target.value);
                    }}
                    placeholder="Vastaa tähän..."
                  />
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex gap-4 p-6 border-t border-white/10">
              <Button 
                variant="ghost" 
                className="flex-1 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 h-14 font-bold"
                onClick={() => setShowQuestionsModal(false)}
              >
                Sulje
              </Button>
              <Button 
                className="flex-[2] bg-orange-500 hover:bg-orange-600 text-white rounded-xl h-14 font-black"
                onClick={handleSubmitQuestions}
              >
                Valmista tuli
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ CONFIRMATION MODAL - Guardian violations */}
      {showConfirmation && pendingViolations.length > 0 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" />
          
          <div className="relative bg-gradient-to-br from-gray-900/95 via-slate-900/95 to-gray-900/95 backdrop-blur-2xl rounded-3xl border-2 border-red-400/30 shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            
            <div className="bg-gradient-to-r from-red-500 to-orange-600 p-6">
              <h2 className="text-2xl font-black text-white mb-2 flex items-center gap-2">
                <AlertCircle className="w-6 h-6" />
                Vahvista tiedot
              </h2>
              <p className="text-white/90">
                CV sisältää tietoja joita ei löydy profiilista
              </p>
            </div>

            <div className="p-6 space-y-4 max-h-[50vh] overflow-y-auto">
              {pendingViolations.map((v, i) => (
                <div key={i} className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-bold text-red-400 uppercase">
                      {v.type}
                    </span>
                    <span className="text-xs text-gray-400">{v.severity}</span>
                  </div>
                  <p className="text-sm text-gray-200 mb-2">{v.content}</p>
                  <p className="text-xs text-gray-400">{v.reason}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-4 p-6 border-t border-white/10">
              <Button
                variant="ghost"
                className="flex-1 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 h-12 font-bold"
                onClick={() => {
                  setShowConfirmation(false);
                  setPendingViolations([]);
                }}
              >
                Peruuta
              </Button>
              <Button
                className="flex-[2] bg-orange-500 hover:bg-orange-600 text-white rounded-xl h-12 font-black"
                onClick={() => {
                  setShowConfirmation(false);
                  setSkipConfirmation(true);
                  handleGenerateCV();
                }}
              >
                Hyväksy ja jatka
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}