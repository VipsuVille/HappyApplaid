"use client";
import React, { useState, useRef, useEffect } from "react";
import { UserFormData, AIData, EditMode } from "@/types";

interface TechnicalCVTemplateProps {
  data: UserFormData;
  aiData: AIData;
  isEditing: boolean;
  showEditControls?: boolean;
  editMode?: EditMode | null;
  onContentChange?: (field: keyof UserFormData, value: any) => void;
  onUpdate?: (field: string, value: any) => void;
  profileImage?: string;
  backgroundImage?: string;
}

const TechnicalCVTemplate: React.FC<TechnicalCVTemplateProps> = ({
  data,
  aiData,
  isEditing,
  showEditControls,
  editMode,
  onContentChange,
  onUpdate,
  profileImage,
  backgroundImage
}) => {
  const [skillsTop, setSkillsTop] = useState(0);
  
  // ✅ REFS JOKAISELLE EDITABLE-KENTÄLLE - estää cursorin hyppimisen
  const contentRefs = useRef<Map<string, string>>(new Map());

  // ✅ KORJATTU: handleInput ei päivitä statea jos value ei ole muuttunut
  const handleInput = (path: string, e: React.FormEvent<HTMLElement>) => {
    if (!isEditing || !onUpdate) return;
    
    const newValue = e.currentTarget.innerText;
    const currentValue = contentRefs.current.get(path);
    
    // Vältä turhia päivityksiä ja cursorin hyppimistä
    if (newValue === currentValue) return;
    
    contentRefs.current.set(path, newValue);
    onUpdate(path, newValue);
  };

  // ✅ ALUSTA REFS KUN DATA MUUTTUU
  useEffect(() => {
    contentRefs.current.clear();
  }, [data, aiData]);

  // ✅ LISTAN ITEMIN MUOKKAUS
  const handleListItemInput = (path: string, index: number, e: React.FormEvent<HTMLElement>) => {
    if (!isEditing || !onUpdate) return;
    
    const newValue = e.currentTarget.innerText;
    const fullPath = `${path}.${index}`;
    const currentValue = contentRefs.current.get(fullPath);
    
    if (newValue === currentValue) return;
    
    contentRefs.current.set(fullPath, newValue);
    onUpdate(fullPath, newValue);
  };

  /* ============================================================
     IMAGE HANDLING
  ============================================================ */

  const isValidImage = (src?: string | null) => {
    if (!src) return false;
    const s = String(src).trim();
    return (
      s !== "" &&
      !s.includes("cv_files/default") &&
      (s.startsWith("http://") ||
        s.startsWith("https://") ||
        s.startsWith("data:image"))
    );
  };

  const getProfileImage = (): string | null => {
    const sources = [
      profileImage,
      (data as any)?.profile_image,
      data?.profileImage,
      (data as any)?.photo,
      aiData?.profile_image,
      (aiData?.html as any)?.profile_image,
    ];

    for (const src of sources) {
      if (!isValidImage(src)) continue;
      return String(src).trim();
    }
    return null;
  };

  const getBackgroundImage = (): string | null => {
    const sources = [
      backgroundImage,
      (data as any)?.background_image,
      data?.backgroundImage,
      aiData?.background_image,
      aiData?.background_image_url,
      (aiData?.html as any)?.background_image,
    ];

    for (const src of sources) {
      if (!isValidImage(src)) continue;
      return String(src).trim();
    }
    return null;
  };

  const profileImg = getProfileImage();
  const bgImage = getBackgroundImage();

  /* ============================================================
     AI CONTENT
  ============================================================ */

  const getAIContent = (field: keyof AIData): string => {
    let content = aiData?.[field];

    if (!content && aiData?.html) {
      content = aiData.html[field as keyof typeof aiData.html];
    }

    if (typeof content === "string" && content.trim()) {
      if (content.toLowerCase().includes("error generating")) return "";
      if (content.trim().length < 20) return "";
      return content;
    }
    return "";
  };

  /* ============================================================
     PARSE SKILLS - KORJATTU DATA-HAULLE
  ============================================================ */

  const parseSkills = (): { category: string; items: string[] }[] => {
    // ✅ KÄYTÄ ENSISIJAISESTI data.skills (joka on jo parsittu array)
    if (data?.skills && Array.isArray(data.skills) && data.skills.length > 0) {
      // Jos skills on array of strings
      if (typeof data.skills[0] === 'string') {
        return [{ category: "Skills", items: data.skills as string[] }];
      }
      // Jos skills on array of objects
      return data.skills as { category: string; items: string[] }[];
    }
    
    const skillsHTML = getAIContent("skills_section");
    
    if (!skillsHTML) {
      const skillsText = data?.skills || "";
      if (!skillsText || typeof skillsText !== 'string') return [];
      
      const skills = skillsText.split(',').map(s => s.trim()).filter(Boolean);
      return [{ category: "Skills", items: skills }];
    }

    const categories: { category: string; items: string[] }[] = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(skillsHTML, 'text/html');
    
    const sections = doc.querySelectorAll('h3, h4, strong');
    sections.forEach((heading) => {
      const category = heading.textContent?.trim() || 'Skills';
      const items: string[] = [];
      
      let nextElement = heading.nextElementSibling;
      while (nextElement && nextElement.tagName === 'UL') {
        nextElement.querySelectorAll('li').forEach(li => {
          const text = li.textContent?.trim();
          if (text) items.push(text);
        });
        nextElement = nextElement.nextElementSibling;
      }
      
      if (items.length > 0) {
        categories.push({ category, items });
      }
    });

    if (categories.length === 0) {
      const lines = skillsHTML.replace(/<[^>]+>/g, '').split('\n').filter(l => l.trim());
      if (lines.length > 0) {
        categories.push({ category: 'Skills', items: lines });
      }
    }

    return categories;
  };

  /* ============================================================
     PARSE WORK EXPERIENCE
  ============================================================ */

  const parseWorkExperience = (): Array<{
    title: string;
    company: string;
    period: string;
    achievements: string[];
  }> => {
    // ✅ KÄYTÄ ENSISIJAISESTI data.experience
    if (data?.experience && Array.isArray(data.experience) && data.experience.length > 0) {
      return data.experience.map((exp: any) => ({
        title: exp.title || exp.position || 'Position',
        company: exp.company || 'Company',
        period: exp.period || exp.duration || '',
        achievements: Array.isArray(exp.bullets) ? exp.bullets : 
                     Array.isArray(exp.achievements) ? exp.achievements : 
                     [exp.description].filter(Boolean)
      }));
    }
    
    const expHTML = getAIContent("experience_section");
    
    if (!expHTML) {
      try {
        const rawExp = data?.work_experience || (data as any)?.workExperience;
        if (!rawExp) return [];
        
        const parsed = typeof rawExp === 'string' ? JSON.parse(rawExp) : rawExp;
        if (!Array.isArray(parsed)) return [];
        
        return parsed.map((job: any) => ({
          title: job.position || 'Position',
          company: job.company || 'Company',
          period: job.duration || '',
          achievements: [
            job.description,
            job.biggestAchievement,
            job.whatYouLearned,
            job.howYourStrengthShowed
          ].filter(Boolean).map(text => text.trim())
        }));
      } catch (e) {
        console.error('Failed to parse work_experience:', e);
        return [];
      }
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(expHTML, 'text/html');
    const jobs: Array<{
      title: string;
      company: string;
      period: string;
      achievements: string[];
    }> = [];

    const jobDivs = doc.querySelectorAll('.job, .work-item, .experience-item');
    
    if (jobDivs.length > 0) {
      jobDivs.forEach(jobDiv => {
        const h4 = jobDiv.querySelector('h4');
        const titleText = h4?.textContent?.trim() || '';
        const [title, company] = titleText.split(' - ').map(s => s.trim());
        
        const dateP = jobDiv.querySelector('.date, p[class*="date"]');
        const period = dateP?.textContent?.trim() || '';
        
        const achievements: string[] = [];
        jobDiv.querySelectorAll('ul li').forEach(li => {
          const text = li.textContent?.trim();
          if (text) achievements.push(text);
        });
        
        if (title || company) {
          jobs.push({
            title: title || 'Position',
            company: company || 'Company',
            period,
            achievements
          });
        }
      });
    } else {
      const allH4 = doc.querySelectorAll('h4');
      allH4.forEach(h4 => {
        const titleText = h4.textContent?.trim() || '';
        const [title, company] = titleText.split(' - ').map(s => s.trim());
        
        let period = '';
        let nextElement = h4.nextElementSibling;
        
        if (nextElement?.classList.contains('date') || nextElement?.tagName === 'P') {
          period = nextElement.textContent?.trim() || '';
          nextElement = nextElement.nextElementSibling;
        }
        
        const achievements: string[] = [];
        if (nextElement?.tagName === 'UL') {
          nextElement.querySelectorAll('li').forEach(li => {
            const text = li.textContent?.trim();
            if (text) achievements.push(text);
          });
        }
        
        if (title || company) {
          jobs.push({
            title: title || 'Position',
            company: company || 'Company',
            period,
            achievements
          });
        }
      });
    }

    return jobs;
  };

  /* ============================================================
     PARSE EDUCATION
  ============================================================ */

  const parseEducation = (): Array<{
    degree: string;
    institution: string;
    year: string;
    details: string[];
  }> => {
    // ✅ KÄYTÄ ENSISIJAISESTI data.education
    if (data?.education && Array.isArray(data.education) && data.education.length > 0) {
      return data.education.map((edu: any) => ({
        degree: edu.degree || 'Degree',
        institution: edu.institution || edu.school || 'Institution',
        year: edu.year || edu.period || '',
        details: Array.isArray(edu.details) ? edu.details : [edu.description].filter(Boolean)
      }));
    }
    
    const eduHTML = getAIContent("education_section");
    
    if (!eduHTML) {
      try {
        const rawEdu = data?.education || (data as any)?.education_history;
        if (!rawEdu) return [];
        
        const parsed = typeof rawEdu === 'string' ? JSON.parse(rawEdu) : rawEdu;
        if (!Array.isArray(parsed)) return [];
        
        return parsed.map((edu: any) => ({
          degree: edu.degree || 'Degree',
          institution: edu.school || edu.institution || 'Institution',
          year: edu.year || '',
          details: [
            edu.whyThisField,
            edu.specialization,
            edu.proudestMoment,
            edu.favoriteSubjects
          ].filter(Boolean).map(text => text.trim())
        }));
      } catch (e) {
        console.error('Failed to parse education:', e);
        return [];
      }
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(eduHTML, 'text/html');
    const eduList: Array<{
      degree: string;
      institution: string;
      year: string;
      details: string[];
    }> = [];

    const eduDivs = doc.querySelectorAll('.education, .education-item');
    
    if (eduDivs.length > 0) {
      eduDivs.forEach(eduDiv => {
        const h4 = eduDiv.querySelector('h4');
        const degree = h4?.textContent?.trim() || '';
        
        const paragraphs = eduDiv.querySelectorAll('p');
        let institution = '';
        let year = '';
        
        paragraphs.forEach((p, idx) => {
          const text = p.textContent?.trim() || '';
          if (idx === 0) institution = text;
          if (p.classList.contains('date') || text.match(/\d{4}/)) {
            year = text;
          }
        });
        
        const details: string[] = [];
        eduDiv.querySelectorAll('ul li').forEach(li => {
          const text = li.textContent?.trim();
          if (text) details.push(text);
        });
        
        if (degree) {
          eduList.push({ degree, institution, year, details });
        }
      });
    } else {
      const allH4 = doc.querySelectorAll('h4');
      allH4.forEach(h4 => {
        const degree = h4.textContent?.trim() || '';
        let institution = '';
        let year = '';
        const details: string[] = [];
        
        let nextElement = h4.nextElementSibling;
        
        if (nextElement?.tagName === 'P') {
          institution = nextElement.textContent?.trim() || '';
          nextElement = nextElement.nextElementSibling;
        }
        
        if (nextElement?.tagName === 'P') {
          const text = nextElement.textContent?.trim() || '';
          if (text.match(/\d{4}/)) {
            year = text;
            nextElement = nextElement.nextElementSibling;
          }
        }
        
        if (nextElement?.tagName === 'UL') {
          nextElement.querySelectorAll('li').forEach(li => {
            const text = li.textContent?.trim();
            if (text) details.push(text);
          });
        }
        
        if (degree) {
          eduList.push({ degree, institution, year, details });
        }
      });
    }

    return eduList;
  };

  const skillCategories = parseSkills();
  const workExperience = parseWorkExperience();
  const education = parseEducation();

  const name = data?.name || "Name";
  const title = data?.title || "Professional Title";

  // ✅ APUFUNKTIOT - EI display-ominaisuutta
  const getEditableStyles = (isActive: boolean = true): React.CSSProperties => ({
    outline: isEditing && isActive ? '2px dashed rgba(249, 115, 22, 0.5)' : 'none',
    padding: isEditing && isActive ? '2px 4px' : '0',
    borderRadius: '4px',
    cursor: isEditing ? 'text' : 'default',
    minWidth: '20px',
  });

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div
      className="bg-white mx-auto relative overflow-hidden shadow-2xl"
      style={{
        width: "210mm",
        height: "297mm",
        fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* ✅ GOOGLE FONTS */}
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@600;700&display=swap"
        rel="stylesheet"
      />

      {/* EDIT CONTROLS */}
      {isEditing && showEditControls && editMode === "content" && (
        <div
          className="fixed right-6 top-1/2 -translate-y-1/2 z-50 bg-white p-3 rounded-xl shadow-lg flex flex-col gap-2"
        >
          <button
            onClick={() => setSkillsTop((v) => Math.max(-20, v - 5))}
            className="px-3 py-1 bg-gray-800 text-white rounded text-xs"
          >
            ↑ Up
          </button>
          <button
            onClick={() => setSkillsTop((v) => Math.min(40, v + 5))}
            className="px-3 py-1 bg-gray-800 text-white rounded text-xs"
          >
            ↓ Down
          </button>
        </div>
      )}

      {/* LEFT COLUMN - DARK */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "70mm",
          height: "297mm",
          background: "linear-gradient(180deg, #1a1a1a 0%, #2d2d2d 100%)",
          color: "white",
        }}
      >
        {/* PROFILE IMAGE */}
        <div style={{ width: "100%", height: "85mm", overflow: "hidden" }}>
          {profileImg ? (
            <img
              src={profileImg}
              alt=""
              className="w-full h-full object-cover"
              style={{ filter: "contrast(1.05) brightness(0.95)" }}
            />
          ) : (
            <div 
              className="w-full h-full flex items-center justify-center"
              style={{
                fontSize: "48pt",
                fontWeight: 300,
                background: "linear-gradient(135deg, #4a4a4a 0%, #2a2a2a 100%)",
                fontFamily: "'Inter', sans-serif",
                letterSpacing: "0.05em"
              }}
            >
              {name.substring(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        {/* ✅ SKILLS - MUOKATTAVISSA */}
        {(skillCategories.length > 0 || isEditing) && (
          <div
            style={{
              padding: "7mm 8mm",
              position: "relative",
              top: `${skillsTop}mm`,
            }}
          >
            <h2
              contentEditable={isEditing}
              onInput={(e) => handleInput("skillsTitle", e)}
              suppressContentEditableWarning
              style={{
                fontSize: "13pt",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                borderBottom: "1.5px solid rgba(255,255,255,0.25)",
                paddingBottom: "3.5mm",
                marginBottom: "5mm",
                fontFamily: "'Inter', sans-serif",
                ...getEditableStyles(),
              }}
            >
              {skillCategories[0]?.category || "Skills"}
            </h2>

            {skillCategories.map((category, catIdx) => (
              <div key={catIdx} style={{ marginBottom: "4.5mm" }}>
                {skillCategories.length > 1 && (
                  <h3
                    contentEditable={isEditing}
                    onInput={(e) => handleInput(`skills.${catIdx}.category`, e)}
                    suppressContentEditableWarning
                    style={{
                      fontSize: "9.5pt",
                      fontWeight: 600,
                      marginBottom: "2mm",
                      color: "#f0c674",
                      fontFamily: "'Inter', sans-serif",
                      letterSpacing: "0.03em",
                      ...getEditableStyles(),
                    }}
                  >
                    {category.category}
                  </h3>
                )}
                
                <ul
                  style={{
                    listStyleType: "none",
                    padding: 0,
                    margin: 0,
                    fontSize: "8.5pt",
                    lineHeight: 1.65,
                    fontWeight: 300,
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {category.items.map((skill, skillIdx) => (
                    <li
                      key={skillIdx}
                      contentEditable={isEditing}
                      onInput={(e) => handleListItemInput(`skills.${catIdx}.items`, skillIdx, e)}
                      suppressContentEditableWarning
                      style={{
                        marginBottom: "2mm",
                        paddingLeft: "4mm",
                        position: "relative",
                        color: "rgba(255,255,255,0.92)",
                        ...getEditableStyles(),
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          left: 0,
                          color: "#f0c674",
                          fontSize: "10pt",
                        }}
                      >
                        •
                      </span>
                      {skill}
                    </li>
                  ))}
                  {/* Lisää uusi skill -nappi */}
                  {isEditing && (
                    <li
                      onClick={() => {
                        const newItem = "Uusi taito";
                        onUpdate?.(`skills.${catIdx}.items.${category.items.length}`, newItem);
                      }}
                      style={{
                        marginBottom: "2mm",
                        paddingLeft: "4mm",
                        color: "#f0c674",
                        cursor: "pointer",
                        fontStyle: "italic",
                        opacity: 0.7,
                      }}
                    >
                      <span style={{ position: "absolute", left: 0 }}>+</span>
                      Lisää taito...
                    </li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT COLUMN - LIGHT */}
      <div
        style={{
          marginLeft: "70mm",
          width: "140mm",
          height: "297mm",
        }}
      >
        {/* HEADER WITH BACKGROUND */}
        <div
          style={{
            height: "85mm",
            position: "relative",
            backgroundImage: bgImage
              ? `url(${bgImage})`
              : "linear-gradient(135deg, #2c3e50 0%, #34495e 100%)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            color: "white",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(135deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.35) 100%)",
            }}
          />

          <div
            style={{
              position: "relative",
              zIndex: 10,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: "10mm",
            }}
          >
            {/* NIMI */}
            <h1
              contentEditable={isEditing}
              onInput={(e) => handleInput("name", e)}
              suppressContentEditableWarning
              style={{
                fontSize: "30pt",
                fontWeight: 700,
                marginBottom: "2mm",
                fontFamily: "'Playfair Display', serif",
                letterSpacing: "0.02em",
                textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
                ...getEditableStyles(),
              }}
            >
              {name}
            </h1>
            
            {/* TITLE */}
            <p
              contentEditable={isEditing}
              onInput={(e) => handleInput("title", e)}
              suppressContentEditableWarning
              style={{
                fontSize: "13pt",
                marginTop: "2mm",
                marginBottom: "4mm",
                fontWeight: 400,
                fontFamily: "'Inter', sans-serif",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                opacity: 0.95,
                ...getEditableStyles(),
              }}
            >
              {title}
            </p>

            <div
              style={{
                marginTop: "4mm",
                fontSize: "8.5pt",
                opacity: 0.92,
                display: "flex",
                gap: "7mm",
                flexWrap: "wrap",
                justifyContent: "center",
                fontFamily: "'Inter', sans-serif",
                fontWeight: 300,
              }}
            >
              {/* EMAIL */}
              {(data?.email || isEditing) && (
                <span 
                  contentEditable={isEditing}
                  onInput={(e) => handleInput("email", e)}
                  suppressContentEditableWarning
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '2mm',
                    ...(getEditableStyles() as React.CSSProperties),
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  {data.email || (isEditing ? 'sähköposti@esimerkki.fi' : '')}
                </span>
              )}
              
              {/* PHONE */}
              {(data?.phone || isEditing) && (
                <span 
                  contentEditable={isEditing}
                  onInput={(e) => handleInput("phone", e)}
                  suppressContentEditableWarning
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '2mm',
                    ...(getEditableStyles() as React.CSSProperties),
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  {data.phone || (isEditing ? '+358 40 123 4567' : '')}
                </span>
              )}
              
              {/* LOCATION */}
              {(data?.location || isEditing) && (
                <span 
                  contentEditable={isEditing}
                  onInput={(e) => handleInput("location", e)}
                  suppressContentEditableWarning
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '2mm',
                    ...(getEditableStyles() as React.CSSProperties),
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                  {data.location || (isEditing ? 'Helsinki' : '')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* CONTENT AREA */}
        <div style={{ 
          padding: "9mm 10mm", 
          fontSize: "9.5pt", 
          lineHeight: 1.55,
          fontFamily: "'Inter', sans-serif",
          fontWeight: 300,
        }}>
          
          {/* ✅ WORK EXPERIENCE - MUOKATTAVISSA */}
          {(workExperience.length > 0 || isEditing) && (
            <section style={{ marginBottom: "7mm" }}>
              <h2
                contentEditable={isEditing}
                onInput={(e) => handleInput("experienceTitle", e)}
                suppressContentEditableWarning
                style={{
                  fontSize: "11.5pt",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  borderBottom: "2px solid #1a1a1a",
                  paddingBottom: "2mm",
                  marginBottom: "4mm",
                  letterSpacing: "0.12em",
                  fontFamily: "'Inter', sans-serif",
                  color: "#1a1a1a",
                  ...getEditableStyles(),
                }}
              >
                Work Experience
              </h2>
              
              {workExperience.map((job, idx) => (
                <div key={idx} style={{ marginBottom: "5.5mm", pageBreakInside: "avoid" }}>
                  {/* Position + Company */}
                  <h4
                    style={{
                      fontSize: "10.5pt",
                      fontWeight: 600,
                      marginBottom: "1mm",
                      color: "#1a1a1a",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    <span
                      contentEditable={isEditing}
                      onInput={(e) => handleInput(`experience.${idx}.title`, e)}
                      suppressContentEditableWarning
                      style={getEditableStyles()}
                    >
                      {job.title}
                    </span>
                    <span style={{ fontWeight: 400, color: "#555" }}> — </span>
                    <span
                      contentEditable={isEditing}
                      onInput={(e) => handleInput(`experience.${idx}.company`, e)}
                      suppressContentEditableWarning
                      style={getEditableStyles()}
                    >
                      {job.company}
                    </span>
                  </h4>
                  
                  {/* Period */}
                  {(job.period || isEditing) && (
                    <p
                      contentEditable={isEditing}
                      onInput={(e) => handleInput(`experience.${idx}.period`, e)}
                      suppressContentEditableWarning
                      style={{
                        fontSize: "8.5pt",
                        color: "#666",
                        fontStyle: "italic",
                        marginBottom: "2mm",
                        fontWeight: 300,
                        ...getEditableStyles(),
                      }}
                    >
                      {job.period || (isEditing ? 'Ajanjakso' : '')}
                    </p>
                  )}
                  
                  {/* Achievements/Bullets */}
                  {(job.achievements.length > 0 || isEditing) && (
                    <ul
                      style={{
                        marginTop: "2mm",
                        paddingLeft: "5mm",
                        fontSize: "9pt",
                        lineHeight: 1.6,
                        fontWeight: 300,
                      }}
                    >
                      {job.achievements.map((achievement, achIdx) => (
                        <li 
                          key={achIdx} 
                          contentEditable={isEditing}
                          onInput={(e) => handleListItemInput(`experience.${idx}.bullets`, achIdx, e)}
                          suppressContentEditableWarning
                          style={{ 
                            marginBottom: "1.5mm", 
                            color: "#333",
                            ...getEditableStyles(),
                          }}
                        >
                          {achievement}
                        </li>
                      ))}
                      {/* Lisää uusi bullet */}
                      {isEditing && (
                        <li
                          onClick={() => {
                            const newBullet = "Uusi kuvaus";
                            onUpdate?.(`experience.${idx}.bullets.${job.achievements.length}`, newBullet);
                          }}
                          style={{
                            marginBottom: "1.5mm",
                            color: "#f97316",
                            cursor: "pointer",
                            fontStyle: "italic",
                            opacity: 0.7,
                          }}
                        >
                          + Lisää kohta...
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              ))}
              
              {/* Lisää uusi työpaikka */}
              {isEditing && (
                <div
                  onClick={() => {
                    const newJob = {
                      title: "Uusi tehtävä",
                      company: "Yritys",
                      period: "2024 - Nykyinen",
                      bullets: ["Kuvaus tehtävästä"]
                    };
                    onUpdate?.(`experience.${workExperience.length}`, newJob);
                  }}
                  style={{
                    padding: "3mm",
                    border: "2px dashed #f97316",
                    borderRadius: "4px",
                    textAlign: "center",
                    color: "#f97316",
                    cursor: "pointer",
                    fontSize: "9pt",
                    marginTop: "3mm",
                  }}
                >
                  + Lisää työkokemus
                </div>
              )}
            </section>
          )}

          {/* ✅ EDUCATION - MUOKATTAVISSA */}
          {(education.length > 0 || isEditing) && (
            <section style={{ marginBottom: "7mm" }}>
              <h2
                contentEditable={isEditing}
                onInput={(e) => handleInput("educationTitle", e)}
                suppressContentEditableWarning
                style={{
                  fontSize: "11.5pt",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  borderBottom: "2px solid #1a1a1a",
                  paddingBottom: "2mm",
                  marginBottom: "4mm",
                  letterSpacing: "0.12em",
                  fontFamily: "'Inter', sans-serif",
                  color: "#1a1a1a",
                  ...getEditableStyles(),
                }}
              >
                Education
              </h2>
              
              {education.map((edu, idx) => (
                <div key={idx} style={{ marginBottom: "5mm", pageBreakInside: "avoid" }}>
                  {/* Degree */}
                  <h4
                    contentEditable={isEditing}
                    onInput={(e) => handleInput(`education.${idx}.degree`, e)}
                    suppressContentEditableWarning
                    style={{
                      fontSize: "10pt",
                      fontWeight: 600,
                      marginBottom: "1mm",
                      fontFamily: "'Inter', sans-serif",
                      color: "#1a1a1a",
                      ...getEditableStyles(),
                    }}
                  >
                    {edu.degree}
                  </h4>
                  
                  {/* Institution */}
                  {(edu.institution || isEditing) && (
                    <p
                      contentEditable={isEditing}
                      onInput={(e) => handleInput(`education.${idx}.institution`, e)}
                      suppressContentEditableWarning
                      style={{
                        fontSize: "9pt",
                        margin: "1mm 0",
                        fontWeight: 400,
                        color: "#444",
                        ...getEditableStyles(),
                      }}
                    >
                      {edu.institution || (isEditing ? 'Oppilaitos' : '')}
                    </p>
                  )}
                  
                  {/* Year */}
                  {(edu.year || isEditing) && (
                    <p
                      contentEditable={isEditing}
                      onInput={(e) => handleInput(`education.${idx}.year`, e)}
                      suppressContentEditableWarning
                      style={{
                        fontSize: "8.5pt",
                        color: "#666",
                        fontStyle: "italic",
                        margin: "1mm 0",
                        fontWeight: 300,
                        ...getEditableStyles(),
                      }}
                    >
                      {edu.year || (isEditing ? '2020 - 2024' : '')}
                    </p>
                  )}
                  
                  {/* Details */}
                  {(edu.details.length > 0 || isEditing) && (
                    <ul
                      style={{
                        marginTop: "2mm",
                        paddingLeft: "5mm",
                        fontSize: "8.5pt",
                        lineHeight: 1.6,
                        fontWeight: 300,
                      }}
                    >
                      {edu.details.map((detail, detIdx) => (
                        <li 
                          key={detIdx}
                          contentEditable={isEditing}
                          onInput={(e) => handleListItemInput(`education.${idx}.details`, detIdx, e)}
                          suppressContentEditableWarning
                          style={{ 
                            color: "#333",
                            ...getEditableStyles(),
                          }}
                        >
                          {detail}
                        </li>
                      ))}
                      {/* Lisää uusi detail */}
                      {isEditing && (
                        <li
                          onClick={() => {
                            const newDetail = "Uusi lisätieto";
                            onUpdate?.(`education.${idx}.details.${edu.details.length}`, newDetail);
                          }}
                          style={{
                            color: "#f97316",
                            cursor: "pointer",
                            fontStyle: "italic",
                            opacity: 0.7,
                          }}
                        >
                          + Lisää lisätieto...
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              ))}
              
              {/* Lisää uusi koulutus */}
              {isEditing && (
                <div
                  onClick={() => {
                    const newEdu = {
                      degree: "Uusi tutkinto",
                      institution: "Oppilaitos",
                      year: "2020 - 2024",
                      details: ["Kuvaus"]
                    };
                    onUpdate?.(`education.${education.length}`, newEdu);
                  }}
                  style={{
                    padding: "3mm",
                    border: "2px dashed #f97316",
                    borderRadius: "4px",
                    textAlign: "center",
                    color: "#f97316",
                    cursor: "pointer",
                    fontSize: "9pt",
                    marginTop: "3mm",
                  }}
                >
                  + Lisää koulutus
                </div>
              )}
            </section>
          )}

          {/* LANGUAGES */}
          {getAIContent("languages_section") && (
            <section>
              <h2
                style={{
                  fontSize: "11.5pt",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  borderBottom: "2px solid #1a1a1a",
                  paddingBottom: "2mm",
                  marginBottom: "4mm",
                  letterSpacing: "0.12em",
                  fontFamily: "'Inter', sans-serif",
                  color: "#1a1a1a",
                }}
              >
                Languages
              </h2>
              <div
                style={{
                  fontSize: "9.5pt",
                  lineHeight: 1.6,
                  color: "#333",
                  fontWeight: 300,
                }}
                dangerouslySetInnerHTML={{
                  __html: getAIContent("languages_section"),
                }}
              />
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default TechnicalCVTemplate;