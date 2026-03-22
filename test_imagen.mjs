import { GoogleGenAI } from '@google/genai';
import { config } from 'dotenv';
config();

const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY });

async function testImagen4() {
  try {
    console.log("Testing Imagen 4 API...");
    const imageResult = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: 'A tiny cute static vinyl toy dog on a clean background',
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
      }
    });
    console.log("Success! Got images:", imageResult.generatedImages?.length || 0);
  } catch (e) {
    console.error("Error calling Imagen API:", e.message);
  }
}
testImagen4();
