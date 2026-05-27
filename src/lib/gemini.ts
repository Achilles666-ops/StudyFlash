import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

export const generateStudyMaterial = async (
  extractedText: string,
  options: { flashcards: boolean, summaryNotes: boolean }
) => {
  let requirements = "";
  let jsonSchemaPlaceholders = "";

  if (options.flashcards) {
    requirements += `
1. Up to 20 flashcards (field: "flashcards"). Each flashcard must:
   - Have a clear, specific question on the front
   - Have a concise, accurate answer on the back
   - Be tagged with difficulty: easy, medium, or hard
   - Focus on definitions, key concepts, formulas, dates, processes, or facts
`;
    jsonSchemaPlaceholders += `"flashcards": [
    {
      "question": "question here...",
      "answer": "answer here...",
      "difficulty": "easy"
    }
  ]`;
  } else {
    requirements += `\n- Do not generate any flashcards. Return "flashcards" as an empty array [].\n`;
    jsonSchemaPlaceholders += `"flashcards": []`;
  }

  if (options.summaryNotes) {
    requirements += `
2. Structured summary notes (field: "summary") containing:
   - 4 to 8 section headings matching the content structure
   - 3 to 6 bullet points per section
   - Up to 10 key terms (single words or short phrases)
   - Estimated reading time in minutes (integer)
`;
    jsonSchemaPlaceholders += `"summary": {
    "sections": [
      {
        "heading": "heading here...",
        "bullets": ["bullet point 1...", "bullet point 2..."]
      }
    ],
    "keyTerms": ["term 1", "term 2"],
    "estimatedReadMins": 5
  }`;
  } else {
    requirements += `\n- Do not generate any summary notes. Return "summary" as null.\n`;
    jsonSchemaPlaceholders += `"summary": null`;
  }

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: `Read this university lecture content carefully:

${extractedText}

Generate the following and return as a single JSON object.
Requirements: ${requirements}

Return ONLY this JSON and nothing else:
{
  ${jsonSchemaPlaceholders}
}`,
    config: {
        responseMimeType: "application/json",
    }
  });

  return JSON.parse(response.text || "{}");
};
