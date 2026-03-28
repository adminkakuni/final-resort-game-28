export interface Option {
  id: string; // 'A', 'B', 'C', etc.
  label: string;
  description?: string;
  imageUrl?: string;
  isHighlighted?: boolean;
  hiddenIf?: {
    questionId: string;
    optionIds: string[];
  };
}

export interface Question {
  id: string;
  title: string;
  text?: string;
  warningBox?: string;
  infoBox?: {
    title: string;
    text: string;
  };
  options: Option[];
  isMultiSelect?: boolean;
  dependsOn?: {
    questionId: string;
    optionId: string;
  };
}

export interface Recommendation {
  name: string;
  why: string;
  link: string;
  image_url?: string;
}

export interface ContactInfo {
  name: string;
  email: string;
  phone: string;
  comments?: string;
  privacyAccepted: boolean;
}

export type QuizState = {
  stepIndex: number; // 0=Intro, 1=Screen2, etc.
  answers: Record<string, string | string[]>; // questionId -> optionId (A, B, C) or array of IDs
  contact: ContactInfo;
  isSubmitting: boolean;
  results: Recommendation[] | null;
  error: string | null;
  hasFinished: boolean;
};

// Define the steps structure for navigation logic
export enum StepType {
  INTRO = 'INTRO',
  QUESTIONS = 'QUESTIONS',
  CONTACT = 'CONTACT',
  COMMENTS = 'COMMENTS',
  RESULTS = 'RESULTS'
}

export interface Resort {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  // Matching criteria (arrays of option IDs they satisfy)
  q_despreocupacion: string[]; // Eliminatory
  q5: string[];
  q1: string[];
  q2: string[];
  q3: string[];
  q4: string[];
  'q4.1': string[];
  'q4.2': string[];
  q9: string[];
  q11: string[];
  q_priorities: string[];
}

export interface StepConfig {
  id: string;
  type: StepType;
  title?: string;
  questions?: Question[];
  youtubeId?: string; // Optional specific video per step
  extraContent?: {
    title: string;
    text: string;
    options: Option[];
    id: string;
  };
}