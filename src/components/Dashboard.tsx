import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export const Dashboard = () => {
    const [stats, setStats] = useState({ docs: 0, cards: 0 });

    useEffect(() => {
        if (!auth.currentUser) return;
        
        const fetchData = async () => {
            const docsQ = query(collection(db, 'documents'), where('userId', '==', auth.currentUser!.uid));
            const docsSnap = await getDocs(docsQ);
            
            const flashcardsQ = query(collection(db, 'flashcards'), where('userId', '==', auth.currentUser!.uid));
            const cardsSnap = await getDocs(flashcardsQ);
            
            setStats({ docs: docsSnap.size, cards: cardsSnap.size });
        };
        fetchData();
    }, []);

    return (
        <div className="flex flex-col gap-8">
            <div className="greeting">
                <h1 className="text-2xl font-bold">Welcome back, {auth.currentUser?.displayName?.split(' ')[0] || 'User'} 👋</h1>
                <p className="text-[#6B7280]">Ready to master your classes? Here is your study progress.</p>
            </div>
            
            <div className="grid grid-cols-4 gap-6">
                {[
                    { label: 'Documents', value: stats.docs.toString() },
                    { label: 'Flashcards', value: stats.cards.toString() },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-sm">
                        <div className="text-[#6B7280] text-xs font-medium uppercase tracking-wider mb-2">{stat.label}</div>
                        <div className="text-2xl font-bold text-[#1A1A1A]">{stat.value}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};
