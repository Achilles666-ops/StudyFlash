import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthProvider';
import { Link } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';

export const Dashboard = () => {
    const { user, logout } = useAuth();
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
            <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm">
                <h2 className="text-lg font-bold mb-4">Account Actions</h2>
                <div className="flex gap-4">
                    <Link to="/profile" className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl font-semibold text-sm transition">
                        <User className="w-4 h-4" />
                        Profile Settings
                    </Link>
                    <button 
                        onClick={() => {
                            console.log("[Dashboard] Logout button clicked");
                            logout();
                        }} 
                        className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-xl font-semibold text-sm transition"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
            </div>

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
