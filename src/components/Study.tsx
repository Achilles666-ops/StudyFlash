import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Document, Flashcard, SummaryNote } from '../types';
import { ArrowLeft, BookOpen, FileText, ChevronLeft, ChevronRight, RefreshCw, Star, HelpCircle, CheckCircle2, XCircle, Award } from 'lucide-react';
import { useAuth } from './AuthProvider';

const getApiUrl = (endpoint: string) => {
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        const port = window.location.port;
        // Target Cloud Run backend if accessed outside port 3000
        if (hostname.includes('workers.dev') || 
            hostname.includes('pages.dev') || 
            hostname.includes('github.io') || 
            (hostname === 'localhost' && port !== '3000')) {
            return `https://studyflash-304586748698.asia-east1.run.app${endpoint}`;
        }
    }
    return endpoint;
};

export const Study = () => {
    const { user } = useAuth();
    const { documentId } = useParams<{ documentId: string }>();
    const [document, setDocument] = useState<Document | null>(null);
    const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
    const [summaryNote, setSummaryNote] = useState<SummaryNote | null>(null);
    const [activeTab, setActiveTab] = useState<'flashcards' | 'notes' | 'quiz'>('flashcards');

    // Flashcards state
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [loading, setLoading] = useState(true);

    // Quiz state
    const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
    const [loadingQuiz, setLoadingQuiz] = useState(false);
    const [quizAnswers, setQuizAnswers] = useState<{ [key: number]: number }>({});
    const [quizCurrentIndex, setQuizCurrentIndex] = useState(0);
    const [showQuizScore, setShowQuizScore] = useState(false);
    const [quizError, setQuizError] = useState('');

    const loadQuiz = async () => {
        if (!documentId) return;
        setLoadingQuiz(true);
        setQuizError('');
        setQuizAnswers({});
        setQuizCurrentIndex(0);
        setShowQuizScore(false);
        try {
            const apiRes = await fetch(getApiUrl(`/api/quiz/${documentId}`));
            if (!apiRes.ok) {
                throw new Error(`Failed to load quiz. HTTP Code: ${apiRes.status}`);
            }
            const data = await apiRes.json();
            if (data && data.questions && data.questions.length > 0) {
                setQuizQuestions(data.questions);
            } else {
                throw new Error("No quiz questions returned from AI service. Please retry.");
            }
        } catch (err: any) {
            console.error("Quiz load error:", err);
            setQuizError(err.message || "An unexpected error occurred while generating the quiz.");
        } finally {
            setLoadingQuiz(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'quiz' && quizQuestions.length === 0 && !loadingQuiz && !quizError) {
            loadQuiz();
        }
    }, [activeTab]);

    useEffect(() => {
        if (!user || !documentId) return;

        // Fetch document info
        const docRef = doc(db, 'documents', documentId);
        getDoc(docRef).then(snap => {
            if (snap.exists()) {
                setDocument({ id: snap.id, ...snap.data() } as Document);
            }
        });

        // Listen for flashcards
        const qCards = query(
            collection(db, 'flashcards'),
            where('userId', '==', user.uid),
            where('documentId', '==', documentId)
        );
        const unsubCards = onSnapshot(qCards, (snapshot) => {
            const cards = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Flashcard));
            setFlashcards(cards);
            setLoading(false);
        }, (err) => {
            console.error("Error subscribing cards:", err);
            setLoading(false);
        });

        // Listen for summary notes
        const qNotes = query(
            collection(db, 'summaryNotes'),
            where('userId', '==', user.uid),
            where('documentId', '==', documentId)
        );
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
    }, [user, documentId]);

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
                    <button 
                        onClick={() => setActiveTab('quiz')}
                        className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition ${activeTab === 'quiz' ? 'bg-white text-brand-teal shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        <Award className="w-4 h-4" /> Comprehension Quiz
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

            {activeTab === 'flashcards' && (
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
            )}

            {activeTab === 'notes' && (
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

            {activeTab === 'quiz' && (
                <div className="space-y-6">
                    {loadingQuiz ? (
                        <div className="bg-white border rounded-2xl p-16 text-center shadow-xs flex flex-col items-center justify-center space-y-4">
                            <RefreshCw className="w-10 h-10 text-[#0F7B6C] animate-spin mb-2" />
                            <h3 className="text-lg font-bold text-gray-900">Assembling Practice Exam...</h3>
                            <p className="text-sm text-gray-500 max-w-sm">
                                AI is analyzing your document vocab and flashcard difficulties to generate active-recall multiple choice questions.
                            </p>
                        </div>
                    ) : quizError ? (
                        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center space-y-4">
                            <XCircle className="w-12 h-12 text-rose-500 mx-auto" />
                            <h3 className="text-lg font-bold text-rose-900">Quiz Generation Deferred</h3>
                            <p className="text-sm text-rose-700 max-w-md mx-auto">
                                {quizError}
                            </p>
                            <button 
                                onClick={loadQuiz}
                                className="bg-[#0F7B6C] hover:bg-[#0c665a] text-white font-bold px-6 py-2.5 rounded-xl text-sm transition cursor-pointer inline-flex items-center gap-2"
                            >
                                <RefreshCw className="w-4 h-4" /> Retry Generating Quiz
                            </button>
                        </div>
                    ) : quizQuestions.length === 0 ? (
                        <div className="bg-white border rounded-2xl p-12 text-center text-gray-500">
                            <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="font-semibold text-lg">Practice Quiz</p>
                            <p className="text-sm text-gray-400 mt-1 mb-6">Test your comprehension score to spot studying gaps before the real exam!</p>
                            <button 
                                onClick={loadQuiz}
                                className="bg-[#0F7B6C] hover:bg-[#0c665a] text-white font-bold px-6 py-3 rounded-xl transition cursor-pointer"
                            >
                                Start Comprehension Quiz
                            </button>
                        </div>
                    ) : showQuizScore ? (
                        <div className="space-y-6">
                            {/* Score Card Banner */}
                            {(() => {
                                const total = quizQuestions.length;
                                const correctCount = quizQuestions.filter((q, idx) => {
                                    const answerStr = q.correctAnswer;
                                    const selectedIdx = quizAnswers[idx];
                                    if (selectedIdx === undefined) return false;
                                    const selectedOptionText = q.options[selectedIdx];
                                    return selectedOptionText === answerStr || 
                                           answerStr.startsWith(selectedOptionText) || 
                                           selectedOptionText.startsWith(answerStr) ||
                                           (answerStr.length === 1 && "ABCD".indexOf(answerStr) === selectedIdx);
                                }).length;
                                const pct = Math.round((correctCount / total) * 100);
                                
                                let badgeText = "Struggling Cadet 🎯";
                                let badgeColor = "bg-rose-50 text-rose-700 border-rose-200";
                                if (pct >= 90) {
                                    badgeText = "Study Flash Master 👑";
                                    badgeColor = "bg-emerald-100 text-emerald-800 border-emerald-200";
                                } else if (pct >= 75) {
                                    badgeText = "Honors Scholar 🎓";
                                    badgeColor = "bg-teal-100 text-teal-800 border-teal-200";
                                } else if (pct >= 50) {
                                    badgeText = "Rising Academic 📈";
                                    badgeColor = "bg-amber-100 text-amber-800 border-amber-200";
                                }

                                return (
                                    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                                        <div className="space-y-2 text-center md:text-left">
                                            <span className={`inline-block border text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${badgeColor}`}>
                                                {badgeText}
                                            </span>
                                            <h3 className="text-2xl font-bold text-gray-900">Your Comprehension Score</h3>
                                            <p className="text-sm text-gray-500">Spot your studying gaps and review explanations below to achieve exam-ready mastery.</p>
                                        </div>
                                        <div className="text-center shrink-0">
                                            <div className="text-5xl font-black text-[#0F7B6C]">{pct}%</div>
                                            <div className="text-xs text-gray-400 font-bold mt-1">{correctCount} of {total} Questions Correct</div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Detailed diagnostics and review guidelines */}
                            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 shadow-sm space-y-6">
                                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Spot Studying Gaps - Question Breakdown</h4>
                                <div className="space-y-6 divide-y divide-gray-100">
                                    {quizQuestions.map((q, idx) => {
                                        const selectedIdx = quizAnswers[idx];
                                        const selectedOptionText = q.options[selectedIdx];
                                        const answerStr = q.correctAnswer;
                                        
                                        const isCorrect = selectedOptionText === answerStr || 
                                           answerStr.startsWith(selectedOptionText) || 
                                           selectedOptionText.startsWith(answerStr) ||
                                           (answerStr.length === 1 && "ABCD".indexOf(answerStr) === selectedIdx);

                                        return (
                                            <div key={idx} className="pt-5 first:pt-0 space-y-3">
                                                <div className="flex gap-2 items-start">
                                                    <span className={`p-1 rounded-full shrink-0 ${isCorrect ? 'text-green-600' : 'text-red-500'}`}>
                                                        {isCorrect ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                                                    </span>
                                                    <h5 className="font-bold text-gray-900 text-sm leading-snug">
                                                        Question {idx + 1}: {q.question}
                                                    </h5>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-7">
                                                    {q.options.map((option: string, oIdx: number) => {
                                                        const isSelected = selectedIdx === oIdx;
                                                        const isCorrectOpt = option === answerStr || 
                                                            answerStr.startsWith(option) || 
                                                            option.startsWith(answerStr) ||
                                                            (answerStr.length === 1 && "ABCD".indexOf(answerStr) === oIdx);

                                                        let optionClass = "bg-gray-50 border-gray-100 text-gray-600";
                                                        if (isCorrectOpt) {
                                                            optionClass = "bg-green-50 border-green-200 text-green-800 font-bold";
                                                        } else if (isSelected) {
                                                            optionClass = "bg-red-50 border-red-200 text-red-800 font-semibold";
                                                        }

                                                        return (
                                                            <div key={oIdx} className={`p-2.5 rounded-lg border text-xs ${optionClass}`}>
                                                                <span className="font-mono mr-1">{String.fromCharCode(65 + oIdx)})</span>
                                                                {option}
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {q.explanation && (
                                                    <div className="bg-amber-50 border border-amber-100 p-3.5 rounded-xl pl-7 text-xs text-amber-900 leading-relaxed font-medium">
                                                        <span className="font-bold">AI Explanation:</span> {q.explanation}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="text-center">
                                <button 
                                    onClick={loadQuiz}
                                    className="bg-[#0F7B6C] hover:bg-[#0c665a] text-white font-bold px-8 py-3.5 rounded-2xl transition cursor-pointer inline-flex items-center gap-2"
                                >
                                    <RefreshCw className="w-4 h-4" /> Start Fresh Practice Exam
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 shadow-sm space-y-6">
                            {/* Progressive quiz run layout */}
                            {(() => {
                                const q = quizQuestions[quizCurrentIndex];
                                const selectedIdx = quizAnswers[quizCurrentIndex];
                                const hasAnswered = selectedIdx !== undefined;

                                return (
                                    <div className="space-y-6">
                                        {/* Progressive Score Tracker Header */}
                                        <div className="flex items-center justify-between border-b pb-4">
                                            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                                Exam Prep Mode
                                            </div>
                                            <div className="text-xs font-semibold text-[#0F7B6C]">
                                                Question {quizCurrentIndex + 1} of {quizQuestions.length}
                                            </div>
                                        </div>

                                        {/* Tracker percentage line */}
                                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-[#0F7B6C] transition-all duration-300"
                                                style={{ width: `${((quizCurrentIndex + 1) / quizQuestions.length) * 100}%` }}
                                            />
                                        </div>

                                        {/* Question state */}
                                        <div className="py-4">
                                            <h3 className="text-xl font-bold text-gray-900 leading-snug">
                                                {q.question}
                                            </h3>
                                        </div>

                                        {/* 4 Choices */}
                                        <div className="space-y-3">
                                            {q.options.map((option: string, idx: number) => {
                                                const isSelected = selectedIdx === idx;
                                                const answerStr = q.correctAnswer;
                                                const isCorrectOpt = option === answerStr || 
                                                    answerStr.startsWith(option) || 
                                                    option.startsWith(answerStr) ||
                                                    (answerStr.length === 1 && "ABCD".indexOf(answerStr) === idx);

                                                let btnStyle = "border-[#E5E7EB] bg-white hover:border-gray-400 text-gray-800 hover:bg-gray-50";
                                                
                                                if (hasAnswered) {
                                                    if (isCorrectOpt) {
                                                        btnStyle = "bg-green-600 border-green-600 text-white font-bold animate-pulse";
                                                    } else if (isSelected) {
                                                        btnStyle = "bg-red-500 border-red-500 text-white font-semibold";
                                                    } else {
                                                        btnStyle = "bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed opacity-60";
                                                    }
                                                }

                                                return (
                                                    <button
                                                        key={idx}
                                                        disabled={hasAnswered}
                                                        onClick={() => {
                                                            setQuizAnswers(prev => ({ ...prev, [quizCurrentIndex]: idx }));
                                                        }}
                                                        className={`w-full text-left p-4 rounded-xl border text-sm font-semibold transition flex items-center justify-between ${btnStyle} ${!hasAnswered ? 'cursor-pointer' : ''}`}
                                                    >
                                                        <span className="flex items-center gap-3">
                                                            <span className="font-mono bg-gray-100/10 px-2 py-1 rounded border border-current">
                                                                {String.fromCharCode(65 + idx)}
                                                            </span>
                                                            <span>{option}</span>
                                                        </span>
                                                        {hasAnswered && isCorrectOpt && <CheckCircle2 className="w-5 h-5 text-white" />}
                                                        {hasAnswered && isSelected && !isCorrectOpt && <XCircle className="w-5 h-5 text-white" />}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Explanation and next controls */}
                                        {hasAnswered && (
                                            <div className="pt-6 border-t border-gray-100 space-y-4 animate-fade-in">
                                                <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl text-xs text-amber-900 leading-relaxed">
                                                    <span className="font-bold block text-sm text-amber-950 mb-1">Expert AI Explanation:</span>
                                                    {q.explanation}
                                                </div>

                                                <div className="flex justify-end pt-2">
                                                    {quizCurrentIndex < quizQuestions.length - 1 ? (
                                                        <button
                                                            onClick={() => {
                                                                setQuizCurrentIndex(prev => prev + 1);
                                                            }}
                                                            className="bg-[#0F7B6C] hover:bg-[#0c665a] text-white font-bold px-6 py-2.5 rounded-xl text-sm transition cursor-pointer"
                                                        >
                                                            Next Question
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => {
                                                                setShowQuizScore(true);
                                                            }}
                                                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition cursor-pointer"
                                                        >
                                                            Finish and View Score
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
