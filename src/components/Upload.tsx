import React, { useState, useRef } from 'react';
import { Upload as UploadIcon, FileText, BookOpen, X, CheckCircle, Loader2, AlertTriangle, Copy, RefreshCw } from 'lucide-react';
import { auth } from '../lib/firebase';

interface DiagnosticError {
    message: string;
    status?: number;
    statusText?: string;
    endpoint?: string;
    responseBody?: string;
    isNetworkError?: boolean;
}

const SUBJECTS = ["Biology", "Chemistry", "Physics", "Mathematics", "Engineering", "Law", "Business", "History", "Computer Science", "Medicine", "Other"];

const getApiUrl = (endpoint: string) => {
    return endpoint;
};

export const Upload = () => {
    const [file, setFile] = useState<File | null>(null);
    const [subject, setSubject] = useState('');
    const [options, setOptions] = useState({ flashcards: true, summaryNotes: true });
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState<{ step: string, status: 'pending' | 'loading' | 'done' }[] | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [errorDetails, setErrorDetails] = useState<DiagnosticError | null>(null);
    const [copied, setCopied] = useState(false);

    const copyToClipboard = () => {
        if (!errorDetails) return;
        const diagnosticsString = JSON.stringify({
            timestamp: new Date().toISOString(),
            localTime: new Date().toLocaleTimeString(),
            url: window.location.href,
            endpoint: errorDetails.endpoint,
            statusCode: errorDetails.status,
            statusText: errorDetails.statusText,
            isNetworkError: errorDetails.isNetworkError,
            errorMessage: errorDetails.message,
            responseBody: errorDetails.responseBody
        }, null, 2);

        navigator.clipboard.writeText(`Here is the exact diagnostic information from my failed upload/generation step:\n\n\`\`\`json\n${diagnosticsString}\n\`\`\``)
            .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            })
            .catch(() => {
                alert("Failed to write to clipboard, but you can copy the text manually from the black debug box below!");
            });
    };

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
        setErrorDetails(null);
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
            let uploadRes;
            try {
                uploadRes = await fetch(getApiUrl('/api/upload'), {
                    method: 'POST',
                    body: formData
                });
            } catch (netErr: any) {
                throw {
                    message: `Network Connection Failed. The backend server on the Cloud Run console might be restarting or taking a cold-start: ${netErr.message}`,
                    endpoint: '/api/upload',
                    isNetworkError: true
                };
            }

            if (!uploadRes.ok) {
                let errMsg = "Local file upload failed. Please try again.";
                let rawText = "";
                try {
                    rawText = await uploadRes.text();
                    try {
                        const errData = JSON.parse(rawText);
                        if (errData && errData.error) {
                            errMsg = errData.error;
                        } else {
                            errMsg = rawText;
                        }
                    } catch (_) {
                        if (rawText) errMsg = rawText;
                    }
                } catch (_) {}
                
                throw {
                    message: errMsg,
                    status: uploadRes.status,
                    statusText: uploadRes.statusText,
                    endpoint: '/api/upload',
                    responseBody: rawText || errMsg
                };
            }

            const uploadData = await uploadRes.json();
            const documentId = uploadData.documentId;

            setProgress(p => p?.map((s, i) => i === 0 ? { ...s, status: 'done' } : (i === 1 ? { ...s, status: 'loading' } : s)) || null);

            // Call backend generation endpoint with structural switches
            let genRes;
            try {
                genRes = await fetch(getApiUrl('/api/generate'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ documentId, options })
                });
            } catch (netErr: any) {
                throw {
                    message: `Network Connection Failed during material assembly: ${netErr.message}`,
                    endpoint: '/api/generate',
                    isNetworkError: true
                };
            }

            if (!genRes.ok) {
                let errMsg = "AI generation for study material failed.";
                let rawText = "";
                try {
                    rawText = await genRes.text();
                    try {
                        const errData = JSON.parse(rawText);
                        if (errData && errData.error) {
                            errMsg = errData.error;
                        } else {
                            errMsg = rawText;
                        }
                    } catch (_) {
                        if (rawText) errMsg = rawText;
                    }
                } catch (_) {}

                throw {
                    message: errMsg,
                    status: genRes.status,
                    statusText: genRes.statusText,
                    endpoint: '/api/generate',
                    responseBody: rawText || errMsg
                };
            }

            setProgress(p => p?.map(s => ({ ...s, status: 'done' })) || null);
            setUploading(false);
            alert("Upload successful! AI has populated your study library!");
            setFile(null);
            setSubject('');
            setProgress(null);
        } catch (error: any) {
            console.error("Study Upload Error captured:", error);
            setErrorDetails({
                message: error.message || "An unexpected error occurred during study generation.",
                status: error.status,
                statusText: error.statusText,
                endpoint: error.endpoint || '/api/upload',
                responseBody: error.responseBody,
                isNetworkError: !!error.isNetworkError
            });
            setUploading(false);
            setProgress(null);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-sm border border-[#E5E7EB]">
            <h2 className="text-2xl font-bold mb-6">Upload & Generate</h2>

            {errorDetails && (
                <div className="mb-6 p-5 bg-rose-50 border border-rose-200 rounded-xl relative overflow-hidden transition-all duration-300">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex gap-2 text-rose-800 font-bold items-center">
                            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                            <h3 className="text-base font-semibold">AI Diagnostic & Troubleshooting Panel</h3>
                        </div>
                        <button 
                            className="p-1 hover:bg-rose-100 rounded text-rose-500 hover:text-rose-700 transition cursor-pointer"
                            onClick={() => setErrorDetails(null)}
                            title="Dismiss error"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <p className="text-sm text-rose-700 mt-2 font-medium">
                        {errorDetails.message}
                    </p>

                    {/* Metadata Grid */}
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-rose-800 bg-rose-100/50 p-3 rounded-lg border border-rose-200">
                        <div>
                            <span className="font-bold text-rose-900 block">Requested Endpoint</span>
                            <code className="font-mono">{errorDetails.endpoint}</code>
                        </div>
                        <div>
                            <span className="font-bold text-rose-900 block">HTTP Code / Status</span>
                            <code className="font-mono bg-rose-200/60 px-1 py-0.5 rounded">
                                {errorDetails.isNetworkError ? 'Network Connection Failure' : `${errorDetails.status} ${errorDetails.statusText || ''}`}
                            </code>
                        </div>
                    </div>

                    {/* Copyable Raw Payload for AI */}
                    <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-rose-900 uppercase tracking-wider">Troubleshooting Logs</span>
                            <button
                                onClick={copyToClipboard}
                                className="flex items-center gap-1.5 text-xs bg-white text-[#0F7B6C] border border-[#0F7B6C]/20 px-2.5 py-1.5 rounded-lg shadow-sm hover:bg-gray-50 active:scale-95 transition cursor-pointer font-bold"
                            >
                                {copied ? (
                                    <>
                                        <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                                        <span>Copied!</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-3.5 h-3.5" />
                                        <span>Copy logs for AI Assistant</span>
                                    </>
                                )}
                            </button>
                        </div>
                        
                        {errorDetails.responseBody && (
                            <div className="relative">
                                <pre className="font-mono text-[11px] bg-slate-900 text-green-400 p-3.5 rounded-lg max-h-36 overflow-y-auto border border-slate-800 leading-relaxed select-all">
                                    {errorDetails.responseBody}
                                </pre>
                            </div>
                        )}
                    </div>

                    <div className="mt-4 flex gap-2 justify-end text-xs">
                        <button 
                            onClick={async () => {
                                setErrorDetails(null);
                                await generateMaterial();
                            }}
                            className="flex items-center gap-1 bg-[#0F7B6C] text-white font-bold py-2 px-3 rounded-lg hover:bg-[#0c665a] transition cursor-pointer"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Retry Study Generation</span>
                        </button>
                    </div>
                </div>
            )}

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
