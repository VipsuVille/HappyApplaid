// components/cv/CVTemplateTechnical.tsx
// ✅ PARANNETTU: Paremmat fontit ja A4-optimointi

"use client";
import React, { useState } from "react";
import { UserFormData, AIData, EditMode } from "@/types";

interface TechnicalCVTemplateProps {
  data: UserFormData;
  aiData: AIData;
  isEditing: boolean;
  showEditControls: boolean;
  editMode: EditMode | null;
  onContentChange?: (field: keyof UserFormData, value: any) => void;
}

const TechnicalCVTemplate: React.FC<TechnicalCVTemplateProps> = ({
  data,
  aiData,
  isEditing,
  showEditControls,
  editMode,
  onContentChange,
}) => {
  const [skillsTop, setSkillsTop] = useState(0);

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
     PARSE SKILLS
  ============================================================ */

  const parseSkills = (): { category: string; items: string[] }[] => {
    const skillsHTML = getAIContent("skills_section");
    
    if (!skillsHTML) {
      const skillsText = data?.skills || "";
      if (!skillsText) return [];
      
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
     PARSE WORK EXPERIENCE - WITH JSON FALLBACK
  ============================================================ */

  const parseWorkExperience = (): Array<{
    title: string;
    company: string;
    period: string;
    achievements: string[];
  }> => {
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
     PARSE EDUCATION - WITH JSON FALLBACK
  ============================================================ */

  const parseEducation = (): Array<{
    degree: string;
    institution: string;
    year: string;
    details: string[];
  }> => {
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

        {/* SKILLS */}
        {skillCategories.length > 0 && (
          <div
            style={{
              padding: "7mm 8mm",
              position: "relative",
              top: `${skillsTop}mm`,
            }}
          >
            <h2
              style={{
                fontSize: "13pt",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                borderBottom: "1.5px solid rgba(255,255,255,0.25)",
                paddingBottom: "3.5mm",
                marginBottom: "5mm",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              Skills
            </h2>

            {skillCategories.map((category, idx) => (
              <div key={idx} style={{ marginBottom: "4.5mm" }}>
                {skillCategories.length > 1 && (
                  <h3
                    style={{
                      fontSize: "9.5pt",
                      fontWeight: 600,
                      marginBottom: "2mm",
                      color: "#f0c674",
                      fontFamily: "'Inter', sans-serif",
                      letterSpacing: "0.03em",
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
                      style={{
                        marginBottom: "2mm",
                        paddingLeft: "4mm",
                        position: "relative",
                        color: "rgba(255,255,255,0.92)",
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
            <h1
              style={{
                fontSize: "30pt",
                fontWeight: 700,
                marginBottom: "2mm",
                fontFamily: "'Playfair Display', serif",
                letterSpacing: "0.02em",
                textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
              }}
            >
              {name}
            </h1>
            <p
              style={{
                fontSize: "13pt",
                marginTop: "2mm",
                marginBottom: "4mm",
                fontWeight: 400,
                fontFamily: "'Inter', sans-serif",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                opacity: 0.95,
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
              {data?.email && <span>✉ {data.email}</span>}
              {data?.phone && <span>☎ {data.phone}</span>}
              {data?.location && <span>⚲ {data.location}</span>}
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
          
          {/* WORK EXPERIENCE */}
          {workExperience.length > 0 && (
            <section style={{ marginBottom: "7mm" }}>
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
                Work Experience
              </h2>
              
              {workExperience.map((job, idx) => (
                <div key={idx} style={{ marginBottom: "5.5mm", pageBreakInside: "avoid" }}>
                  <h4
                    style={{
                      fontSize: "10.5pt",
                      fontWeight: 600,
                      marginBottom: "1mm",
                      color: "#1a1a1a",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {job.title} <span style={{ fontWeight: 400, color: "#555" }}>—</span> {job.company}
                  </h4>
                  {job.period && (
                    <p
                      style={{
                        fontSize: "8.5pt",
                        color: "#666",
                        fontStyle: "italic",
                        marginBottom: "2mm",
                        fontWeight: 300,
                      }}
                    >
                      {job.period}
                    </p>
                  )}
                  {job.achievements.length > 0 && (
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
                        <li key={achIdx} style={{ marginBottom: "1.5mm", color: "#333" }}>
                          {achievement}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </section>
          )}

          {/* EDUCATION */}
          {education.length > 0 && (
            <section style={{ marginBottom: "7mm" }}>
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
                Education
              </h2>
              
              {education.map((edu, idx) => (
                <div key={idx} style={{ marginBottom: "5mm", pageBreakInside: "avoid" }}>
                  <h4
                    style={{
                      fontSize: "10pt",
                      fontWeight: 600,
                      marginBottom: "1mm",
                      fontFamily: "'Inter', sans-serif",
                      color: "#1a1a1a",
                    }}
                  >
                    {edu.degree}
                  </h4>
                  {edu.institution && (
                    <p
                      style={{
                        fontSize: "9pt",
                        margin: "1mm 0",
                        fontWeight: 400,
                        color: "#444",
                      }}
                    >
                      {edu.institution}
                    </p>
                  )}
                  {edu.year && (
                    <p
                      style={{
                        fontSize: "8.5pt",
                        color: "#666",
                        fontStyle: "italic",
                        margin: "1mm 0",
                        fontWeight: 300,
                      }}
                    >
                      {edu.year}
                    </p>
                  )}
                  {edu.details.length > 0 && (
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
                        <li key={detIdx} style={{ color: "#333" }}>{detail}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
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