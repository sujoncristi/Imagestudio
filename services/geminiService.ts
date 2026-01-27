
import { GoogleGenAI, Type } from "@google/genai";

// Helper function to convert a URL (blob or remote) to base64 for Gemini inlineData
async function fileToData(url: string): Promise<{ data: string, mimeType: string }> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = (reader.result as string).split(',')[1];
      resolve({ data: base64data, mimeType: blob.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function analyzeImage(imageUrl: string, mimeType: string = 'image/png') {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Fix: Ensure we pass base64 data from the URL to Gemini
  const { data, mimeType: detectedMimeType } = await fileToData(imageUrl);

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: detectedMimeType || mimeType,
            data: data,
          },
        },
        {
          text: `You are an elite iOS photo editor and artistic director. 
          Analyze this image and provide professional editing suggestions in JSON format.
          Be decisive and specific. 
          
          The "suggested_filter" MUST be one of these exact names or "None":
          Vivid, Dramatic, Mono, Sepia, Cyber, Ethereal, Acid, Velvet, Frost, Golden, Ocean, Forest, Midnight, Ghost, Cinematic, Blueprint.

          The "adjustments" should be values relative to a 100% baseline (e.g., 110 for a 10% increase).
          
          For "crop_suggestion", provide normalized coordinates (0 to 1000) for the best artistic crop (e.g., rule of thirds, removing distractions).`
        }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          aesthetic_review: {
            type: Type.STRING,
            description: "A professional one-sentence critique of the lighting and composition."
          },
          narrative: {
            type: Type.STRING,
            description: "A detailed explanation of why these specific changes will improve the photo."
          },
          suggested_filter: {
            type: Type.STRING,
            description: "The name of the preset filter to apply."
          },
          adjustments: {
            type: Type.OBJECT,
            properties: {
              brightness: { type: Type.NUMBER },
              contrast: { type: Type.NUMBER },
              saturation: { type: Type.NUMBER }
            },
            required: ["brightness", "contrast", "saturation"]
          },
          crop_suggestion: {
            type: Type.OBJECT,
            properties: {
              reasoning: { type: Type.STRING },
              x: { type: Type.NUMBER },
              y: { type: Type.NUMBER },
              width: { type: Type.NUMBER },
              height: { type: Type.NUMBER }
            },
            required: ["reasoning", "x", "y", "width", "height"]
          }
        },
        required: ["aesthetic_review", "narrative", "suggested_filter", "adjustments", "crop_suggestion"]
      }
    }
  });

  return response.text;
}

export async function neuralEdit(imageUrl: string, prompt: string, mimeType: string = 'image/png') {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Fix: Ensure we pass base64 data from the URL to Gemini
  const { data, mimeType: detectedMimeType } = await fileToData(imageUrl);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: detectedMimeType || mimeType,
            data: data,
          },
        },
        {
          text: `Please edit this image based on the following instructions: ${prompt}. 
          Return the modified image directly.`
        }
      ]
    }
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  
  throw new Error("No image returned from Neural Edit model.");
}
