export interface Pictogram {
  id: string;
  label: string;
  imageUrl: string;
}

export interface PictogramCategory {
  name: string;
  pictograms: Pictogram[];
}

export interface EmotionQuestion {
  emotion: string;
  imageUrl: string;
  options: {
    text: string;
    emoji: string;
  }[];
}

export interface EmotionStoryQuestion {
  story: string;
  correctEmotion: string;
  options: {
    emotion: string;
    imageUrl: string;
  }[];
}
