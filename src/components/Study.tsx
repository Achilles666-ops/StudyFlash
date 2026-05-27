import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Document, Flashcard, SummaryNote } from '../types';
import { ArrowLeft, BookOpen, FileText, ChevronLeft, ChevronRight, RefreshCw, Star } from 'lucide-react';

export const Study = () => {
    const { documentId } = useParams<{ documentId: string }>();
    const [document, setDocument] = useState<Document | null>(null);
    const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
    const [summaryNote, setSummaryNote] = useState<SummaryNote | null>(null);
    const [activeTab, setActiveTab] = useState<'flashcards' | 'notes'>('flashcards');

    // Flashcards state
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!documentId) return;

        // Fetch document info
        const docRef = doc(db, 'documents', documentId);
        getDoc(docRef).then(snap => {
            if (snap.exists()) {
                setDocument({ id: snap.id, ...snap.data() } as Document);
            }
        });

        // Listen for flashcards
        const qCards = query(collection(db, 'flashcards'), where('documentId', '==', documentId));
        const unsubCards = onSnapshot(qCards, (snapshot) => {
            const cards = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Flashcard));
            setFlashcards(cards);
            setLoading(false);
        }, (err) => {
            console.error("Error subscribing cards:", err);
            setLoading(false);
        });

        // Listen for summary notes
        const qNotes = query(collection(db, 'summaryNotes'), where('documentId', '==', documentId));
        const unsubNotes = onSnapshot(qNotes, (snapshot) => {
            if (!snapshot.empty) {
                // Take the first generated notes object
                const firstNote = snapshot.docs[0];
                setSummaryNote({ id: firstNote.id, ...firstNote.data() } as SummaryNote);
            } else {
                setSummaryNote(null);
            }
        });

        return () => {
            unsubCards();
            unsubNotes();
        };
    }, [documentId]);

    const handleRateCard = async (cardId: string, rating: 'review_again' | 'almost' | 'got_it') => {
        try {
            const cardRef = doc(db, 'flashcards', cardId);
            await updateDoc(cardRef, {
                lastRating: rating,
                ratedAt: serverTimestamp()
            });

            // Auto advance on successful rate if not at end
            if (currentIndex < flashcards.length - 1) {
                setIsFlipped(false);
                setTimeout(() => {
                    setCurrentIndex(prev => prev + 1);
                }, 150);
            }
        } catch (error) {
            console.error("Failed to update rating:", error);
        }
    };

    const handleNext = () => {
        if (currentIndex < flashcards.length - 1) {
            setIsFlipped(false);
            setCurrentIndex(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setIsFlipped(false);
            setCurrentIndex(prev => prev - 1);
        }
    };

    const handleResetReview = async () => {
        if (!confirm("Are you sure you want to clear your study progress for this deck?")) return;
        try {
            for (const card of flashcards) {
                const cardRef = doc(db, 'flashcards', card.id);
                await updateDoc(cardRef, {
                    lastRating: null,
                    ratedAt: null
                });
            }
            setCurrentIndex(0);
            setIsFlipped(false);
            alert("Study statistics reset successfully.");
        } catch (error) {
            console.error("Failed resetting stats:", error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="text-[#0F7B6C] font-semibold flex items-center gap-2 animate-pulse">
                    <RefreshCw className="animate-spin" /> Loading study setup...
                </div>
            </div>
        );
    }

    const currentCard = flashcards[currentIndex];
    const totalRated = flashcards.filter(c => c.lastRating !== null).length;
    const answeredGotIt = flashcards.filter(c => c.lastRating === 'got_it').length;
    const masteryRate = flashcards.length > 0 ? Math.round((answeredGotIt / flashcards.length) * 100) : 0;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Upper navigation row */}
            <div className="flex items-center justify-between">
                <Link to="/library" className="flex items-center gap-2 text-sm text-[#6B7280] hover:text-brand-teal font-medium transition">
                    <ArrowLeft className="w-4 h-4" /> Back to My Library
                </Link>
                <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                    <button 
                        onClick={() => setActiveTab('flashcards')}
                        className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition ${activeTab === 'flashcards' ? 'bg-white text-brand-teal shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        <FileText className="w-4 h-4" /> Flashcards ({flashcards.length})
                    </button>
                    <button 
                        onClick={() => setActiveTab('notes')}
                        className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition ${activeTab === 'notes' ? 'bg-white text-brand-teal shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        <BookOpen className="w-4 h-4" /> Summary Notes
                    </button>
                </div>
            </div>

            {/* Header info */}
            <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm flex items-center justify-between">
                <div>
                    <span className="bg-[#E6F4F1] text-[#0F7B6C] text-xs font-semibold px-3 py-1 rounded-full">{document?.subject || "Subject"}</span>
                    <h2 className="text-xl font-bold text-gray-900 mt-2">{document?.fileName || "Loading paper..."}</h2>
                </div>
                {flashcards.length > 0 && (
                    <div className="text-right">
                        <div className="text-xs text-gray-500 font-medium">Deck Mastery</div>
                        <div className="text-2xl font-bold text-[#0F7B6C] mt-0.5">{masteryRate}%</div>
                        <div className="text-[10px] text-gray-400 font-medium">{answeredGotIt} of {flashcards.length} "Got It"</div>
                    </div>
                )}
            </div>

            {activeTab === 'flashcards' ? (
                <div className="space-y-6">
                    {flashcards.length === 0 ? (
                        <div className="bg-white border rounded-2xl p-12 text-center text-gray-500">
                            <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="font-semibold text-lg">No Flashcards Found</p>
                            <p className="text-sm text-gray-400 mt-1">Flashcards option wasn't toggled on upon uploading this doc.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-6">
                            {/* Card Display block */}
                            <div 
                                className="min-h-[280px] w-full bg-white border border-[#E5E7EB] rounded-2xl shadow-xs cursor-pointer select-none transition-all duration-300 hover:shadow-md flex items-center justify-center p-8 text-center relative overflow-hidden"
                                onClick={() => setIsFlipped(!isFlipped)}
                            >
                                <span className="absolute top-4 left-4 text-xs font-bold text-gray-300 tracking-wider">
                                    {isFlipped ? 'BACK - ANSWER' : 'FRONT - QUESTION'}
                                </span>
                                <span className="absolute top-4 right-4 bg-gray-100 text-[#6B7280] text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                                    Difficulty: {currentCard?.difficulty || 'Medium'}
                                </span>

                                <div className="max-w-[85%]">
                                    {isFlipped ? (
                                        <p className="text-xl font-medium text-[#0F7B6C] leading-relaxed transition duration-200">
                                            {currentCard?.answer}
                                        </p>
                                    ) : (
                                        <p className="text-2xl font-semibold text-gray-900 leading-snug transition duration-200">
                                            {currentCard?.question}
                                        </p>
                                    )}
                                </div>

                                <div className="absolute bottom-4 text-xs text-gray-400 font-medium">
                                    Click anywhere on the card to flip
                                </div>
                            </div>

                            {/* Deck controls */}
                            <div className="flex items-center justify-between">
                                <button 
                                    onClick={handlePrev}
                                    disabled={currentIndex === 0}
                                    className="p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition disabled:opacity-40 disabled:pointer-events-none"
                                >
                                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                                </button>
                                
                                <span className="text-sm font-semibold text-gray-700">
                                    Card {currentIndex + 1} of {flashcards.length}
                                </span>

                                <button 
                                    onClick={handleNext}
                                    disabled={currentIndex === flashcards.length - 1}
                                    className="p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition disabled:opacity-40 disabled:pointer-events-none"
                                >
                                    <ChevronRight className="w-5 h-5 text-gray-600" />
                                </button>
                            </div>

                            {/* Review Rating Panel */}
                            {isFlipped && (
                                <div className="bg-[#F9FAFB] border border-[#E5E7EB] p-5 rounded-2xl flex flex-col items-center gap-4 transition animate-fade-in">
                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Rate your active recall:</div>
                                    <div className="grid grid-cols-3 gap-3 w-full max-w-md">
                                        <button 
                                            onClick={() => handleRateCard(currentCard.id, 'review_again')}
                                            className={`py-3.5 rounded-xl text-xs font-bold transition border cursor-pointer ${currentCard.lastRating === 'review_again' ? 'bg-red-500 border-red-500 text-white' : 'bg-white border-red-200 text-red-600 hover:bg-red-50'}`}
                                        >
                                            Review Again 🔴
                                        </button>
                                        <button 
                                            onClick={() => handleRateCard(currentCard.id, 'almost')}
                                            className={`py-3.5 rounded-xl text-xs font-bold transition border cursor-pointer ${currentCard.lastRating === 'almost' ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-orange-200 text-orange-600 hover:bg-orange-50'}`}
                                        >
                                            Almost Got It 🟡
                                        </button>
                                        <button 
                                            onClick={() => handleRateCard(currentCard.id, 'got_it')}
                                            className={`py-3.5 rounded-xl text-xs font-bold transition border cursor-pointer ${currentCard.lastRating === 'got_it' ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-green-200 text-green-700 hover:bg-green-50'}`}
                                        >
                                            Got It! 🟢
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Extra Deck maintenance buttons */}
                            {totalRated > 0 && (
                                <div className="text-center">
                                    <button 
                                        onClick={handleResetReview}
                                        className="text-xs font-semibold text-gray-400 hover:text-red-500 transition inline-flex items-center gap-1.5"
                                    >
                                        <RefreshCw className="w-3 h-3" /> Reset deck study statistics
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    {!summaryNote || !summaryNote.sections || summaryNote.sections.length === 0 ? (
                        <div className="bg-white border rounded-2xl p-12 text-center text-gray-500">
                            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="font-semibold text-lg">No Summary Notes Found</p>
                            <p className="text-sm text-gray-400 mt-1">Summary Notes were toggled off upon uploading this document.</p>
                        </div>
                    ) : (
                        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 shadow-sm space-y-8">
                            {/* Read Time indicator */}
                            {summaryNote.estimatedReadMins && (
                                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 bg-gray-50 border px-3 py-1.5 rounded-lg w-fit">
                                    <BookOpen className="w-3.5 h-3.5 text-brand-teal" />
                                    Estimated Reading Time: <span className="text-gray-900 font-semibold">{summaryNote.estimatedReadMins} minutes</span>
                                </div>
                            )}

                            {/* Render Summary Sections */}
                            <div className="space-y-6">
                                {summaryNote.sections.map((section, idx) => (
                                    <div key={idx} className="border-b border-gray-100 pb-5 last:border-0 last:pb-0">
                                        <h3 className="text-lg font-bold text-gray-900 mb-2.5 flex items-center gap-2">
                                            <span className="w-1.5 h-6 bg-brand-teal rounded-full" />
                                            {section.heading}
                                        </h3>
                                        <ul className="list-disc list-inside pl-2 space-y-1.5 text-sm text-[#4B5563] leading-relaxed">
                                            {section.bullets.map((bullet, bIdx) => (
                                                <li key={bIdx} className="marker:text-brand-teal">{bullet}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>

                            {/* Render Highlighted Key Terms if existent */}
                            {summaryNote.keyTerms && summaryNote.keyTerms.length > 0 && (
                                <div className="pt-6 border-t border-gray-100 space-y-3">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Key Study Terms & Vocab:</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {summaryNote.keyTerms.map((term, tIdx) => (
                                            <span key={tIdx} className="bg-gray-100 border text-gray-700 text-xs px-2.5 py-1 rounded-md font-medium">
                                                {term}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
