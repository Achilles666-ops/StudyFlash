import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { admin, adminDb, adminStorage } from "./src/lib/firebase-admin";
import { generateStudyMaterial } from "./src/lib/gemini";
import { extractTextFromPDF } from "./src/lib/pdf";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API routes go here
  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Handle file uploads on the server to prevent standard Storage CORS issue
  app.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
      const { userId, subject } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).send("No file was uploaded.");
      }

      const storagePath = `documents/${userId}/${Date.now()}_${file.originalname}`;
      const bucket = adminStorage.bucket();
      const fileRef = bucket.file(storagePath);

      // Upload file directly from Node backend to Cloud Storage securely (no CORS rules block server operations)
      await fileRef.save(file.buffer, {
        metadata: { contentType: file.mimetype }
      });

      // Save document status 'processing'
      const docRef = await adminDb.collection('documents').add({
        userId,
        fileName: file.originalname,
        fileUrl: storagePath,
        subject,
        type: file.mimetype.includes('pdf') ? 'pdf' : 'image',
        status: 'processing',
        uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
        flashcardCount: 0
      });

      res.json({ success: true, documentId: docRef.id });
    } catch (error) {
      console.error("CORS Bypass Upload Error:", error);
      res.status(500).send("Server file upload failed");
    }
  });

  app.post("/api/generate", async (req, res) => {
    const { documentId, options } = req.body;
    try {
        const docRef = adminDb.collection('documents').doc(documentId);
        const docSnap = await docRef.get();
        if (!docSnap.exists) return res.status(404).send('Document not found');
        const docData = docSnap.data();

        const file = adminStorage.bucket().file(docData!.fileUrl);
        const [buffer] = await file.download();

        const text = await extractTextFromPDF(buffer);

        // Generate study material dynamically based on selected user options
        const material = await generateStudyMaterial(text, options || { flashcards: true, summaryNotes: true });
        
        let flashcardCount = 0;
        if (options?.flashcards && material.flashcards && material.flashcards.length > 0) {
            const batch = adminDb.batch();
            for (const card of material.flashcards) {
                const ref = adminDb.collection('flashcards').doc();
                batch.set(ref, {
                    documentId,
                    userId: docData!.userId,
                    ...card,
                    lastRating: null,
                    ratedAt: null
                });
            }
            await batch.commit();
            flashcardCount = material.flashcards.length;
        }

        if (options?.summaryNotes && material.summary) {
            await adminDb.collection('summaryNotes').add({
                documentId,
                userId: docData!.userId,
                ...material.summary,
                generatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        
        await docRef.update({ 
            status: 'ready', 
            flashcardCount 
        });
        
        res.json({ success: true });
    } catch (e) {
        console.error("Material generation error:", e);
        res.status(500).send('Error');
    }
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
