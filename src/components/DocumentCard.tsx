import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Document } from '../types';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export const DocumentCard: React.FC<{ doc: Document, onDelete: (id: string) => void }> = ({ doc: document, onDelete }) => {
    const { user } = useAuth();
    const [mastery, setMastery] = useState(0);
    const [isEditing, setIsEditing] = useState(false);
    const [fileName, setFileName] = useState(document.fileName);

    useEffect(() => {
        if (!user) return;
        const q = query(
            collection(db, 'flashcards'),
            where('userId', '==', user.uid),
            where('documentId', '==', document.id)
        );
        return onSnapshot(q, (snapshot) => {
            const cards = snapshot.docs.map(d => d.data());
            if (cards.length === 0) {
                setMastery(0);
                return;
            }
            const gotIt = cards.filter(c => c.lastRating === 'got_it').length;
            setMastery(Math.round((gotIt / cards.length) * 100));
        });
    }, [document.id]);

    const handleUpdate = async () => {
        await updateDoc(doc(db, 'documents', document.id), { fileName });
        setIsEditing(false);
    };

    return (
        <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-start">
                <span className="bg-[#E6F4F1] text-[#0F7B6C] text-xs font-semibold px-3 py-1 rounded-full">{document.subject}</span>
                <span className="text-xs text-gray-500">{document.type.toUpperCase()}</span>
            </div>
            {isEditing ? (
                <input 
                    className="font-semibold text-lg border-b border-[#0F7B6C] w-full"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                />
            ) : (
                <h3 className="font-semibold text-lg">{document.fileName}</h3>
            )}
            
            <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                    <span>{document.flashcardCount || 0} Flashcards</span>
                    <span>{mastery}% Mastery</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#0F7B6C]" style={{ width: `${mastery}%` }}></div>
                </div>
            </div>

            <div className="flex gap-2 mt-auto pt-2">
                {isEditing ? (
                    <button onClick={handleUpdate} className="flex-1 bg-[#0F7B6C] text-white py-2 rounded-xl text-sm font-semibold">Save</button>
                ) : (
                    <button onClick={() => setIsEditing(true)} className="flex-1 bg-gray-100 py-2 rounded-xl text-sm font-semibold">Edit</button>
                )}
                <Link to={`/study/${document.id}/flashcards`} className="flex-1 bg-[#0F7B6C] text-white text-center py-2 rounded-xl text-sm font-semibold">Study</Link>
                <button onClick={() => onDelete(document.id)} className="bg-red-50 text-red-600 py-2 px-3 rounded-xl text-sm font-semibold">Delete</button>
            </div>
        </div>
    );
};
