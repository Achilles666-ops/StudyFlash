import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthProvider';
import { Link } from 'react-router-dom';
import { LogOut, User, BookOpen, AlertCircle, ArrowRight, Brain, CheckCircle, BarChart3, HelpingHand } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

interface DocumentMasteryData {
    id: string;
    fileName: string;
    subject: string;
    flashcardCount: number;
    mastery: number;
    totalCards: number;
    masteredCards: number;
}

export const Dashboard = () => {
    const { user, logout } = useAuth();
    const [stats, setStats] = useState({ docs: 0, cards: 0 });
    const [loadingStats, setLoadingStats] = useState(false);
    const [docDataList, setDocDataList] = useState<DocumentMasteryData[]>([]);

    useEffect(() => {
        if (!user) return;
        
        const fetchData = async () => {
            setLoadingStats(true);
            try {
                // Fetch all documents of the user
                const docsQ = query(collection(db, 'documents'), where('userId', '==', user.uid));
                const docsSnap = await getDocs(docsQ);
                
                // Fetch all flashcards of the user
                const flashcardsQ = query(collection(db, 'flashcards'), where('userId', '==', user.uid));
                const cardsSnap = await getDocs(flashcardsQ);
                const cards = cardsSnap.docs.map(doc => doc.data());
                
                // Map documents and calculate active recall mastery
                const mappedDocs: DocumentMasteryData[] = docsSnap.docs.map(docSnap => {
                    const docData = docSnap.data();
                    const docId = docSnap.id;
                    
                    // Filter cards belonging to this document
                    const docCards = cards.filter(c => c.documentId === docId);
                    const totalCards = docCards.length;
                    const masteredCards = docCards.filter(c => c.lastRating === 'got_it').length;
                    const mastery = totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0;
                    
                    return {
                        id: docId,
                        fileName: docData.fileName || 'Untitled Document',
                        subject: docData.subject || 'General Study',
                        flashcardCount: docData.flashcardCount || totalCards,
                        mastery,
                        totalCards,
                        masteredCards
                    };
                });
                
                setStats({ docs: docsSnap.size, cards: cardsSnap.size });
                setDocDataList(mappedDocs);
            } catch (err) {
                console.error("Error loading interactive stats:", err);
            } finally {
                setLoadingStats(false);
            }
        };
        fetchData();
    }, [user]);

    // Top 5 documents needing focus (sorted by mastery ascending, i.e., lowest mastery first)
    // Only consider documents that have at least 1 flashcard for a meaningful focus priority
    const focusNeededDocs = [...docDataList]
        .sort((a, b) => {
            // First sort by mastery ascending
            if (a.mastery !== b.mastery) return a.mastery - b.mastery;
            // Then by total cards descending so important sheets stand out
            return b.totalCards - a.totalCards;
        })
        .slice(0, 5);

    // Custom Tooltip component for a highly cohesive StudyFlash brand style
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data: DocumentMasteryData = payload[0].payload;
            return (
                <div className="bg-slate-900 border border-slate-800 text-white p-4 rounded-xl shadow-xl space-y-1.5 text-xs max-w-sm">
                    <p className="font-bold text-sm truncate">{data.fileName}</p>
                    <div className="flex gap-2 items-center text-slate-400">
                        <span className="bg-slate-800 text-slate-300 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider text-[9px]">{data.subject}</span>
                        <span>•</span>
                        <span>{data.totalCards} cards</span>
                    </div>
                    <div className="pt-1 select-none flex items-center justify-between font-mono">
                        <span className="text-slate-400">Mastery Level:</span>
                        <span className={`font-bold ${data.mastery < 40 ? 'text-red-400' : data.mastery < 75 ? 'text-amber-400' : 'text-emerald-400'}`}>{data.mastery}%</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-sans italic leading-tight">
                        {data.masteredCards} of {data.totalCards} answers mastered.
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="flex flex-col gap-8">
            {/* Action Bar Header */}
            <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Workspace Management</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Control your privacy settings and personal preferences</p>
                </div>
                <div className="flex gap-3">
                    <Link to="/profile" className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-[#E5E7EB] px-4 py-2.5 rounded-xl font-semibold text-xs transition">
                        <User className="w-3.5 h-3.5" />
                        Settings
                    </Link>
                    <button 
                        onClick={() => logout()} 
                        className="flex items-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-600 px-4 py-2.5 rounded-xl font-semibold text-xs transition cursor-pointer"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign Out
                    </button>
                </div>
            </div>

            {/* Greeting */}
            <div className="greeting select-none">
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                    Welcome back, {user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'Scholar'} 👋
                </h1>
                <p className="text-[#6B7280] text-sm mt-1">Acknowledge your progress, master recall loops, and identify weak spots before exam day.</p>
            </div>
            
            {/* Top Level Summary Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Assigned Lectures', value: stats.docs, icon: <BookOpen className="w-5 h-5 text-indigo-600" />, bg: 'bg-indigo-50/50 border-indigo-100' },
                    { label: 'Generated Flashcards', value: stats.cards, icon: <Brain className="w-5 h-5 text-[#0F7B6C]" />, bg: 'bg-teal-50/50 border-teal-100' },
                    { label: 'Average Mastery', value: docDataList.length > 0 ? `${Math.round(docDataList.reduce((acc, d) => acc + d.mastery, 0) / docDataList.length)}%` : '0%', icon: <CheckCircle className="w-5 h-5 text-emerald-600" />, bg: 'bg-emerald-50/50 border-emerald-100' },
                    { label: 'Attention Needed', value: docDataList.filter(d => d.mastery < 60).length, icon: <AlertCircle className="w-5 h-5 text-rose-600" />, bg: 'bg-rose-50/50 border-rose-100' },
                ].map((stat, i) => (
                    <div key={i} className={`bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex items-center justify-between gap-4 ${stat.bg}`}>
                        <div className="space-y-1">
                            <span className="text-[#6B7280] text-[10px] font-bold uppercase tracking-widest block">{stat.label}</span>
                            <span className="text-2xl font-extrabold text-gray-900 leading-none">
                                {loadingStats ? <span className="opacity-30 inline-block animate-pulse">...</span> : stat.value}
                            </span>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-gray-100 shadow-xs">
                            {stat.icon}
                        </div>
                    </div>
                ))}
            </div>

            {/* Core Visualization & focus-needed area layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Mastery Bar Chart Section */}
                <div className="bg-white border border-[#E5E7EB] rounded-3xl p-6 shadow-xs lg:col-span-7 flex flex-col gap-6">
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <h3 className="font-extrabold text-gray-900 tracking-tight text-lg flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-[#0F7B6C]" /> Focus Prioritization Tracker
                            </h3>
                            <p className="text-xs text-gray-400">Your top 5 active documents listed by study mastery. Target lower bars first.</p>
                        </div>
                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-md">
                            Active Recall Loops
                        </span>
                    </div>

                    {loadingStats ? (
                        <div className="h-80 w-full flex flex-col items-center justify-center gap-3">
                            <div className="w-8 h-8 border-3 border-[#0F7B6C] border-t-transparent rounded-full animate-spin" />
                            <p className="text-xs text-gray-400">Loading interactive metrics...</p>
                        </div>
                    ) : docDataList.length === 0 ? (
                        <div className="h-80 w-full border border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-center p-6 bg-gray-50/50">
                            <HelpingHand className="w-12 h-12 text-gray-300 mb-2" />
                            <h4 className="font-bold text-gray-700 text-sm">No study metrics compiled yet</h4>
                            <p className="text-xs text-gray-400 max-w-xs mt-1 mb-4">
                                Once you upload a lecture PDF or slide image and rate your flashcards, your dynamic mastery scores will populate here.
                            </p>
                            <Link to="/upload" className="bg-[#0F7B6C] hover:bg-teal-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition">
                                Upload Study Material
                            </Link>
                        </div>
                    ) : (
                        <div className="h-80 w-full font-sans">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={focusNeededDocs}
                                    margin={{ top: 10, right: 10, left: -25, bottom: 10 }}
                                    barSize={28}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                                    <XAxis 
                                        dataKey="fileName" 
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fill: '#6B7280', fontSize: 10, fontWeight: 500 }}
                                        tickFormatter={(name) => name.length > 12 ? `${name.substring(0, 10)}...` : name}
                                    />
                                    <YAxis 
                                        domain={[0, 100]}
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fill: '#6B7280', fontSize: 10, fontWeight: 500 }}
                                        tickFormatter={(val) => `${val}%`}
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', radius: 8 }} />
                                    <Bar dataKey="mastery" radius={[6, 6, 0, 0]}>
                                        {focusNeededDocs.map((entry, index) => {
                                            // Dynamic coloring depending on mastery percentage
                                            let barColor = "#0FA48F"; // Brand teal / mid-high
                                            if (entry.mastery < 45) {
                                                barColor = "#F43F5E"; // Warm Rose needing priority focus
                                            } else if (entry.mastery < 75) {
                                                barColor = "#F59E0B"; // Amber intermediate focus
                                            } else {
                                                barColor = "#0F7B6C"; // Expert brand teal
                                            }
                                            return <Cell key={`cell-${index}`} fill={barColor} />;
                                        })}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Focus Priorities & Actionable list items */}
                <div className="bg-white border border-[#E5E7EB] rounded-3xl p-6 shadow-xs lg:col-span-5 flex flex-col gap-5">
                    <div>
                        <h3 className="font-extrabold text-gray-900 tracking-tight text-lg">Focus Priorities</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Documents requiring active review loops first</p>
                    </div>

                    <div className="space-y-3.5 flex-1 overflow-y-auto max-h-80 pr-1">
                        {loadingStats ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="h-16 bg-gray-50/80 rounded-xl border animate-pulse" />
                            ))
                        ) : focusNeededDocs.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-6">
                                <p className="text-xs text-gray-400 font-medium">No weak areas. Go study some files!</p>
                            </div>
                        ) : (
                            focusNeededDocs.map((docItem) => (
                                <div 
                                    key={docItem.id} 
                                    className="bg-white border border-gray-100 hover:border-gray-200 rounded-2xl p-4 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] transition flex items-center justify-between gap-4"
                                >
                                    <div className="space-y-1.5 min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="bg-slate-100 border border-slate-200 text-slate-600 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider text-[8px] select-none">
                                                {docItem.subject}
                                            </span>
                                            <span className={`text-[9px] font-bold px-1.5 rounded-full uppercase leading-relaxed ${
                                                docItem.mastery < 45 ? 'bg-rose-50 text-rose-600' : docItem.mastery < 75 ? 'bg-amber-50 text-amber-600' : 'bg-teal-50 text-[#0F7B6C]'
                                            }`}>
                                                {docItem.mastery < 45 ? 'High Alert' : docItem.mastery < 75 ? 'Advancing' : 'Mastered'}
                                            </span>
                                        </div>
                                        <h4 className="font-bold text-gray-800 text-xs truncate leading-snug" title={docItem.fileName}>
                                            {docItem.fileName}
                                        </h4>
                                        <div className="flex items-center gap-3">
                                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden select-none">
                                                <div 
                                                    className={`h-full rounded-full ${
                                                        docItem.mastery < 45 ? 'bg-rose-500' : docItem.mastery < 75 ? 'bg-amber-500' : 'bg-teal-500'
                                                    }`} 
                                                    style={{ width: `${docItem.mastery}%` }} 
                                                />
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-400">{docItem.mastery}% Score</span>
                                        </div>
                                    </div>
                                    
                                    <Link 
                                        to={`/study/${docItem.id}`} 
                                        className="shrink-0 p-2.5 bg-[#E6F4F1] hover:bg-[#0F7B6C]/10 text-[#0F7B6C] rounded-xl font-bold text-xs transition flex items-center gap-1.5"
                                    >
                                        Study <ArrowRight className="w-3.5 h-3.5" />
                                    </Link>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="pt-2 border-t border-gray-100">
                        <Link 
                            to="/library" 
                            className="w-full py-2.5 border border-dashed border-gray-200 hover:border-[#0F7B6C] hover:bg-teal-50/20 text-gray-500 hover:text-[#0F7B6C] text-xs font-bold text-center block rounded-xl transition"
                        >
                            View Entire Study Library
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};
