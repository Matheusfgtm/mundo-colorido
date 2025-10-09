import React, { useState, useEffect, useCallback } from 'react';
import type { EmotionQuestion, EmotionStoryQuestion } from '../types';
import { generateEmotionGameQuestion, generateEmotionStoryQuestion } from '../services/geminiService';
import { playCorrectSound, playIncorrectSound, playSuccessSound, playProgressSound } from '../utils/soundUtils';

type GameMode = 'selection' | 'guessTheFace' | 'guessTheStory';
type AnswerStatus = 'unanswered' | 'correct' | 'incorrect';
const MAX_PROGRESS = 5;


const Loading: React.FC<{ text: string }> = ({ text }) => (
    <div className="text-center p-6 bg-white/70 rounded-3xl shadow-xl animate-fadeIn">
        <h2 className="font-lilita text-3xl text-gray-700 mb-4">{text}</h2>
        <div className="flex justify-center items-center p-8">
            <div className="w-20 h-20 border-8 border-dashed rounded-full animate-spin border-pink-400"></div>
        </div>
    </div>
);

const Confetti: React.FC = () => (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-20">
        {Array.from({ length: 50 }).map((_, i) => (
            <div key={i} className="confetti" style={{
                left: `${Math.random() * 100}%`,
                animationDuration: `${2 + Math.random() * 2}s`,
                animationDelay: `${Math.random() * 2}s`,
                backgroundColor: ['#fecdd3', '#fde68a', '#bfdbfe', '#a7f3d0'][i%4]
            }}></div>
        ))}
    </div>
);

const SuperStarReward: React.FC = () => (
    <div className="absolute inset-0 bg-black/30 flex flex-col justify-center items-center z-10 animate-fadeIn">
        <Confetti />
        <div className="text-center p-8 rounded-xl bg-white/80 flex flex-col items-center animate-pop relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-24 h-24 text-yellow-400 animate-tada" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
            </svg>
            <p className="text-4xl font-lilita text-yellow-600 mt-2">SUPER ESTRELA!</p>
        </div>
    </div>
);

const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => (
    <div className="w-full bg-gray-200 rounded-full h-6 shadow-inner border-2 border-white/80">
        <div className="bg-yellow-400 h-full rounded-full transition-all duration-500 ease-out flex items-center justify-end"
             style={{ width: `${(progress / MAX_PROGRESS) * 100}%` }}>
             {progress > 0 && <span className="text-yellow-700 font-bold mr-2 text-sm">⭐</span>}
        </div>
    </div>
);


const EmotionGame: React.FC = () => {
    const [gameMode, setGameMode] = useState<GameMode>('selection');
    const [question, setQuestion] = useState<EmotionQuestion | EmotionStoryQuestion | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [answerStatus, setAnswerStatus] = useState<AnswerStatus>('unanswered');
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [showReward, setShowReward] = useState(false);

    const loadNextQuestion = useCallback(async (mode: GameMode) => {
        setIsLoading(true); setError(null); setAnswerStatus('unanswered'); setSelectedAnswer(null);
        try {
            const nextQuestion = mode === 'guessTheFace' ? await generateEmotionGameQuestion() : await generateEmotionStoryQuestion();
            if (nextQuestion) setQuestion(nextQuestion);
            else setError("Não foi possível carregar a pergunta.");
        } catch (err) { setError("Ocorreu um erro ao carregar a pergunta."); }
        setIsLoading(false);
    }, []);
    
    useEffect(() => {
        if (showReward) {
            playSuccessSound();
            const timer = setTimeout(() => setShowReward(false), 2500);
            return () => clearTimeout(timer);
        }
    }, [showReward]);

    const handleAnswer = (optionValue: string, correctValue: string) => {
        if (answerStatus !== 'unanswered') return;
        setSelectedAnswer(optionValue);
        if (optionValue.toLowerCase() === correctValue.toLowerCase()) {
            setAnswerStatus('correct');
            playCorrectSound();
            setProgress(prev => {
                const newProgress = prev + 1;
                if (newProgress >= MAX_PROGRESS) {
                    setShowReward(true);
                    return 0;
                }
                playProgressSound();
                return newProgress;
            });
        } else {
            setAnswerStatus('incorrect');
            playIncorrectSound();
            setProgress(0);
        }
    };
    
    const startGame = (mode: GameMode) => {
        setGameMode(mode);
        setProgress(0);
        loadNextQuestion(mode);
    }
    
    const renderGameContent = () => {
        if (isLoading) return <Loading text="Criando um jogo de emoções..." />;
        if (error || !question) return <p className="text-center text-red-500 font-bold bg-white/80 p-4 rounded-xl">{error || "Nenhuma pergunta."}</p>;

        const isFaceGame = 'imageUrl' in question;
        const correctValue = isFaceGame ? question.emotion : question.correctEmotion;

        return (
            <div className="flex flex-col items-center gap-4 w-full">
                 <ProgressBar progress={progress} />
                 <h2 className="font-lilita text-3xl md:text-4xl text-gray-700 tracking-wider text-center" style={{textShadow: '2px 2px 0px rgba(0,0,0,0.1)'}}>
                    {isFaceGame ? 'Que emoção é esta? 🤔' : question.story}
                </h2>
                
                {isFaceGame && (
                    <div className="w-64 h-64 rounded-2xl overflow-hidden shadow-lg p-3 bg-white border-4 border-gray-200">
                        <img src={question.imageUrl} alt="Emoção" className="w-full h-full object-cover rounded-lg" />
                    </div>
                )}
                
                <div className={`grid ${isFaceGame ? 'grid-cols-2' : 'grid-cols-2'} gap-4 w-full`}>
                    {question.options.map((option: any) => {
                        const optionValue = option.text || option.emotion;
                        const isCorrect = optionValue.toLowerCase() === correctValue.toLowerCase();
                        let buttonClass = 'bg-cyan-400 border-cyan-600 active:border-b-2 active:mt-1 jiggle-hover';
                        if (answerStatus !== 'unanswered') {
                            if (isCorrect) buttonClass = 'bg-green-500 border-green-700 animate-tada';
                            else if (optionValue === selectedAnswer) buttonClass = 'bg-red-500 border-red-700 animate-shake';
                            else buttonClass = 'bg-gray-400 border-gray-500 opacity-70';
                        }
                        return (
                            <button key={optionValue} onClick={() => handleAnswer(optionValue, correctValue)} disabled={answerStatus !== 'unanswered'}
                                className={`w-full py-3 px-2 text-white font-bold text-lg md:text-xl rounded-xl shadow-md transition-all duration-100 transform disabled:transform-none capitalize flex items-center justify-center gap-2 border-b-4 ${buttonClass}`}>
                                {option.imageUrl ? <img src={option.imageUrl} alt={option.emotion} className="w-16 h-16 rounded-md bg-white/30 p-1" /> : <span className="text-2xl">{option.emoji}</span>}
                                {option.text && <span>{option.text}</span>}
                            </button>
                        );
                    })}
                </div>

                {answerStatus !== 'unanswered' && (
                    <div className="flex flex-col items-center w-full animate-fadeIn mt-4">
                        {answerStatus === 'correct' && <p className="text-2xl font-bold text-green-700">Muito bem! 🎉</p>}
                        {answerStatus === 'incorrect' && <p className="text-2xl font-bold text-blue-700">Quase! Tente de novo! 😊</p>}
                        <button onClick={() => loadNextQuestion(gameMode)} className="mt-4 px-8 py-3 bg-purple-500 border-b-4 border-purple-700 text-white font-bold rounded-xl shadow-lg transition-all jiggle-hover flex items-center gap-2 text-lg">
                            Próxima ➡️
                        </button>
                    </div>
                )}
            </div>
        );
    }

    if (gameMode === 'selection') {
        return (
            <div className="text-center p-8 animate-fadeIn flex flex-col items-center gap-6 bg-white/70 rounded-3xl shadow-xl">
                 <h2 className="font-lilita text-4xl text-gray-700">Escolha um Jogo!</h2>
                 <div className="flex flex-col md:flex-row gap-6">
                    <button onClick={() => startGame('guessTheFace')} className="p-6 bg-sky-300 border-b-8 border-sky-500 rounded-2xl jiggle-hover active:border-b-4">
                        <div className="text-6xl mb-2">🤔</div>
                        <span className="font-lilita text-2xl text-white" style={{WebkitTextStroke: '2px #0369a1'}}>Adivinhe a Emoção</span>
                    </button>
                     <button onClick={() => startGame('guessTheStory')} className="p-6 bg-amber-300 border-b-8 border-amber-500 rounded-2xl jiggle-hover active:border-b-4">
                        <div className="text-6xl mb-2">📖</div>
                        <span className="font-lilita text-2xl text-white" style={{WebkitTextStroke: '2px #b45309'}}>Histórias e Emoções</span>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-lg mx-auto flex flex-col items-center gap-4 p-6 bg-white/80 rounded-3xl shadow-xl border-2 border-white/50 relative animate-fadeIn">
            {showReward && <SuperStarReward />}
            {renderGameContent()}
        </div>
    );
};

export default EmotionGame;
