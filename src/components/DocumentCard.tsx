import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Document } from '../types';
import { Link } from 'react-router-dom';

export const DocumentCard = ({ doc, onDelete }: { doc: Document, onDelete: (id: string) => void }) => {
    const [mastery, setMastery] = useState(0);

    useEffect(() => {
        const q = query(collection(db, 'flashcards'), where('documentId', '==', doc.id));
        return onSnapshot(q, (snapshot) => {
            const cards = snapshot.docs.map(d => d.data());
            if (cards.length === 0) {
                setMastery(0);
                return;
            }
            const gotIt = cards.filter(c => c.lastRating === 'got_it').length;
            setMastery(Math.round((gotIt / cards.length) * 100));
        });
    }, [doc.id]);

    return (
        <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-start">
                <span className="bg-[#E6F4F1] text-[#0F7B6C] text-xs font-semibold px-3 py-1 rounded-full">{doc.subject}</span>
                <span className="text-xs text-gray-500">{doc.type.toUpperCase()}</span>
            </div>
            <h3 className="font-semibold text-lg">{doc.fileName}</h3>
            
            <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                    <span>{doc.flashcardCount || 0} Flashcards</span>
                    <span>{mastery}% Mastery</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#0F7B6C]" style={{ width: `${mastery}%` }}></div>
                </div>
            </div>

            <div className="flex gap-2 mt-auto pt-2">
                <Link to={`/study/${doc.id}/flashcards`} className="flex-1 bg-[#0F7B6C] text-white text-center py-2 rounded-xl text-sm font-semibold">Study</Link>
                <Link to={`/study/${doc.id}/notes`} className="flex-1 border border-[#E5E7EB] text-[#0F7B6C] text-center py-2 rounded-xl text-sm font-semibold">Notes</Link>
                <button onClick={() => onDelete(doc.id)} className="bg-red-50 text-red-600 py-2 px-3 rounded-xl text-sm font-semibold">Delete</button>
            </div>
        </div>
    );
};
