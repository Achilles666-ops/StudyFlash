import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthProvider';

export const Dashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({ docs: 0, cards: 0 });
    const [loadingStats, setLoadingStats] = useState(false);

    useEffect(() => {
        if (!user) return;
        
        const fetchData = async () => {
            setLoadingStats(true);
            try {
                const docsQ = query(collection(db, 'documents'), where('userId', '==', user.uid));
                const docsSnap = await getDocs(docsQ);
                
                const flashcardsQ = query(collection(db, 'flashcards'), where('userId', '==', user.uid));
                const cardsSnap = await getDocs(flashcardsQ);
                
                setStats({ docs: docsSnap.size, cards: cardsSnap.size });
            } catch (err) {
                console.error("Error loading stats:", err);
            } finally {
                setLoadingStats(false);
            }
        };
        fetchData();
    }, [user]);

    return (
        <div className="flex flex-col gap-8">
            <div className="greeting">
                <h1 className="text-2xl font-bold">
                    Welcome back, {user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'User'} 👋
                </h1>
                <p className="text-[#6B7280]">Ready to master your classes? Here is your study progress.</p>
            </div>
            
            <div className="grid grid-cols-4 gap-6">
                {[
                    { label: 'Documents', value: stats.docs.toString() },
                    { label: 'Flashcards', value: stats.cards.toString() },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-sm">
                        <div className="text-[#6B7280] text-xs font-medium uppercase tracking-wider mb-2">{stat.label}</div>
                        <div className="text-2xl font-bold text-[#1A1A1A]">
                            {loadingStats ? (
                                <span className="text-gray-300 animate-pulse">...</span>
                            ) : (
                                stat.value
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
