export interface Document {
  id: string;
  userId: string;
  fileName: string;
  fileUrl: string;
  subject: string;
  type: 'pdf' | 'image';
  pageCount: number;
  status: 'processing' | 'ready' | 'failed';
  flashcardCount: number;
  uploadedAt: any; // Firestore timestamp
}
