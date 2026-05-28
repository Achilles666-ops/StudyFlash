export interface Document {
  id: string;
  userId: string;
  fileName: string;
  extractedTextPreview?: string;
  subject: string;
  type: 'pdf' | 'image';
  pageCount?: number;
  status: 'processing' | 'ready' | 'failed';
  flashcardCount: number;
  uploadedAt: any; // Firestore timestamp
}

export interface Flashcard {
  id: string;
  documentId: string;
  userId: string;
  question: string;
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  lastRating: 'review_again' | 'almost' | 'got_it' | null;
  ratedAt?: any;
}

export interface SummarySection {
  heading: string;
  bullets: string[];
}

export interface SummaryNote {
  id: string;
  documentId: string;
  userId: string;
  sections?: SummarySection[];
  keyTerms?: string[];
  estimatedReadMins?: number;
  generatedAt?: any;
}

export interface UserProfile {
  name: string;
  email: string;
  university: string;
  fieldOfStudy: string;
  plan: 'free' | 'pro';
  uploadCount: number;
  createdAt: any;
}
