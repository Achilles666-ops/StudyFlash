import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

export const generateStudyMaterial = async (extractedText: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: `Read this university lecture content carefully.
     
     Generate the following and return as a single JSON object:
     
     1. Up to 20 flashcards. Each flashcard must:
        - Have a clear, specific question on the front
        - Have a concise, accurate answer on the back
        - Be tagged with difficulty: easy, medium, or hard
        - Focus on: definitions, key concepts, formulas, dates, 
          processes, or important facts
     
     2. Structured summary notes with:
        - 4 to 8 section headings matching the content structure
        - 3 to 6 bullet points per section
        - Up to 10 key terms (single words or short phrases)
        - Estimated reading time in minutes (integer)
     
     Return ONLY this JSON and nothing else:
     {
       "flashcards": [
         {
           "question": "...",
           "answer": "...",
           "difficulty": "easy"
         }
       ],
       "summary": {
         "sections": [
           {
             "heading": "...",
             "bullets": ["...", "..."]
           }
         ],
         "keyTerms": ["...", "..."],
         "estimatedReadMins": 5
       }
     }
     
     Content to process:
     ${extractedText}`,
    config: {
        responseMimeType: "application/json",
    }
  });

  return JSON.parse(response.text || "{}");
};
