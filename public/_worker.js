// Base64url encoding utility for JWT signing
function base64url(str) {
  const binary = typeof str === 'string' ? new TextEncoder().encode(str) : str;
  return btoa(String.fromCharCode(...new Uint8Array(binary)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

// Import PEM format PKCS#8 private key for RS256 signing
async function importPrivateKey(pem) {
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  let pemContents = pem;
  if (pem.includes(pemHeader)) {
    pemContents = pem.substring(pem.indexOf(pemHeader) + pemHeader.length, pem.indexOf(pemFooter));
  }
  pemContents = pemContents.replace(/\s/g, "");
  
  const binaryDerString = atob(pemContents);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }
  
  return await crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );
}

// Generate Google OAuth2 Token for Firestore REST API
async function getFirestoreToken(env) {
  const privateKeyPem = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
  const clientEmail = env.FIREBASE_CLIENT_EMAIL;

  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };

  const headerB64 = base64url(JSON.stringify(header));
  const claimB64 = base64url(JSON.stringify(claim));
  const tokenInput = `${headerB64}.${claimB64}`;

  const cryptoKey = await importPrivateKey(privateKeyPem);
  const signatureBuffer = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(tokenInput)
  );

  const signatureB64 = base64url(new Uint8Array(signatureBuffer));
  const jwt = `${tokenInput}.${signatureB64}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to exchange JWT for token: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Helper to flat map Firestore fields structure to plain JSON object
function fromFirestoreFields(fields) {
  const result = {};
  if (!fields) return result;
  for (const [key, value] of Object.entries(fields)) {
    if (value.stringValue !== undefined) result[key] = value.stringValue;
    else if (value.integerValue !== undefined) result[key] = parseInt(value.integerValue, 10);
    else if (value.doubleValue !== undefined) result[key] = parseFloat(value.doubleValue);
    else if (value.booleanValue !== undefined) result[key] = value.booleanValue;
    else if (value.nullValue !== undefined) result[key] = null;
    else if (value.timestampValue !== undefined) result[key] = value.timestampValue;
    else if (value.arrayValue !== undefined) {
      result[key] = (value.arrayValue.values || []).map(v => {
        if (v.mapValue) {
          return fromFirestoreFields(v.mapValue.fields);
        }
        return v.stringValue || v.integerValue || v.doubleValue || v.booleanValue;
      });
    } else if (value.mapValue !== undefined) {
      result[key] = fromFirestoreFields(value.mapValue.fields);
    }
  }
  return result;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    // Route API requests to backend handlers
    if (url.pathname.startsWith('/api/')) {
      return handleAPI(request, url, env, corsHeaders)
    }

    // All other routes serve the frontend
    return env.ASSETS.fetch(request)
  }
}

async function handleAPI(request, url, env, corsHeaders) {
  try {
    // Health check
    if (url.pathname === '/api/health') {
      return Response.json(
        { status: 'ok', timestamp: Date.now() },
        { headers: corsHeaders }
      )
    }

    // Upload and generate
    if (url.pathname === '/api/upload' && request.method === 'POST') {
      return handleUpload(request, env, corsHeaders)
    }

    // Get flashcards for a document
    if (url.pathname.startsWith('/api/flashcards/') && request.method === 'GET') {
      if (url.pathname.startsWith('/api/flashcards/rate/')) {
        return handleRateFlashcard(request, env, corsHeaders)
      }
      const documentId = url.pathname.split('/')[3]
      return handleGetFlashcards(documentId, env, corsHeaders)
    }

    // Get summary notes for a document
    if (url.pathname.startsWith('/api/notes/') && request.method === 'GET') {
      const documentId = url.pathname.split('/')[3]
      return handleGetNotes(documentId, env, corsHeaders)
    }

    // Get all documents for a user
    if (url.pathname === '/api/documents' && request.method === 'GET') {
      const userId = url.searchParams.get('userId')
      return handleGetDocuments(userId, env, corsHeaders)
    }

    // Update flashcard rating (fallback/direct)
    if (url.pathname.startsWith('/api/flashcards/rate/') && request.method === 'POST') {
      return handleRateFlashcard(request, env, corsHeaders)
    }

    // Generate quiz
    if (url.pathname.startsWith('/api/quiz/') && request.method === 'GET') {
      const documentId = url.pathname.split('/')[3]
      return handleGenerateQuiz(documentId, env, corsHeaders)
    }

    // Delete document
    if (url.pathname.startsWith('/api/documents/') && request.method === 'DELETE') {
      const documentId = url.pathname.split('/')[3]
      return handleDeleteDocument(documentId, env, corsHeaders)
    }

    return Response.json(
      { error: 'Route not found' },
      { status: 404, headers: corsHeaders }
    )

  } catch (error) {
    console.error('API Error:', error.message)
    return Response.json(
      { error: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}

async function handleUpload(request, env, corsHeaders) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const userId = formData.get('userId')
    const subject = formData.get('subject') || 'Other'

    if (!file) {
      return Response.json(
        { error: 'No file received' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer()
    const base64 = btoa(
      String.fromCharCode(...new Uint8Array(arrayBuffer))
    )

    // Extract text using Gemini Vision
    const extractedText = await extractTextWithGemini(
      base64, 
      file.type, 
      env
    )

    if (!extractedText || extractedText.length < 50) {
      return Response.json(
        { error: 'Could not read content from this file. Please try a clearer image or text-based PDF.' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Generate study material
    const generated = await generateStudyMaterial(
      extractedText, 
      env
    )

    // Save to Firestore via REST API
    const documentId = await saveToFirestore(
      userId,
      file.name,
      subject,
      file.type,
      extractedText.slice(0, 200),
      generated,
      env
    )

    return Response.json(
      {
        success: true,
        documentId: documentId,
        flashcardCount: generated.flashcards.length
      },
      { headers: corsHeaders }
    )

  } catch (error) {
    console.error('Upload error:', error.message)
    return Response.json(
      { error: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}

async function extractTextWithGemini(base64, mimeType, env) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              inline_data: {
                mime_type: mimeType,
                data: base64
              }
            },
            {
              text: 'This is a university lecture note or study material. Extract all visible text. Preserve headings and structure. Return plain text only.'
            }
          ]
        }]
      })
    }
  )

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Gemini Vision failed: ${response.status} ${err}`)
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

async function generateStudyMaterial(extractedText, env) {
  const truncated = extractedText.slice(0, 6000)

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are a university study assistant. 
Read the content below and return ONLY a valid JSON object.
No markdown, no backticks, no explanation. Just raw JSON.

Return this exact structure:
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

Rules:
- Generate up to 20 flashcards
- Each flashcard: clear question, concise answer, 
  difficulty easy/medium/hard
- Generate 4 to 8 summary sections
- Each section: heading + 3 to 6 bullet points
- Up to 10 key terms
- Estimated reading time as integer

Content:
${truncated}`
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096,
          responseMimeType: "application/json"
        }
      })
    }
  )

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Gemini generation failed: ${response.status} ${err}`)
  }

  const data = await response.json()
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

  if (!rawText.trim()) {
    console.warn('Gemini empty response. Full response body:', JSON.stringify(data));
    throw new Error('Gemini returned an empty response. This can happen if the content was filtered by safety settings.');
  }

  try {
    const cleaned = rawText.replace(/```json|```/g, '').trim()
    return JSON.parse(cleaned)
  } catch (e) {
    console.error('JSON parse failed. Raw:', rawText.slice(0, 500))
    throw new Error('Gemini returned invalid JSON. Cannot parse study material.')
  }
}

async function saveToFirestore(userId, fileName, subject, 
  fileType, textPreview, generated, env) {

  const projectId = env.FIREBASE_PROJECT_ID
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`
  const token = await getFirestoreToken(env)

  // Save document record (Both lowercase 'documents' and uppercase 'Documents' collection to guarantee client match)
  const docFields = {
    userId: { stringValue: userId },
    fileName: { stringValue: fileName },
    subject: { stringValue: subject },
    type: { stringValue: fileType.includes('pdf') ? 'pdf' : 'image' },
    status: { stringValue: 'ready' },
    extractedTextPreview: { stringValue: textPreview },
    flashcardCount: { integerValue: generated.flashcards.length },
    uploadedAt: { timestampValue: new Date().toISOString() }
  };

  const docResponse = await fetch(`${baseUrl}/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ fields: docFields })
  })

  const docData = await docResponse.json()
  if (!docData.name) {
    throw new Error(`Firestore save failed: ${JSON.stringify(docData)}`);
  }
  const documentId = docData.name.split('/').pop()

  // Mirror document in "Documents" collection as well
  await fetch(`${baseUrl}/Documents/${documentId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ fields: docFields })
  });

  // Save flashcards to both "flashcards" and "Flashcards"
  for (const card of generated.flashcards) {
    const cardFields = {
      documentId: { stringValue: documentId },
      userId: { stringValue: userId },
      question: { stringValue: card.question },
      answer: { stringValue: card.answer },
      difficulty: { stringValue: card.difficulty },
      lastRating: { nullValue: null },
      ratedAt: { nullValue: null }
    };
    
    const cardResponse = await fetch(`${baseUrl}/flashcards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ fields: cardFields })
    });
    const cardResData = await cardResponse.json();
    const cardId = cardResData.name.split('/').pop();

    await fetch(`${baseUrl}/Flashcards/${cardId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ fields: cardFields })
    });
  }

  // Save summary notes to both "summaryNotes" and "SummaryNotes"
  const summaryFields = {
    documentId: { stringValue: documentId },
    userId: { stringValue: userId },
    sections: { 
      arrayValue: { 
        values: generated.summary.sections.map(s => ({
          mapValue: {
            fields: {
              heading: { stringValue: s.heading },
              bullets: {
                arrayValue: {
                  values: s.bullets.map(b => ({ stringValue: b }))
                }
              }
            }
          }
        }))
      }
    },
    keyTerms: {
      arrayValue: {
        values: generated.summary.keyTerms.map(t => ({ stringValue: t }))
      }
    },
    estimatedReadMins: { integerValue: generated.summary.estimatedReadMins },
    generatedAt: { timestampValue: new Date().toISOString() }
  };

  const summaryResponse = await fetch(`${baseUrl}/summaryNotes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ fields: summaryFields })
  })
  const summaryResData = await summaryResponse.json();
  const summaryId = summaryResData.name.split('/').pop();

  await fetch(`${baseUrl}/SummaryNotes/${summaryId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ fields: summaryFields })
  });

  return documentId
}

async function handleGetFlashcards(documentId, env, corsHeaders) {
  const projectId = env.FIREBASE_PROJECT_ID;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
  const token = await getFirestoreToken(env);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'flashcards' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'documentId' },
            op: 'EQUAL',
            value: { stringValue: documentId }
          }
        }
      }
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Firestore query failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  const cards = [];
  if (Array.isArray(data)) {
    for (const item of data) {
      if (item.document && item.document.fields) {
        const fields = fromFirestoreFields(item.document.fields);
        const id = item.document.name.split('/').pop();
        cards.push({ id, ...fields });
      }
    }
  }

  if (cards.length === 0) {
    const fallbackRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'Flashcards' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'documentId' },
              op: 'EQUAL',
              value: { stringValue: documentId }
            }
          }
        }
      })
    });
    if (fallbackRes.ok) {
      const fbData = await fallbackRes.json();
      if (Array.isArray(fbData)) {
        for (const item of fbData) {
          if (item.document && item.document.fields) {
            const fields = fromFirestoreFields(item.document.fields);
            const id = item.document.name.split('/').pop();
            cards.push({ id, ...fields });
          }
        }
      }
    }
  }

  return Response.json(cards, { headers: corsHeaders });
}

async function handleGetNotes(documentId, env, corsHeaders) {
  const projectId = env.FIREBASE_PROJECT_ID;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
  const token = await getFirestoreToken(env);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'summaryNotes' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'documentId' },
            op: 'EQUAL',
            value: { stringValue: documentId }
          }
        }
      }
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Firestore query failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  const notes = [];
  if (Array.isArray(data)) {
    for (const item of data) {
      if (item.document && item.document.fields) {
        const fields = fromFirestoreFields(item.document.fields);
        const id = item.document.name.split('/').pop();
        notes.push({ id, ...fields });
      }
    }
  }

  if (notes.length === 0) {
    const fallbackRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'SummaryNotes' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'documentId' },
              op: 'EQUAL',
              value: { stringValue: documentId }
            }
          }
        }
      })
    });
    if (fallbackRes.ok) {
      const fbData = await fallbackRes.json();
      if (Array.isArray(fbData)) {
        for (const item of fbData) {
          if (item.document && item.document.fields) {
            const fields = fromFirestoreFields(item.document.fields);
            const id = item.document.name.split('/').pop();
            notes.push({ id, ...fields });
          }
        }
      }
    }
  }

  return Response.json(notes[0] || null, { headers: corsHeaders });
}

async function handleGetDocuments(userId, env, corsHeaders) {
  const projectId = env.FIREBASE_PROJECT_ID;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
  const token = await getFirestoreToken(env);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'documents' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'userId' },
            op: 'EQUAL',
            value: { stringValue: userId }
          }
        }
      }
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Firestore query failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  const documents = [];
  if (Array.isArray(data)) {
    for (const item of data) {
      if (item.document && item.document.fields) {
        const fields = fromFirestoreFields(item.document.fields);
        const id = item.document.name.split('/').pop();
        documents.push({ id, ...fields });
      }
    }
  }

  if (documents.length === 0) {
    const fallbackRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'Documents' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'userId' },
              op: 'EQUAL',
              value: { stringValue: userId }
            }
          }
        }
      })
    });
    if (fallbackRes.ok) {
      const fbData = await fallbackRes.json();
      if (Array.isArray(fbData)) {
        for (const item of fbData) {
          if (item.document && item.document.fields) {
            const fields = fromFirestoreFields(item.document.fields);
            const id = item.document.name.split('/').pop();
            documents.push({ id, ...fields });
          }
        }
      }
    }
  }

  return Response.json(documents, { headers: corsHeaders });
}

async function handleRateFlashcard(request, env, corsHeaders) {
  const url = new URL(request.url);
  const cardId = url.pathname.split('/')[4];
  const body = await request.json();
  const rating = body.rating;

  const projectId = env.FIREBASE_PROJECT_ID;
  const token = await getFirestoreToken(env);

  const updateUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/flashcards/${cardId}?updateMask.fieldPaths=lastRating&updateMask.fieldPaths=ratedAt`;
  
  const response = await fetch(updateUrl, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      fields: {
        lastRating: { stringValue: rating },
        ratedAt: { timestampValue: new Date().toISOString() }
      }
    })
  });

  if (!response.ok) {
    const fallbackUpdateUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/Flashcards/${cardId}?updateMask.fieldPaths=lastRating&updateMask.fieldPaths=ratedAt`;
    await fetch(fallbackUpdateUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        fields: {
          lastRating: { stringValue: rating },
          ratedAt: { timestampValue: new Date().toISOString() }
        }
      })
    });
  }

  return Response.json({ success: true }, { headers: corsHeaders });
}

async function handleGenerateQuiz(documentId, env, corsHeaders) {
  const projectId = env.FIREBASE_PROJECT_ID;
  const token = await getFirestoreToken(env);
  const flashcardsUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
  
  const response = await fetch(flashcardsUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'flashcards' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'documentId' },
            op: 'EQUAL',
            value: { stringValue: documentId }
          }
        }
      }
    })
  });

  let cards = [];
  if (response.ok) {
    const data = await response.json();
    if (Array.isArray(data)) {
      for (const item of data) {
        if (item.document && item.document.fields) {
          cards.push(fromFirestoreFields(item.document.fields));
        }
      }
    }
  }

  if (cards.length === 0) {
    const fallbackRes = await fetch(flashcardsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'Flashcards' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'documentId' },
              op: 'EQUAL',
              value: { stringValue: documentId }
            }
          }
        }
      })
    });
    if (fallbackRes.ok) {
      const fbData = await fallbackRes.json();
      if (Array.isArray(fbData)) {
        for (const item of fbData) {
          if (item.document && item.document.fields) {
            cards.push(fromFirestoreFields(item.document.fields));
          }
        }
      }
    }
  }

  const prompt = `Based on these study questions, generate a multiple-choice quiz of up to 10 questions. For each question, provide 4 options, a correct answer, and an explanation.

Return ONLY a valid JSON object with the following structure:
{
  "questions": [
    {
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "correctAnswer": "...",
      "explanation": "..."
    }
  ]
}

Study questions data:
${JSON.stringify(cards.slice(0, 20))}`;

  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048
        }
      })
    }
  );

  if (!geminiResponse.ok) {
    const errText = await geminiResponse.text();
    throw new Error(`Gemini generate content failed: ${geminiResponse.status} ${errText}`);
  }

  const geminiData = await geminiResponse.json();
  const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const cleaned = rawText.replace(/```json|```/g, '').trim();
  const quiz = JSON.parse(cleaned);

  return Response.json(quiz, { headers: corsHeaders });
}

async function handleDeleteDocument(documentId, env, corsHeaders) {
  const projectId = env.FIREBASE_PROJECT_ID;
  const token = await getFirestoreToken(env);
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

  await fetch(`${baseUrl}/documents/${documentId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  await fetch(`${baseUrl}/Documents/${documentId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  return Response.json({ success: true, message: "Document deleted successfully" }, { headers: corsHeaders });
}
