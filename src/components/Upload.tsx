import React, { useState, useRef } from 'react';
import { Upload as UploadIcon, FileText, BookOpen, X, CheckCircle, Loader2 } from 'lucide-react';
import { auth } from '../lib/firebase';

const SUBJECTS = ["Biology", "Chemistry", "Physics", "Mathematics", "Engineering", "Law", "Business", "History", "Computer Science", "Medicine", "Other"];

const getApiUrl = (endpoint: string) => {
    // If loaded on a .run.app origin (dev, pre, production), fetch is relative
    if (window.location.hostname.endsWith('run.app') || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return endpoint;
    }
    // Since we are actively developing, all Node.js backend updates run on the dev container:
    return `https://ais-dev-vg24chvlvykrjt5uirzy5w-501871590058.asia-east1.run.app${endpoint}`;
};

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
        if (!options.flashcards && !options.summaryNotes) {
            alert("Please select at least one study material format (Flashcards or Summary Notes) to generate.");
            return;
        }

        setUploading(true);
        setProgress([
            { step: 'Uploading file securely...', status: 'loading' },
            { step: 'Extracting educational content...', status: 'pending' },
            { step: 'AI generating custom materials...', status: 'pending' }
        ]);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('userId', auth.currentUser.uid);
            formData.append('subject', subject);

            // Upload via backend server route, avoiding Firebase client Storage CORS blocks
            const uploadRes = await fetch(getApiUrl('/api/upload'), {
                method: 'POST',
                body: formData
            });

            if (!uploadRes.ok) {
                throw new Error("Local file upload failed. Please try again.");
            }

            const uploadData = await uploadRes.json();
            const documentId = uploadData.documentId;

            setProgress(p => p?.map((s, i) => i === 0 ? { ...s, status: 'done' } : (i === 1 ? { ...s, status: 'loading' } : s)) || null);

            // Call backend generation endpoint with structural switches
            const genRes = await fetch(getApiUrl('/api/generate'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentId, options })
            });

            if (!genRes.ok) {
                throw new Error("AI generation for study material failed.");
            }

            setProgress(p => p?.map(s => ({ ...s, status: 'done' })) || null);
            setUploading(false);
            alert("Upload successful! AI has populated your study library!");
            setFile(null);
            setSubject('');
            setProgress(null);
        } catch (error: any) {
            console.error("Study Upload Error:", error);
            alert(error.message || "An error occurred during study generation.");
            setUploading(false);
            setProgress(null);
        }
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
                            <span className="font-medium truncate max-w-[400px]">{file.name}</span>
                        </div>
                        <button onClick={() => setFile(null)} disabled={uploading}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Select Subject:</label>
                        <select className="w-full p-3 rounded-xl border border-[#E5E7EB] bg-white focus:outline-none focus:ring-2 focus:ring-[#0F7B6C]" value={subject} onChange={(e) => setSubject(e.target.value)} disabled={uploading}>
                            <option value="">Choose a study subject...</option>
                            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700">Choose Materials to Generate:</label>
                        <div className="grid grid-cols-2 gap-4">
                            {/* Flashcards Toggle Card */}
                            <div 
                                className={`p-4 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${options.flashcards ? 'border-[#0F7B6C] bg-[#F0FDF4]' : 'border-gray-200 bg-white hover:border-gray-300'} ${uploading ? 'pointer-events-none opacity-60' : ''}`}
                                onClick={() => setOptions(p => ({ ...p, flashcards: !p.flashcards }))}
                            >
                                <div className="flex justify-between items-start">
                                    <span className="p-2 bg-[#E6F4F1] rounded-lg text-[#0F7B6C]">
                                        <FileText className="w-5 h-5" />
                                    </span>
                                    {/* Custom toggle pill */}
                                    <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${options.flashcards ? 'bg-[#0F7B6C]' : 'bg-gray-200'}`}>
                                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${options.flashcards ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <h4 className="font-bold text-gray-900 leading-snug">Flashcards</h4>
                                    <p className="text-xs text-gray-500 mt-1 lines-2">Generate active-recall practice cards tagged by topic and difficulty.</p>
                                    <span className={`inline-block mt-3 text-xs font-bold px-2 py-1 rounded ${options.flashcards ? 'bg-[#E6F4F1] text-[#0F7B6C]' : 'bg-gray-100 text-gray-500'}`}>
                                        {options.flashcards ? 'ENABLED ✅' : 'DISABLED ❌'}
                                    </span>
                                </div>
                            </div>

                            {/* Summary Notes Toggle Card */}
                            <div 
                                className={`p-4 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${options.summaryNotes ? 'border-[#0F7B6C] bg-[#F0FDF4]' : 'border-gray-200 bg-white hover:border-gray-300'} ${uploading ? 'pointer-events-none opacity-60' : ''}`}
                                onClick={() => setOptions(p => ({ ...p, summaryNotes: !p.summaryNotes }))}
                            >
                                <div className="flex justify-between items-start">
                                    <span className="p-2 bg-[#E6F4F1] rounded-lg text-[#0F7B6C]">
                                        <BookOpen className="w-5 h-5" />
                                    </span>
                                    {/* Custom toggle pill */}
                                    <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${options.summaryNotes ? 'bg-[#0F7B6C]' : 'bg-gray-200'}`}>
                                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${options.summaryNotes ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <h4 className="font-bold text-gray-900 leading-snug">Summary Notes</h4>
                                    <p className="text-xs text-gray-500 mt-1 lines-2">Synthesizes key concepts into organized headings and reference points.</p>
                                    <span className={`inline-block mt-3 text-xs font-bold px-2 py-1 rounded ${options.summaryNotes ? 'bg-[#E6F4F1] text-[#0F7B6C]' : 'bg-gray-100 text-gray-500'}`}>
                                        {options.summaryNotes ? 'ENABLED ✅' : 'DISABLED ❌'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button className="w-full bg-[#0F7B6C] hover:bg-[#0c665a] transition text-white py-3.5 rounded-xl font-bold cursor-pointer disabled:opacity-50" onClick={generateMaterial} disabled={uploading || !subject}>
                        {uploading ? 'AI Processing Study Material...' : 'Generate Study Material'}
                    </button>
                </div>
            )}
             {progress && (
                <div className="mt-6 p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-3">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Upload & Build Progress</h4>
                    {progress.map((p, i) => (
                        <div key={i} className="flex items-center gap-2.5 text-sm font-medium">
                            {p.status === 'done' ? (
                                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                            ) : p.status === 'loading' ? (
                                <Loader2 className="w-5 h-5 text-[#0F7B6C] animate-spin flex-shrink-0" />
                            ) : (
                                <div className="w-5 h-5 rounded-full border border-gray-300 flex-shrink-0" />
                            )}
                            <span className={p.status === 'done' ? 'text-gray-500 line-through' : p.status === 'loading' ? 'text-gray-900 font-bold' : 'text-gray-400'}>
                                {p.step}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
