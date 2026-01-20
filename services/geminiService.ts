
import { GoogleGenAI } from "@google/genai";

export async function analyzeImage(imageBase64: string, mimeType: string = 'image/png') {
  // Create a new GoogleGenAI instance right before making an API call to ensure it always uses the most up-to-date API key.
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
          text: `You are an expert iOS photo editor. Provide a concise analysis of this image. 
          Structure your response with these exact emojis and headers:
          📸 AESTHETIC REVIEW: (One sentence about style/lighting)
          📐 SMART RESIZE: (Specific width/height recommendation)
          ✂️ CROP SUGGESTION: (Best framing advice)
          🎨 COLOR TIP: (Suggested filter or color adjustment)`
        }
      ]
    },
  });

  // The text property directly returns the generated string.
  return response.text;
}
