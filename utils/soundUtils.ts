// A simple sound utility to create audio feedback without any assets.
let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
    if (typeof window !== 'undefined' && !audioContext) {
        try {
            audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (e) {
            console.error("Web Audio API is not supported in this browser.");
            return null;
        }
    }
    return audioContext;
};

const playSound = (type: 'sine' | 'square' | 'sawtooth' | 'triangle', frequency: number, duration: number, volume: number = 0.5) => {
    const context = getAudioContext();
    if (!context) return;

    // A small hack to resume context if it was suspended by browser autoplay policy
    if (context.state === 'suspended') {
        context.resume();
    }

    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    
    gainNode.gain.setValueAtTime(volume, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + duration);
};

export const playPopSound = () => {
    playSound('sine', 440, 0.1, 0.3);
};

export const playClearSound = () => {
    playSound('triangle', 300, 0.2, 0.2);
    setTimeout(() => playSound('triangle', 200, 0.2, 0.2), 100);
};

export const playCorrectSound = () => {
    playSound('sine', 523.25, 0.15, 0.4); // C5
    setTimeout(() => playSound('sine', 659.25, 0.2, 0.4), 150); // E5
};

export const playIncorrectSound = () => {
    playSound('sawtooth', 220, 0.2, 0.2); // A3
};

export const playProgressSound = () => {
    playSound('triangle', 600, 0.1, 0.2);
}

export const playSuccessSound = () => {
    playSound('sine', 523.25, 0.1, 0.3); // C5
    setTimeout(() => playSound('sine', 659.25, 0.1, 0.3), 100); // E5
    setTimeout(() => playSound('sine', 783.99, 0.1, 0.3), 200); // G5
    setTimeout(() => playSound('sine', 1046.50, 0.2, 0.4), 300); // C6
}
