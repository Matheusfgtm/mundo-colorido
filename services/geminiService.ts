import { GoogleGenAI, Type } from "@google/genai";
import type { Pictogram, PictogramCategory, EmotionQuestion, EmotionStoryQuestion } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const generateImage = async (prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: `A cute and simple cartoon drawing of a child in a friendly, hand-drawn style with a clean outline, on a white background. Inspired by modern children's book illustrations. The drawing should represent: '${prompt}'.`,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '1:1',
      },
    });

    const base64ImageBytes = response.generatedImages[0].image.imageBytes;
    return `data:image/jpeg;base64,${base64ImageBytes}`;
  } catch (error) {
    console.error('Error generating image:', error);
    return 'https://picsum.photos/200'; // Placeholder
  }
};

export const generatePictograms = async (): Promise<PictogramCategory[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Generate a list of common pictograms for a non-verbal child in Brazil. Organize them into these categories: 'Pessoas', 'Ações', 'Comidas', 'Coisas'. Include simple concepts. For 'Pessoas': Eu, mamãe, papai. For 'Ações': quero, comer, brincar, banheiro, ajuda. For 'Comidas': água, fruta. For 'Coisas': escola, casa.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            categories: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Category name in Portuguese." },
                  pictograms: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        label: { type: Type.STRING, description: "The word in Portuguese (Brazil)." },
                        prompt: { type: Type.STRING, description: "A simple English description for an image generation model to create a child-friendly cartoon icon." }
                      },
                      required: ["label", "prompt"]
                    }
                  }
                },
                required: ["name", "pictograms"]
              }
            }
          }
        }
      }
    });

    const result = JSON.parse(response.text);

    const categoriesWithImages: PictogramCategory[] = await Promise.all(
      result.categories.map(async (category: any) => {
        const pictogramsWithImages = await Promise.all(
          category.pictograms.map(async (p: { label: string; prompt: string }) => {
            const imageUrl = await generateImage(p.prompt);
            return {
              id: `${p.label}-${Date.now()}`,
              label: p.label,
              imageUrl,
            };
          })
        );
        return { name: category.name, pictograms: pictogramsWithImages };
      })
    );

    return categoriesWithImages;
  } catch (error) {
    console.error("Failed to generate pictograms:", error);
    return [];
  }
};

export const generateSinglePictogram = async (word: string): Promise<Pictogram | null> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate a simple image generation prompt for the Portuguese word "${word}". The prompt should be in English and suitable for creating a cute, simple cartoon icon for a child.`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        prompt: { type: Type.STRING, description: "The English prompt for the image model." }
                    },
                    required: ['prompt']
                }
            }
        });

        const { prompt } = JSON.parse(response.text);
        const imageUrl = await generateImage(prompt);

        return {
            id: `${word}-${Date.now()}`,
            label: word,
            imageUrl,
        };
    } catch (error) {
        console.error("Failed to generate single pictogram:", error);
        return null;
    }
}


export const generateAIResponse = async (sentence: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `You are a friendly, cheerful robot friend for a non-verbal child. The child just constructed a sentence using pictograms. Respond to their sentence in a very simple, positive, and encouraging way in Brazilian Portuguese. The child's sentence is: "${sentence}"`,
            config: {
                // No JSON response needed, just simple text
            }
        });
        return response.text;
    } catch (error) {
        console.error("Failed to generate AI response:", error);
        return "Não entendi, mas parece muito legal!";
    }
}


export const generateEmotionGameQuestion = async (): Promise<EmotionQuestion | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Create a single emotion recognition question for a child. Pick one emotion from this list: alegria, tristeza, raiva, surpresa. Provide the correct emotion name in Portuguese, a simple image generation prompt for a cute cartoon child\'s face clearly expressing the emotion in a hand-drawn style, and a shuffled list of four plausible emotion options in Portuguese. Each option should be an object containing the emotion name (text) and a single, appropriate emoji character.',
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            emotion: { type: Type.STRING, description: "The correct emotion name in Portuguese." },
            imagePrompt: { type: Type.STRING, description: "Image generation prompt for the emotion." },
            options: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING, description: "The emotion name in Portuguese." },
                  emoji: { type: Type.STRING, description: "A single emoji character representing the emotion." }
                },
                required: ["text", "emoji"]
              },
              description: "An array of 4 distinct emotion options in Portuguese, shuffled, one of which is correct."
            }
          },
          required: ["emotion", "imagePrompt", "options"]
        }
      }
    });
    
    const questionData = JSON.parse(response.text);
    const imageUrl = await generateImage(questionData.imagePrompt);

    return {
      emotion: questionData.emotion,
      imageUrl: imageUrl,
      options: questionData.options,
    };
  } catch (error) {
    console.error("Failed to generate emotion question:", error);
    return null;
  }
};


export const generateEmotionStoryQuestion = async (): Promise<EmotionStoryQuestion | null> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Create a single emotion recognition question based on a short story for a child.
1.  Choose a primary emotion from: alegria, tristeza, raiva, surpresa.
2.  Write a very simple, one-sentence story in Brazilian Portuguese that clearly implies this emotion.
3.  Provide the correct emotion name.
4.  Provide a list of four emotions (the correct one and three plausible distractors).
5.  For each of the four emotions, create a simple image generation prompt (in English) for a cute cartoon child's face expressing that emotion.`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        story: { type: Type.STRING, description: "The short story in Portuguese." },
                        correctEmotion: { type: Type.STRING, description: "The correct emotion name in Portuguese." },
                        options: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    emotion: { type: Type.STRING, description: "The emotion name in Portuguese." },
                                    imagePrompt: { type: Type.STRING, description: "Image generation prompt for this emotion's face." }
                                },
                                required: ["emotion", "imagePrompt"]
                            },
                            description: "An array of 4 emotion options, one of which is correct."
                        }
                    },
                    required: ["story", "correctEmotion", "options"]
                }
            }
        });

        const storyData = JSON.parse(response.text);

        const optionsWithImages = await Promise.all(
            storyData.options.map(async (opt: { emotion: string; imagePrompt: string }) => {
                const imageUrl = await generateImage(opt.imagePrompt);
                return { emotion: opt.emotion, imageUrl };
            })
        );
        
        return {
            story: storyData.story,
            correctEmotion: storyData.correctEmotion,
            options: optionsWithImages,
        };

    } catch (error) {
        console.error("Failed to generate emotion story question:", error);
        return null;
    }
};
