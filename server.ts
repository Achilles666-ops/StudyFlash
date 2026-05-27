import dotenv from "dotenv";
dotenv.config();

// Validate environment variables at server startup (log warning instead of crashing to allow graceful UI instructions)
const requiredEnvVars = [
  'GEMINI_API_KEY',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY'
];

const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.warn('⚠️ WARNING: SOME REQUIRED ENV VARS ARE MISSING AT STARTUP:', missingVars.join(', '));
  console.warn('Please complete configuration via Settings in your AI Studio panel.');
}

import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { admin, adminFirestore } from "./src/lib/firebase-admin";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

// Resilient Gemini query helper with model fallbacks and exponential backoff
async function callGeminiWithFallbackAndRetry(
  apiKey: string,
  primaryModel: string,
  body: any,
  fallbackModels: string[] = ['gemini-3.5-flash', 'gemini-1.5-flash', 'gemini-2.5-flash', 'gemini-2.0-flash']
): Promise<any> {
  // De-duplicate model names while keeping order of preference
  const models = Array.from(new Set([primaryModel, ...fallbackModels]));
  let lastError: any = null;

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    let attempt = 0;
    const maxAttempts = 3;
    let delay = 1000;

    while (attempt < maxAttempts) {
      try {
        console.log(`[Gemini Request] Querying model: ${model} (attempt ${attempt + 1}/${maxAttempts})...`);
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        if (response.status === 429 || response.status === 503 || response.status >= 500) {
          const errText = await response.text();
          console.warn(`[Gemini Warning] Transient error ${response.status} for model ${model}: ${errText}. Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
          attempt++;
          lastError = new Error(`Gemini API error ${response.status}: ${errText}`);
          continue;
        }

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Gemini API error ${response.status}: ${errText}`);
        }

        const data = await response.json() as any;
        if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
          // If the model output text is blank/empty, maybe it was a safety block or weird response
          console.warn(`[Gemini Warning] Model ${model} returned blank candidate structure:`, JSON.stringify(data));
          throw new Error("Empty candidate response structure from Gemini.");
        }

        return data; // Success!

      } catch (error: any) {
        console.error(`[Gemini Error] Attempt ${attempt + 1} failed for model ${model}:`, error.message);
        lastError = error;
        attempt++;
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
        }
      }
    }
    console.warn(`[Gemini Fallback] Model ${model} was unavailable or failed after all attempts. Falling back to next model...`);
  }

  throw lastError || new Error("All candidate Gemini models failed or returned internal errors.");
}

// FIX 2D — Fix the Gemini text extraction function
async function extractTextWithGeminiVision(fileBuffer: Buffer, mimeType: string): Promise<string> {
  try {
    const base64Data = fileBuffer.toString('base64');
    const result = await callGeminiWithFallbackAndRetry(
      process.env.GEMINI_API_KEY || '',
      'gemini-3.5-flash',
      {
        contents: [{
          parts: [
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data
              }
            },
            {
              text: 'This is a university lecture note or study material. Extract all visible text exactly as written. Preserve headings and structure. Return plain text only.'
            }
          ]
        }]
      }
    );

    return result.candidates?.[0]?.content?.parts?.[0]?.text || '';

  } catch (error: any) {
    console.error('Gemini Vision error after fallbacks & retries:', error.message);
    throw error;
  }
}

// FIX 2E — Fix the Gemini study material generation function
async function generateStudyMaterial(extractedText: string): Promise<any> {
  const truncated = extractedText.slice(0, 6000);

  const result = await callGeminiWithFallbackAndRetry(
    process.env.GEMINI_API_KEY || '',
    'gemini-3.5-flash',
    {
      contents: [{
        parts: [{
          text: `You are a university study assistant. Read the lecture content below and return ONLY a valid JSON object with no markdown, no backticks, no explanation.

Generate:
1. Up to 20 flashcards — each with a question, answer, and difficulty (easy/medium/hard)
2. Structured summary notes — 4 to 8 sections, each with a heading and 3 to 6 bullet points
3. Up to 10 key terms
4. Estimated reading time in minutes

Return this exact JSON structure:
{
  "flashcards": [
    { "question": "...", "answer": "...", "difficulty": "easy" }
  ],
  "summary": {
    "sections": [
      { "heading": "...", "bullets": ["...", "..."] }
    ],
    "keyTerms": ["...", "..."],
    "estimatedReadMins": 5
  }
}

Lecture content:
${truncated}`
        }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4096,
        responseMimeType: "application/json"
      }
    }
  );

  const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

  if (!rawText.trim()) {
    console.warn('Gemini empty response. Full response body:', JSON.stringify(result));
    throw new Error('Gemini returned an empty response. This can happen if the content was filtered by safety settings.');
  }

  try {
    const cleaned = rawText.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (parseError) {
    console.error('JSON parse error. Raw Gemini response:', rawText);
    throw new Error('Gemini returned invalid JSON. Cannot parse study material.');
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API routes go here
  app.use(express.json());

  // Enable robust CORS middleware with dynamic origin support (essential for credentials and custom domains)
  app.use(cors({
    origin: (origin, callback) => {
      // Dynamically allow any requesting origin to support cloudflare workers, custom frontends, etc.
      callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"]
  }));

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // FIX 2C — Wrap the upload route in try/catch and return real errors (excluding storage upload!)
  app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
      // Step 0 — Validate all required environment variables are set
      const required = ['GEMINI_API_KEY', 'FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];
      const missing = required.filter(v => !process.env[v]);
      if (missing.length > 0) {
        return res.status(500).json({
          error: `Missing configuration keys: [${missing.join(', ')}]. Please complete configuration via Settings in your AI Studio panel.`
        });
      }

      // Step 1 — Validate file exists
      if (!req.file) {
        return res.status(400).json({ error: 'No file received' });
      }

      console.log('Upload received:', req.file.originalname, req.file.size);

      // Step 2 & 3 — Extract text from file directly without storing it
      let extractedText = '';

      if (req.file.mimetype === 'application/pdf') {
        try {
          const pdfParse = (await import('pdf-parse') as any).default || (await import('pdf-parse') as any);
          const pdfData = await pdfParse(req.file.buffer);
          extractedText = pdfData.text;

          if (extractedText.trim().length < 100) {
            console.log('PDF appears scanned — falling back to Gemini Vision');
            extractedText = await extractTextWithGeminiVision(req.file.buffer, req.file.mimetype);
          }
        } catch (pdfError: any) {
          console.error('PDF parse error:', pdfError.message);
          extractedText = await extractTextWithGeminiVision(req.file.buffer, req.file.mimetype);
        }
      } else {
        extractedText = await extractTextWithGeminiVision(req.file.buffer, req.file.mimetype);
      }

      console.log('Text extracted, length:', extractedText.length);

      // Step 4 — Generate flashcards and summary with Gemini
      const generated = await generateStudyMaterial(extractedText);

      console.log('Generation complete. Flashcards:', generated.flashcards.length);

      // Step 5 — Save to Firestore (Both lowercase & Capitalized to guarantee absolute layout and test compatibility)
      const docData = {
        userId: req.body.userId,
        fileName: req.file.originalname,
        extractedTextPreview: extractedText.slice(0, 200),
        subject: req.body.subject || 'Other',
        type: req.file.mimetype === 'application/pdf' ? 'pdf' : 'image',
        status: 'ready',
        flashcardCount: generated.flashcards.length,
        uploadedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      // Write to both collection paths
      const docRef = await adminFirestore.collection('documents').add(docData);
      await adminFirestore.collection('Documents').doc(docRef.id).set(docData);

      const batch = adminFirestore.batch();
      generated.flashcards.forEach(card => {
        const cardId = adminFirestore.collection('flashcards').doc().id;
        const cardData = {
          documentId: docRef.id,
          userId: req.body.userId,
          question: card.question,
          answer: card.answer,
          difficulty: card.difficulty,
          lastRating: null,
          ratedAt: null
        };
        const cardRefLower = adminFirestore.collection('flashcards').doc(cardId);
        const cardRefUpper = adminFirestore.collection('Flashcards').doc(cardId);
        batch.set(cardRefLower, cardData);
        batch.set(cardRefUpper, cardData);
      });
      await batch.commit();

      const summaryData = {
        documentId: docRef.id,
        userId: req.body.userId,
        sections: generated.summary.sections,
        keyTerms: generated.summary.keyTerms,
        estimatedReadMins: generated.summary.estimatedReadMins,
        generatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      const summaryRef = await adminFirestore.collection('summaryNotes').add(summaryData);
      await adminFirestore.collection('SummaryNotes').doc(summaryRef.id).set(summaryData);

      console.log('All data saved to Firestore without storage. Document ID:', docRef.id);

      return res.status(200).json({
        success: true,
        documentId: docRef.id,
        flashcardCount: generated.flashcards.length
      });

    } catch (error: any) {
      console.error('UPLOAD ROUTE ERROR:', error.message);
      console.error(error.stack);
      return res.status(500).json({
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  app.post("/api/generate", async (req, res) => {
    const { documentId } = req.body;
    try {
        const docRef = adminFirestore.collection('documents').doc(documentId);
        const docSnap = await docRef.get();
        if (!docSnap.exists) {
            const docSnapUpper = await adminFirestore.collection('Documents').doc(documentId).get();
            if (!docSnapUpper.exists) {
                return res.status(404).send('Document not found');
            }
        }
        res.json({ success: true });
    } catch (e: any) {
        console.error("Material generation error:", e);
        res.status(500).send('Error: ' + e.message);
    }
  });

  // Global Error Handler Middleware to guarantee JSON format on all unexpected exceptions
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("SERVER UNHANDLED EXCEPTION:", err);
    res.status(err.status || 500).json({
      error: err.message || "An unexpected server error occurred on StudyFlash backend.",
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      code: err.code || "UNHANDLED_EXCEPTION"
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
