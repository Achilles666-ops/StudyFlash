import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { admin, adminDb, adminStorage } from "./src/lib/firebase-admin";
import { generateStudyMaterial } from "./src/lib/gemini";
import { extractTextFromPDF } from "./src/lib/pdf";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API routes go here
  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/generate", async (req, res) => {
    const { documentId } = req.body;
    try {
        const docRef = adminDb.collection('documents').doc(documentId);
        const docSnap = await docRef.get();
        if (!docSnap.exists) return res.status(404).send('Document not found');
        const docData = docSnap.data();

        const file = adminStorage.bucket().file(docData!.fileUrl);
        const [buffer] = await file.download();

        const text = await extractTextFromPDF(buffer);

        const material = await generateStudyMaterial(text);
        
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

        await adminDb.collection('summaryNotes').add({
            documentId,
            userId: docData!.userId,
            ...material.summary,
            generatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        await docRef.update({ status: 'ready', flashcardCount: material.flashcards.length });
        
        res.json({ success: true });
    } catch (e) {
        console.error(e);
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
