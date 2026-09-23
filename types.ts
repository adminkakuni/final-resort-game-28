export interface Option {
  id: string; // 'A', 'B', 'C', etc.
  label: string;
  description?: string;
  chip?: string;
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
  trip_motive?: string;
  trip_status?: string;
  trip_month?: string;
  trip_year?: string;
  how_found?: string;
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
  device_type?: string;
  user_agent?: string;
  client_ip_address?: string;
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
  imageUrl?: string; // Foto del resort (WP media, versión 768px optimizada para móvil)
  // Matching criteria (arrays of option IDs they satisfy)
  nivel_despreocupacion: string[]; // Eliminatory
  perfil_foodie: string[];
  atmosfera_isla: string[];
  experiencia_snorkel: string[];
  avistamiento_fauna: string[];
  'logistica_fauna': string[];
  'tipo_animal': string[];
  diseno_habitacion: string[];
  tipo_traslado: string[];
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