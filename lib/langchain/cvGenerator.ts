import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";
import type { UserFormData, AIData } from '@/types';
import { BaseMessage } from "@langchain/core/messages";

// Output schema määrittely
const cvOutputSchema = z.object({
  personal_description: z.string().max(200),
  cv_content: z.object({
    skills_section: z.string(),
    experience_section: z.string(),
    education_section: z.string(),
    languages_section: z.string()
  }),
  styles: z.object({
    personal_description_style: z.string(),
    skills_style: z.string(),
    main_container_style: z.string(),
    background_integration_style: z.string()
  }),
  image_data: z.object({
    background_prompt: z.string(),
    visual_elements: z.array(z.string())
  })
});

// Model initialisointi
const model = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: 'gpt-3.5-turbo',
  temperature: 0.7
});

function getMessageContent(message: BaseMessage | string): string {
  if (typeof message === 'string') return message;
  if ('content' in message) {
    const content = message.content;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content.map(item => 
        typeof item === 'string' ? item : JSON.stringify(item)
      ).join(' ');
    }
  }
  return JSON.stringify(message);
}
// New function to truncate and optimize image prompt
// Päivitetty optimizeImagePrompt-funktio
function optimizeImagePrompt(prompt: string | undefined): string {
  // Tarkista että prompt on olemassa
  if (!prompt) return '';

  // Siivoa ylimääräiset välilyönnit ja rivinvaihdot
  let optimizedPrompt = prompt.trim().replace(/\s+/g, ' ');

  // Jos prompt on liian pitkä, lyhennetään sitä
  if (optimizedPrompt.length > 900) {
    const sections = optimizedPrompt.split('REQUIREMENTS:');
    let mainPrompt = '';
    let requirements = '';

    if (sections.length > 1) {
      // Jos promtissa on REQUIREMENTS-osio
      mainPrompt = sections[0].slice(0, 400);
      requirements = sections[1]
        .split(/[.,]\s+/)
        .slice(0, 3) // Vähennetään vaatimusten määrää
        .join('. ');
      optimizedPrompt = `${mainPrompt.trim()}. REQUIREMENTS: ${requirements.trim()}.`;
    } else {
      // Jos ei ole REQUIREMENTS-osiota, lyhennetään suoraan
      optimizedPrompt = optimizedPrompt.slice(0, 900);
    }
  }

  // Varmista että lopullinen pituus on alle 1000 merkkiä
  return optimizedPrompt.slice(0, 1000);
}

const outputParser = StructuredOutputParser.fromZodSchema(cvOutputSchema);

// Päivitetty CV prompt template langchainHandler:in promptilla
const cvPromptTemplate = ChatPromptTemplate.fromMessages([
  ["system", `You are a professional CV writer. Create a well-structured CV with the following specifications and constraints:
  
  SPACE ALLOCATION:
  - Personal description: 30% of A4 space (max 200 characters)
  - Skills & experience section: 20% of A4 space
  - Background image area: top 1/3 of page
  
  Your task is to create distinct visual sections with unique styling that perfectly fit an A4 page.`],
  ["human", `Create a professional CV based on the following information:
    Name: {name}
    Education: {education}
    Work Experience: {workExperience}
    Skills: {skills}
    Languages: {languages}
    Age: {age}
    Location: {location}
    Hobbies: {hobbies}
    LinkedIn: {linkedIn}
    Output Language: {language}

    STRICT OUTPUT REQUIREMENTS:
    1. PERSONAL DESCRIPTION:
    - Maximum 200 characters
    - Should capture personality through skills and hobbies
    - Must be professional yet personal
    - Takes 30% of A4 space
    
    2. SKILLS & EXPERIENCE SECTION:
    - Compact presentation of skills, education, languages
    - Maximum 20% of A4 space
    - Avoid long lists
    - Focus on key achievements and competencies

    3. CSS STYLING:
    - Create distinct visual areas with unique styling
    - Personal description section should have its own style (e.g., specific border, background)
    - Skills section should have contrasting style
    - Include CSS variables for easy color/style adjustments
    - Font sizes must be relative (rem/em) for scalability
    - Include responsive design considerations
    - Style should complement the background image theme

    4. BACKGROUND IMAGE PROMPT:
    - Theme must be based on hobbies and skills (NO CV/OFFICE/WORK REFERENCES)
    - Simplified, abstract design avoiding complex details
    - Must occupy top 1/3 of A4 page
    - Include subtle gradient or pattern for transition to white space
    - Keep design minimal and professional
    - Avoid human figures or complex objects
    - Use metaphorical representations of skills/hobbies

    {format_instructions}

    The final CV must fit perfectly on a single A4 page with proper spacing and hierarchy.`
  ]
]);

// Päivitetty background prompt template langchainHandler:in promptilla
const backgroundPromptTemplate = ChatPromptTemplate.fromMessages([
  ["system", `
    You are a creative assistant specializing in minimalist, professional image design. 
    YOUR DESIGNS NEVER INCLUDE TEXT, LETTERS, OR NUMBERS. 
    Your task is to create images that visually represent a user's skills and hobbies without being overly literal.
  `],
  ["human", `
    Based on the following user information:
    - Skills: {skills}
    - Hobbies: {hobbies}
    
    STRICT IMAGE REQUIREMENTS:
    - Dimensions: Full A4 width, 1/3 A4 height (top portion of the page)
    - Style: Minimalist and professional. Avoid clutter and unnecessary detail.
    - Detail Level: Overall image should be simplicity level 2/10. Include one or two minor details with a complexity level of 4/10 for visual interest.
    - Representation: Use metaphorical and abstract symbols to represent skills and hobbies. Avoid direct depictions of human figures or complex objects.
    - Color Palette: Use no more than three colors (excluding white). Ensure the colors complement each other and fit a professional theme.
    - Composition: Ensure a smooth transition into the white space below the design. Avoid harsh edges or abrupt endings.
    - Example Guidance: 
      - For "programming" and "hiking," use symbols like a stylized circuit board trail, mountains blended with geometric patterns, or minimalist abstract motifs.
      - For "music," consider abstract guitar strings or soundwave-inspired shapes.
    - Key Directive: The design should be clean, visually appealing, and maintain balance. Less is more.
  `]
]);
const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

// Updated background image generation with error handling and retries
async function generateBackgroundImage(prompt: string, retryCount = 2): Promise<string> {
  let currentPrompt = optimizeImagePrompt(prompt);
  let lastError: Error | null = null;

  for (let i = 0; i <= retryCount; i++) {
    try {
      // Lisää console.log debuggausta varten
      console.log('Optimized prompt length:', currentPrompt.length);
      console.log('Optimized prompt:', currentPrompt);

      const response = await fetch(`${BASE_URL}/api/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: currentPrompt })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Image generation failed: ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      return data.url;

    } catch (error) {
      console.error('Generate image error:', error);
      lastError = error as Error;
      
      if (i === retryCount) break;
      
      // Lyhennä promptia vielä lisää seuraavaa yritystä varten
      currentPrompt = optimizeImagePrompt(currentPrompt.split(' ').slice(0, Math.floor(currentPrompt.split(' ').length * 0.8)).join(' '));
    }
  }

  throw lastError || new Error('Failed to generate background image after all retries');
}

export async function generateCVWithLangChain(userData: UserFormData): Promise<AIData> {
  try {
    const formattedPrompt = await cvPromptTemplate.format({
      ...userData,
      linkedIn: userData.linkedIn || "",
      format_instructions: outputParser.getFormatInstructions()
    });

    const cvResult = await model.invoke(formattedPrompt);
    const parsedOutput = await outputParser.parse(getMessageContent(cvResult));

    const backgroundPrompt = await backgroundPromptTemplate.format({
      skills: userData.skills,
      hobbies: userData.hobbies
    });
    
    const backgroundResult = await model.invoke(backgroundPrompt);
    const imagePrompt = getMessageContent(backgroundResult);

    let backgroundImage: string;
    try {
      backgroundImage = await generateBackgroundImage(imagePrompt);
    } catch (error) {
      console.error('Background image generation failed:', error);
      // Provide a fallback solid color or pattern
      backgroundImage = 'data:image/svg+xml;base64,...'; // Add your fallback image here
    }
    console.log("Generated CV prompt: ", formattedPrompt);
console.log("Generated background prompt: ", backgroundPrompt);

try {
  const cvResult = await model.invoke(formattedPrompt);
  console.log("CV generation result: ", getMessageContent(cvResult));

  const parsedOutput = await outputParser.parse(getMessageContent(cvResult));

  // Tulosta kaikki CV-tiedot
  console.log("HTML sections: ", parsedOutput.cv_content);
  console.log("Styles: ", parsedOutput.styles);
  console.log("Profile: ", parsedOutput.personal_description);
} catch (error) {
  console.error("Error generating CV: ", error);
}

    return {
      html: parsedOutput.cv_content,
      styles: parsedOutput.styles,
      images: parsedOutput.image_data.visual_elements,
      background: backgroundImage,
      profile: parsedOutput.personal_description
    };
  } catch (error) {
    console.error('Error generating CV:', error);
    throw error;
  }
}