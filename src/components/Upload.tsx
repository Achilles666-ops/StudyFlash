import { useState, useRef, useCallback } from 'react';
import { Upload as UploadIcon, FileText, X, CheckCircle, Loader2 } from 'lucide-react';
import { storage, db, auth } from '../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const SUBJECTS = ["Biology", "Chemistry", "Physics", "Mathematics", "Engineering", "Law", "Business", "History", "Computer Science", "Medicine", "Other"];

export const Upload = () => {
    const [file, setFile] = useState<File | null>(null);
    const [subject, setSubject] = useState('');
    const [options, setOptions] = useState({ flashcards: true, summaryNotes: true });
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState<{ step: string, status: 'pending' | 'loading' | 'done' }[] | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const onFileDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleFile = (file: File) => {
        if (file.size > 20 * 1024 * 1024) {
            alert("File too large. Maximum size is 20MB");
            return;
        }
        setFile(file);
    };

    const generateMaterial = async () => {
        if (!file || !subject || !auth.currentUser) return;
        setUploading(true);
        setProgress([
            { step: 'File Uploaded', status: 'pending' },
            { step: 'Reading Content...', status: 'pending' },
            { step: 'Identifying Key Concepts...', status: 'pending' },
            { step: 'Generating Flashcards...', status: 'pending' },
            { step: 'Building Summary Notes...', status: 'pending' }
        ]);

        const storageRef = ref(storage, `documents/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed', 
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                if (progress === 100) setProgress(p => p?.map((s, i) => i === 0 ? {...s, status: 'done'} : s) || null);
            },
            (error) => {
                console.error(error);
                setUploading(false);
            },
            async () => {
                const docRef = await addDoc(collection(db, 'documents'), {
                    userId: auth.currentUser!.uid,
                    fileName: file.name,
                    fileUrl: storageRef.fullPath, // Use storage path directly
                    subject,
                    type: file.type.includes('pdf') ? 'pdf' : 'image',
                    status: 'processing',
                    uploadedAt: serverTimestamp()
                });
                
                await fetch('/api/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ documentId: docRef.id })
                });

                setUploading(false);
                alert("Upload successful! AI is processing...");
            }
        );
    };

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-sm border border-[#E5E7EB]">
            <h2 className="text-2xl font-bold mb-6">Upload & Generate</h2>
            {!file ? (
                <div 
                    className="border-2 border-dashed border-[#0F7B6C] rounded-2xl p-12 text-center bg-[#E6F4F1] cursor-pointer"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={onFileDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <UploadIcon className="w-12 h-12 text-[#0F7B6C] mx-auto mb-4" />
                    <p className="text-[#0F7B6C] font-semibold text-lg">Drag & drop files or click to browse</p>
                    <p className="text-[#6B7280] text-sm mt-2">Supports PDF, JPG, PNG (Max 20MB)</p>
                    <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => e.target.files && handleFile(e.target.files[0])} accept=".pdf,.jpg,.jpeg,.png" />
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-[#E5E7EB]">
                        <div className="flex items-center gap-3">
                            <FileText className="w-8 h-8 text-[#0F7B6C]" />
                            <span className="font-medium">{file.name}</span>
                        </div>
                        <button onClick={() => setFile(null)}><X className="w-5 h-5 text-gray-400" /></button>
                    </div>

                    <select className="w-full p-3 rounded-xl border border-[#E5E7EB]" value={subject} onChange={(e) => setSubject(e.target.value)}>
                        <option value="">Select Subject</option>
                        {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>

                    <div className="flex gap-4">
                        <button className={`flex-1 p-3 rounded-xl border ${options.flashcards ? 'bg-[#0F7B6C] text-white border-[#0F7B6C]' : 'border-[#E5E7EB]'}`} onClick={() => setOptions(p => ({...p, flashcards: !p.flashcards}))}>Flashcards</button>
                        <button className={`flex-1 p-3 rounded-xl border ${options.summaryNotes ? 'bg-[#0F7B6C] text-white border-[#0F7B6C]' : 'border-[#E5E7EB]'}`} onClick={() => setOptions(p => ({...p, summaryNotes: !p.summaryNotes}))}>Summary Notes</button>
                    </div>

                    <button className="w-full bg-[#0F7B6C] text-white py-3 rounded-xl font-bold" onClick={generateMaterial} disabled={uploading}>Generate Study Material</button>
                </div>
            )}
             {progress && (
                <div className="mt-6 space-y-2">
                    {progress.map((p, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm font-medium">
                            {p.status === 'done' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Loader2 className="w-4 h-4 animate-spin" />}
                            {p.step}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
