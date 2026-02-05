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
     PARSE SKILLS TO STRUCTURED FORMAT
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
     ✅ PARSE WORK EXPERIENCE TO CHRONOLOGICAL STRUCTURE
  ============================================================ */

  const parseWorkExperience = (): Array<{
    title: string;
    company: string;
    period: string;
    achievements: string[];
  }> => {
    const expHTML = getAIContent("experience_section");
    if (!expHTML) return [];

    const parser = new DOMParser();
    const doc = parser.parseFromString(expHTML, 'text/html');
    const jobs: Array<{
      title: string;
      company: string;
      period: string;
      achievements: string[];
    }> = [];

    // Try to parse structured jobs
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
      // Fallback: try to extract from h4 + ul structure
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
     ✅ PARSE EDUCATION TO CHRONOLOGICAL STRUCTURE
  ============================================================ */

  const parseEducation = (): Array<{
    degree: string;
    institution: string;
    year: string;
    details: string[];
  }> => {
    const eduHTML = getAIContent("education_section");
    if (!eduHTML) return [];

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
      // Fallback
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
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
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
          background: "#2f2b28",
          color: "white",
        }}
      >
        {/* PROFILE IMAGE */}
        <div style={{ width: "100%", height: "90mm", overflow: "hidden" }}>
          {profileImg ? (
            <img
              src={profileImg}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl font-bold bg-gray-600">
              {name.substring(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        {/* SKILLS - STRUCTURED BULLET LIST */}
        {skillCategories.length > 0 && (
          <div
            style={{
              padding: "8mm",
              position: "relative",
              top: `${skillsTop}mm`,
            }}
          >
            <h2
              style={{
                fontSize: "14pt",
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                borderBottom: "1px solid rgba(255,255,255,0.6)",
                paddingBottom: "4mm",
                marginBottom: "6mm",
                fontWeight: "bold",
              }}
            >
              Skills
            </h2>

            {skillCategories.map((category, idx) => (
              <div key={idx} style={{ marginBottom: "5mm" }}>
                {skillCategories.length > 1 && (
                  <h3
                    style={{
                      fontSize: "10pt",
                      fontWeight: "bold",
                      marginBottom: "2mm",
                      color: "#d4af37",
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
                    fontSize: "9pt",
                    lineHeight: 1.6,
                  }}
                >
                  {category.items.map((skill, skillIdx) => (
                    <li
                      key={skillIdx}
                      style={{
                        marginBottom: "2mm",
                        paddingLeft: "4mm",
                        position: "relative",
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          left: 0,
                          color: "#d4af37",
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
            height: "90mm",
            position: "relative",
            backgroundImage: bgImage
              ? `url(${bgImage})`
              : "linear-gradient(135deg, #444, #111)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            color: "white",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.45)",
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
                fontSize: "32pt",
                fontWeight: "bold",
                marginBottom: "2mm",
              }}
            >
              {name}
            </h1>
            <p
              style={{
                fontSize: "14pt",
                marginTop: "2mm",
                marginBottom: "4mm",
              }}
            >
              {title}
            </p>

            <div
              style={{
                marginTop: "4mm",
                fontSize: "9pt",
                opacity: 0.95,
                display: "flex",
                gap: "8mm",
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              {data?.email && <span>📧 {data.email}</span>}
              {data?.phone && <span>📞 {data.phone}</span>}
              {data?.location && <span>📍 {data.location}</span>}
            </div>
          </div>
        </div>

        {/* CONTENT AREA */}
        <div style={{ padding: "10mm", fontSize: "10pt", lineHeight: 1.5 }}>
          
          {/* ✅ WORK EXPERIENCE - CHRONOLOGICAL */}
          {workExperience.length > 0 && (
            <section style={{ marginBottom: "8mm" }}>
              <h2
                style={{
                  fontSize: "12pt",
                  fontWeight: "bold",
                  textTransform: "uppercase",
                  borderBottom: "2px solid #2f2b28",
                  paddingBottom: "2mm",
                  marginBottom: "4mm",
                  letterSpacing: "0.1em",
                }}
              >
                Work Experience
              </h2>
              
              {workExperience.map((job, idx) => (
                <div key={idx} style={{ marginBottom: "6mm", pageBreakInside: "avoid" }}>
                  <h4
                    style={{
                      fontSize: "11pt",
                      fontWeight: "bold",
                      marginBottom: "1mm",
                      color: "#2f2b28",
                    }}
                  >
                    {job.title} - {job.company}
                  </h4>
                  {job.period && (
                    <p
                      style={{
                        fontSize: "9pt",
                        color: "#666",
                        fontStyle: "italic",
                        marginBottom: "2mm",
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
                        lineHeight: 1.5,
                      }}
                    >
                      {job.achievements.map((achievement, achIdx) => (
                        <li key={achIdx} style={{ marginBottom: "1mm" }}>
                          {achievement}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </section>
          )}

          {/* ✅ EDUCATION - CHRONOLOGICAL */}
          {education.length > 0 && (
            <section style={{ marginBottom: "8mm" }}>
              <h2
                style={{
                  fontSize: "12pt",
                  fontWeight: "bold",
                  textTransform: "uppercase",
                  borderBottom: "2px solid #2f2b28",
                  paddingBottom: "2mm",
                  marginBottom: "4mm",
                  letterSpacing: "0.1em",
                }}
              >
                Education
              </h2>
              
              {education.map((edu, idx) => (
                <div key={idx} style={{ marginBottom: "5mm", pageBreakInside: "avoid" }}>
                  <h4
                    style={{
                      fontSize: "10pt",
                      fontWeight: "bold",
                      marginBottom: "1mm",
                    }}
                  >
                    {edu.degree}
                  </h4>
                  {edu.institution && (
                    <p
                      style={{
                        fontSize: "9pt",
                        margin: "1mm 0",
                      }}
                    >
                      {edu.institution}
                    </p>
                  )}
                  {edu.year && (
                    <p
                      style={{
                        fontSize: "9pt",
                        color: "#666",
                        fontStyle: "italic",
                        margin: "1mm 0",
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
                        fontSize: "9pt",
                      }}
                    >
                      {edu.details.map((detail, detIdx) => (
                        <li key={detIdx}>{detail}</li>
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
                  fontSize: "12pt",
                  fontWeight: "bold",
                  textTransform: "uppercase",
                  borderBottom: "2px solid #2f2b28",
                  paddingBottom: "2mm",
                  marginBottom: "4mm",
                  letterSpacing: "0.1em",
                }}
              >
                Languages
              </h2>
              <div
                style={{
                  fontSize: "10pt",
                  lineHeight: 1.5,
                  color: "#333",
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