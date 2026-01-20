
import { GoogleGenAI, Type } from "@google/genai";

export async function analyzeImage(imageBase64: string, mimeType: string = 'image/png') {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: mimeType,
            data: imageBase64.split(',')[1],
          },
        },
        {
          text: `You are an elite iOS photo editor and artistic director. 
          Analyze this image and provide professional editing suggestions in JSON format.
          Be decisive and specific. 
          
          The "suggested_filter" MUST be one of these exact names or "None":
          Vivid, Dramatic, Mono, Sepia, Cyber, Ethereal, Acid, Velvet, Frost, Golden, Ocean, Forest, Midnight, Ghost, Cinematic, Blueprint.

          The "adjustments" should be values relative to a 100% baseline (e.g., 110 for a 10% increase).`
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
          crop_advice: {
            type: Type.STRING,
            description: "Specific framing or rule-of-thirds advice."
          }
        },
        required: ["aesthetic_review", "narrative", "suggested_filter", "adjustments", "crop_advice"]
      }
    }
  });

  return response.text;
}
