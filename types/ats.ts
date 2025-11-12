// types/ats.ts - KAIKKI ATS-TYYPIT YHDESSÄ PAIKASSA

export interface ATSDetection {
  usesATS: boolean;
  confidence: number; // 0.0 - 1.0
  reasoning: string;
  indicators: {
    hasATS: string[];
    noATS: string[];
  };
  companySize: 'large' | 'medium' | 'small' | 'unknown';
  recommendation: string;
}

export interface ATSAnalysis {
  score: number; // 0-100
  exactMatches: string[];
  missingCritical: string[];
  languageMismatch: boolean;
  jobLanguage: string;
  coverLetterLanguage: string;
  warningMessage: string;
  warningType: 'critical' | 'warning' | 'info' | 'success';
  atsDetection: ATSDetection;
  totalKeywords: number;
  analysis: {
    technical: number;
    soft: number;
  };
}

export interface CoverLetterData {
  id: string;
  user_id: string;
  title: string;
  language: string;
  created_at: string;
  updated_at: string;
  content: {
    job_description: string;
    cover_letter_content: string;
    body: string;
    signature: string;
    applicant_info: {
      name: string;
      email: string;
      phone: string;
      location?: string;
      linkedin?: string;
    };
  };
  ai_data: {
    html: {
      content: string;
    };
    styles: {
      main_style: string;
      custom_styles?: string;
    };
    ats_optimization?: {
      report: {
        keyword_match_score: number;
        ats_compatibility_score: number;
        critical_keywords_used: string[];
        missing_keywords: string[];
        improvement_suggestions: string[];
        language_info?: {
          job_language: string;
          cover_letter_language: string;
          needs_translation: boolean;
        };
      };
      last_edited?: string;
      current_score?: number;
    };
  };
}

// API Request/Response types
export interface DetectATSRequest {
  jobDescription: string;
}

export interface DetectATSResponse extends ATSDetection {}

export interface AnalyzeATSRequest {
  jobDescription: string;
  coverLetterContent: string;
}

export interface AnalyzeATSResponse extends ATSAnalysis {}

export interface InsertKeywordRequest {
  keyword: string;
  currentContent: string;
  jobDescription?: string;
}

export interface InsertKeywordResponse {
  improvedContent: string;
  insertedKeyword: string;
}

// Component Props
export interface ATSScorePanelProps {
  analysis: ATSAnalysis;
  isAnalyzing: boolean;
  onRefresh: () => void;
  onKeywordClick: (keyword: string) => void;
  insertingKeyword: string | null;
}

export interface CoverLetterEditorProps {
  content: string;
  onChange: (content: string) => void;
  contentEditableRef: React.RefObject<HTMLDivElement>;
}

export interface EditToolsPanelProps {
  applicantInfo: any;
  onApplicantInfoChange: (info: any) => void;
  jobDescription: string;
}

// Utility types
export type WarningType = 'critical' | 'warning' | 'info' | 'success';
export type CompanySize = 'large' | 'medium' | 'small' | 'unknown';
export type Language = 'suomi' | 'englanti' | 'ruotsi' | 'tuntematon';

// Helper functions as types
export type GetScoreColor = (score: number) => string;
export type GetScoreBg = (score: number) => string;
export type GetWarningStyle = (type: WarningType) => string;