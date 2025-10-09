import React, { useState, useCallback } from 'react';
import PictogramCommunicator from './components/PictogramCommunicator';
import EmotionGame from './components/EmotionGame';

enum GameView {
  HOME,
  PICTOGRAMS,
  EMOTIONS,
}

const Header: React.FC<{ onHomeClick: () => void }> = ({ onHomeClick }) => (
    <header className="w-full p-4 flex justify-center items-center relative">
        <h1 
            className="font-lilita text-6xl md:text-8xl tracking-wider text-white cursor-pointer select-none transition-transform hover:scale-105 active:scale-100 title-stroked"
            onClick={(e) => {
              onHomeClick();
              e.currentTarget.classList.add('animate-pop');
              setTimeout(() => e.currentTarget.classList.remove('animate-pop'), 300);
            }}
        >
            MUNDO COLORIDO
        </h1>
    </header>
);

const HomeScreenButton: React.FC<{ onClick: (e: React.MouseEvent<HTMLButtonElement>) => void; bgColor: string; icon: React.ReactNode; text: string; }> = ({ onClick, bgColor, icon, text }) => (
    <button
        onClick={onClick}
        className={`jiggle-hover text-gray-700 shadow-lg transition-transform duration-300 ease-in-out flex flex-col justify-center items-center p-6 gap-4 border-4 border-white/80 rounded-2xl w-64 h-56 active:scale-95 bg-white/80`}
    >
        <div className="text-7xl drop-shadow-lg" style={{ color: bgColor }}>{icon}</div>
        <span className="font-lilita text-4xl tracking-wide" style={{ color: bgColor }}>{text}</span>
    </button>
);


const HomeScreen: React.FC<{ onSelectView: (view: GameView) => void }> = ({ onSelectView }) => (
    <div className="text-center p-8 animate-fadeIn">
        <div className="p-6 rounded-2xl max-w-3xl mx-auto">
             <h2 className="text-xl md:text-2xl font-bold text-white mb-4 subtitle-stroked">
                Uma aventura interativa para desenvolver a comunicação, reconhecer emoções e expandir a criatividade.
            </h2>
        </div>
        <div className="flex flex-col md:flex-row justify-center items-center gap-10 md:gap-12 mt-10">
            <HomeScreenButton
                onClick={(e) => {
                  onSelectView(GameView.PICTOGRAMS);
                  e.currentTarget.classList.add('animate-pop');
                  setTimeout(() => e.currentTarget.classList.remove('animate-pop'), 300);
                }}
                bgColor="#4DB5F7"
                icon={"💬"}
                text="Comunicar"
            />
            <HomeScreenButton
                onClick={(e) => {
                  onSelectView(GameView.EMOTIONS);
                  e.currentTarget.classList.add('animate-pop');
                  setTimeout(() => e.currentTarget.classList.remove('animate-pop'), 300);
                }}
                bgColor="#F7A24D"
                icon={"🥰"}
                text="Emoções"
            />
        </div>
    </div>
);


const App: React.FC = () => {
  const [view, setView] = useState<GameView>(GameView.HOME);

  const renderView = useCallback(() => {
    switch (view) {
      case GameView.PICTOGRAMS:
        return <PictogramCommunicator />;
      case GameView.EMOTIONS:
        return <EmotionGame />;
      case GameView.HOME:
      default:
        return <HomeScreen onSelectView={setView} />;
    }
  }, [view]);
  
  const handleHomeClick = useCallback(() => setView(GameView.HOME), []);

  return (
    <div className="min-h-screen w-full flex flex-col items-center text-gray-800">
      <Header onHomeClick={handleHomeClick} />
      <main className="w-full flex-grow flex flex-col items-center justify-center p-4 md:p-6">
        {renderView()}
      </main>
      <footer className="w-full text-center p-4 text-sm text-gray-700 font-semibold">
        <p>Criado com ❤️ para o desenvolvimento infantil.</p>
      </footer>
    </div>
  );
};

export default App;