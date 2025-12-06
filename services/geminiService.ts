import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { TRYON_MODES } from '../constants';

// Initialize the API client
// Note: We are using a factory function to ensure we get fresh keys if needed, 
// though typically env var is static.
const getAIClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("API_KEY environment variable is not set");
    }
    return new GoogleGenAI({ apiKey });
};

export const generateTryOn = async (
    customerImageUrl: string,
    garmentImageUrl: string,
    systemInstruction: string,
    mode: 'normal' | 'pro' = 'normal'
): Promise<{ base64: string; mimeType: string }> => {
    try {
        const ai = getAIClient();
        const modeConfig = TRYON_MODES[mode];
        
        // Fetch images and convert to base64
        const [customerBase64, garmentBase64] = await Promise.all([
            urlToBase64(customerImageUrl),
            urlToBase64(garmentImageUrl)
        ]);

        const response = await ai.models.generateContent({
            model: modeConfig.model,
            contents: {
                parts: [
                    {
                        text: modeConfig.prompt
                    },
                    {
                        inlineData: {
                            data: customerBase64,
                            mimeType: 'image/jpeg'
                        }
                    },
                    {
                        text: "CUSTOMER_IMAGE"
                    },
                    {
                        inlineData: {
                            data: garmentBase64,
                            mimeType: 'image/jpeg'
                        }
                    },
                    {
                        text: "GARMENT_IMAGE"
                    }
                ]
            },
            config: {
                systemInstruction: systemInstruction,
                maxOutputTokens: 2,
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                ]
            }
        });

        // Extract image from response
        const candidates = response.candidates;
        if (candidates && candidates.length > 0) {
            for (const part of candidates[0].content.parts) {
                if (part.inlineData) {
                    return {
                        base64: part.inlineData.data,
                        mimeType: part.inlineData.mimeType || 'image/jpeg'
                    };
                }
            }
        }
        
        throw new Error("No image generated in the response");

    } catch (error) {
        console.error("Gemini Try-On Error:", error);
        throw error;
    }
};

export const editImage = async (
    sourceImageUrl: string,
    prompt: string
): Promise<{ base64: string; mimeType: string }> => {
    try {
        const ai = getAIClient();
        
        // Fetch source image
        const sourceBase64 = await urlToBase64(sourceImageUrl);

        // Using Gemini 2.5 Flash Image as requested for editing functionality
        const model = 'gemini-2.5-flash-image';

        const response = await ai.models.generateContent({
            model: model,
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: sourceBase64,
                            mimeType: 'image/jpeg'
                        }
                    },
                    {
                        text: prompt // e.g. "Add a retro filter"
                    }
                ]
            }
        });

         // Extract image from response
         const candidates = response.candidates;
         if (candidates && candidates.length > 0) {
             for (const part of candidates[0].content.parts) {
                 if (part.inlineData) {
                     return {
                         base64: part.inlineData.data,
                         mimeType: part.inlineData.mimeType || 'image/jpeg'
                     };
                 }
             }
         }
         
         throw new Error("No image generated in the response");

    } catch (error) {
        console.error("Gemini Edit Error:", error);
        throw error;
    }
}

// Helper to fetch an image URL and return base64 string
async function urlToBase64(url: string): Promise<string> {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
            const base64Data = base64String.split(',')[1];
            resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}