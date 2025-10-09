import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Pictogram, PictogramCategory } from '../types';
import { generatePictograms, generateSinglePictogram, generateAIResponse } from '../services/geminiService';
import { playPopSound, playClearSound } from '../utils/soundUtils';

const LoadingAnimation: React.FC = () => (
  <div className="flex justify-center items-center p-8">
    <div className="w-20 h-20 border-8 border-dashed rounded-full animate-spin border-pink-400"></div>
  </div>
);

interface CardProps {
  pictogram: Pictogram;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, pictogram: Pictogram) => void;
  isDragging?: boolean; isSpeaking?: boolean; isClearing?: boolean; isNew?: boolean;
}

const PictogramCard: React.FC<CardProps> = ({ pictogram, onDragStart, isDragging, isSpeaking, isClearing, isNew }) => (
  <div
    id={pictogram.id} draggable={!isSpeaking} onDragStart={(e) => onDragStart(e, pictogram)}
    className={`relative flex flex-col items-center justify-center w-28 h-28 md:w-32 md:h-32 bg-white/90 rounded-2xl shadow-md p-2 cursor-grab active:cursor-grabbing transform transition-all duration-200 hover:scale-105 border-2 border-gray-200
    ${isDragging ? 'opacity-30' : ''} ${isSpeaking ? 'animate-tada' : ''} ${isClearing ? 'animate-fly-out' : ''} ${isNew ? 'animate-pop' : ''}`}
  >
    {isNew && <span className="absolute -top-2 -right-2 text-2xl animate-pulse">✨</span>}
    <img src={pictogram.imageUrl} alt={pictogram.label} className="w-16 h-16 md:w-20 md:h-20 object-contain pointer-events-none" />
    <span className="mt-2 text-sm md:text-base font-bold text-gray-700 capitalize text-center">{pictogram.label}</span>
  </div>
);

const SentenceBoard: React.FC<{ isOver?: boolean }> = ({ isOver }) => (
    <div className={`absolute inset-0 -z-10 bg-white/90 rounded-2xl shadow-inner border-4 transition-all duration-300 ${isOver ? 'border-pink-300' : 'border-gray-200'}`}></div>
);

const PictogramCommunicator: React.FC = () => {
  const [pictoCategories, setPictoCategories] = useState<PictogramCategory[]>([]);
  const [sentencePictos, setSentencePictos] = useState<Pictogram[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isOverDropZone, setIsOverDropZone] = useState<boolean>(false);
  const [speakingIndex, setSpeakingIndex] = useState<number>(-1);
  const [isClearing, setIsClearing] = useState<boolean>(false);
  const [newPictoInput, setNewPictoInput] = useState('');
  const [isCreatingPicto, setIsCreatingPicto] = useState(false);
  const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null);
  const [isGettingResponse, setIsGettingResponse] = useState(false);
  const [aiResponse, setAiResponse] = useState<string>('');

  const sentenceRef = useRef<Pictogram[]>([]);
  useEffect(() => { sentenceRef.current = sentencePictos; }, [sentencePictos]);

  useEffect(() => {
    const fetchPictos = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const categories = await generatePictograms();
        if (categories.length === 0) setError("Não foi possível carregar os pictogramas.");
        else setPictoCategories(categories);
      } catch (err) { setError("Ocorreu um erro ao carregar os pictogramas."); }
      setIsLoading(false);
    };
    fetchPictos();
  }, []);
  
  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>, p: Pictogram) => {
    setDraggingId(p.id); e.dataTransfer.setData('application/json', JSON.stringify(p));
  }, []);
  const handleDragEnd = useCallback(() => setDraggingId(null), []);
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const picto = JSON.parse(e.dataTransfer.getData('application/json')) as Pictogram;
    if (picto && !sentencePictos.find(p => p.id === picto.id)) {
        setSentencePictos(prev => [...prev, picto]);
        setAiResponse('');
        playPopSound();
    }
    setIsOverDropZone(false);
  }, [sentencePictos]);
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => e.preventDefault(), []);
  const handleDragEnter = useCallback(() => setIsOverDropZone(true), []);
  const handleDragLeave = useCallback(() => setIsOverDropZone(false), []);

  const speakText = useCallback((text: string, onBoundary?: (e: SpeechSynthesisEvent) => void, onEnd?: () => void) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 0.9;
    if (onBoundary) utterance.onboundary = onBoundary;
    utterance.onend = () => { setSpeakingIndex(-1); if(onEnd) onEnd(); };
    utterance.onerror = () => { setSpeakingIndex(-1); if(onEnd) onEnd(); };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, []);

  const speakSentence = useCallback(() => {
    if (sentencePictos.length === 0 || window.speechSynthesis.speaking) return;
    const sentence = sentencePictos.map(p => p.label).join(' ');
    let wordIndex = 0;
    const boundaryHandler = (event: SpeechSynthesisEvent) => {
        if (event.name === 'word') {
            const currentWords = sentenceRef.current.map(p => p.label);
            const spokenWord = sentence.substring(event.charIndex).split(' ')[0];
            const foundIndex = currentWords.findIndex((w, i) => i >= wordIndex && w.toLowerCase().startsWith(spokenWord.toLowerCase().substring(0,3)));
            if (foundIndex !== -1) { wordIndex = foundIndex; setSpeakingIndex(wordIndex); }
        }
    };
    setSpeakingIndex(0);
    speakText(sentence, boundaryHandler);
  }, [sentencePictos, speakText]);
  
  const clearSentence = useCallback(() => {
    if (sentencePictos.length === 0) return;
    window.speechSynthesis.cancel(); playClearSound(); setSpeakingIndex(-1); setIsClearing(true); setAiResponse('');
    setTimeout(() => { setSentencePictos([]); setIsClearing(false); }, 500);
  }, [sentencePictos]);

  const handleCreatePictogram = async () => {
    if (!newPictoInput.trim() || isCreatingPicto) return;
    setIsCreatingPicto(true);
    const newPicto = await generateSinglePictogram(newPictoInput.trim());
    if (newPicto) {
        setPictoCategories(prev => {
            const coisasCategory = prev.find(c => c.name === 'Coisas') || { name: 'Coisas', pictograms: [] };
            const otherCats = prev.filter(c => c.name !== 'Coisas');
            return [...otherCats, { ...coisasCategory, pictograms: [...coisasCategory.pictograms, newPicto] }];
        });
        setNewPictoInput('');
        setNewlyCreatedId(newPicto.id);
        setTimeout(() => setNewlyCreatedId(null), 2000);
    } else {
      alert("Não foi possível criar a figura. Tente outra palavra.");
    }
    setIsCreatingPicto(false);
  };
  
  const handleGetResponse = async () => {
    if (sentencePictos.length === 0 || isGettingResponse) return;
    setIsGettingResponse(true); setAiResponse('');
    const sentence = sentencePictos.map(p => p.label).join(' ');
    const response = await generateAIResponse(sentence);
    setAiResponse(response);
    speakText(response, undefined, () => setIsGettingResponse(false));
  };


  if (isLoading) return <div className="text-center p-6 bg-white/70 rounded-3xl shadow-xl animate-fadeIn"><h2 className="font-lilita text-3xl text-gray-700 mb-4">Gerando figuras...</h2><LoadingAnimation /></div>;
  if (error) return <p className="text-center text-red-500 font-bold bg-white/80 p-4 rounded-xl animate-fadeIn">{error}</p>;

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 animate-fadeIn">
      <div onDrop={handleDrop} onDragOver={handleDragOver} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave}
        className={`relative min-h-[200px] w-full p-4 flex flex-wrap items-center justify-center gap-4 transition-transform duration-300 rounded-2xl ${isOverDropZone ? 'transform scale-105' : ''}`}
      >
        <SentenceBoard isOver={isOverDropZone} />
        {sentencePictos.length === 0 ? <p className="text-center text-gray-500 text-xl font-bold">Arraste as figuras aqui para montar uma frase! 👉</p>
          : sentencePictos.map((p, i) => <div key={p.id} className="animate-pop"><PictogramCard pictogram={p} onDragStart={handleDragStart} isDragging={draggingId === p.id} isSpeaking={speakingIndex === i} isClearing={isClearing}/></div>)
        }
      </div>
      <div className="flex flex-wrap justify-center items-center gap-4">
        <button onClick={speakSentence} disabled={sentencePictos.length === 0 || speakingIndex !== -1} className={`px-5 py-3 bg-sky-400 border-b-4 border-sky-600 text-white font-bold rounded-xl shadow-lg transition-all duration-100 ease-in-out transform active:border-b-2 active:mt-1 jiggle-hover flex items-center gap-3 text-lg disabled:bg-gray-400 disabled:border-gray-500 disabled:transform-none disabled:cursor-not-allowed ${speakingIndex !== -1 ? 'speaking' : ''}`}>
            <div className="sound-wave"><div></div><div></div><div></div></div> Falar
        </button>
        <button onClick={handleGetResponse} disabled={sentencePictos.length === 0 || window.speechSynthesis.speaking || isGettingResponse} className="px-5 py-3 bg-teal-400 border-b-4 border-teal-600 text-white font-bold rounded-xl shadow-lg transition-all duration-100 ease-in-out transform active:border-b-2 active:mt-1 jiggle-hover flex items-center gap-3 text-lg disabled:bg-gray-400 disabled:border-gray-500">
            <span className={`text-2xl ${isGettingResponse ? 'animate-spin' : ''}`}>🤖</span> Ouvir Resposta
        </button>
        <button onClick={clearSentence} disabled={sentencePictos.length === 0} className="px-5 py-3 bg-rose-400 border-b-4 border-rose-600 text-white font-bold rounded-xl shadow-lg transition-all duration-100 ease-in-out transform active:border-b-2 active:mt-1 jiggle-hover flex items-center gap-3 text-lg disabled:bg-gray-400 disabled:border-gray-500">
           <span className="text-2xl">🗑️</span> Limpar
        </button>
      </div>
       {aiResponse && <div className="text-center p-3 bg-teal-100/80 border-2 border-teal-200 rounded-xl shadow-md animate-fadeIn"><p className="font-semibold text-teal-800">🤖: "<i>{aiResponse}</i>"</p></div>}

      <div className="bg-white/70 p-6 rounded-2xl shadow-lg">
        <div className="flex flex-col md:flex-row justify-center items-center gap-4 mb-6 p-4 bg-white/60 rounded-xl">
            <input type="text" value={newPictoInput} onChange={e => setNewPictoInput(e.target.value)} placeholder="Qual figura você quer criar?" className="px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-pink-400 focus:ring-pink-400 transition w-full md:w-auto" />
            <button onClick={handleCreatePictogram} disabled={isCreatingPicto} className="px-5 py-2 bg-pink-400 border-b-4 border-pink-600 text-white font-bold rounded-xl shadow-lg transition-all duration-100 ease-in-out transform active:border-b-2 active:mt-1 jiggle-hover disabled:bg-gray-400 disabled:border-gray-500">
                {isCreatingPicto ? 'Criando...' : 'Criar Figura ✨'}
            </button>
        </div>
        {pictoCategories.map(category => (
            <div key={category.name} className="mb-4">
                <h3 className="font-lilita text-3xl text-left mb-3 text-gray-700 tracking-wider">{category.name}</h3>
                <div className="flex flex-wrap justify-center md:justify-start gap-4">
                    {category.pictograms.map(p => <div key={p.id} onDragEnd={handleDragEnd}><PictogramCard pictogram={p} onDragStart={handleDragStart} isDragging={draggingId === p.id} isNew={newlyCreatedId === p.id} /></div>)}
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default PictogramCommunicator;