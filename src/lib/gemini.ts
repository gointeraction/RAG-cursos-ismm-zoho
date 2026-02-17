import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GOOGLE_AI_API_KEY;

if (!apiKey) {
    console.error("VITE_GOOGLE_AI_API_KEY is missing in environment variables");
}

const genAI = new GoogleGenerativeAI(apiKey || '');

export async function generateEmbedding(text: string): Promise<number[]> {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
        const result = await model.embedContent({
            content: { parts: [{ text }] },
            outputDimensionality: 768,
        });
        return result.embedding.values;
    } catch (error) {
        console.error("Error generating Gemini embedding:", error);
        throw error;
    }
}
