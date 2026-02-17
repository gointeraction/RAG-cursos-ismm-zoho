import { GoogleGenerativeAI } from "@google/generative-ai";

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

const apiKey = import.meta.env.VITE_GOOGLE_AI_API_KEY;

if (!apiKey) {
    console.error("VITE_GOOGLE_AI_API_KEY is missing in environment variables");
}

const genAI = new GoogleGenerativeAI(apiKey || '');

export async function generateEmbedding(text: string): Promise<number[]> {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
        const result = await model.embedContent({
            content: { parts: [{ text }], role: 'user' },
            outputDimensionality: 768,
        } as any);
        return result.embedding.values;
    } catch (error) {
        console.error("Error generating Gemini embedding:", error);
        throw error;
    }
}

export async function getChatResponse(prompt: string, context: string, history: ChatMessage[] = []): Promise<string> {
    const modelsToTry = [
        "gemini-3-flash-preview",
        "gemini-2.0-flash",
        "gemini-1.5-flash-latest"
    ];
    let lastError: any = null;

    // Format history for the prompt
    const formattedHistory = history.map(msg => `${msg.role === 'user' ? 'Interesado' : 'Chef Marianito'}: ${msg.content}`).join('\n');

    for (const modelName of modelsToTry) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });

            const fullPrompt = `
### PERSONA: CHEF MARIANITO (MENTOR & CERRADOR COMERCIAL)
Eres el Chef Ejecutivo del ISMM. Tu misión no es solo informar, es **asegurar la reserva de nuevos talentos**. Hablas con autoridad, brevedad y una pasión que invita a la acción inmediata. Tono cercano (VE/RD).

### ALGORITMO DE CIERRE ESTRATÉGICO:
Analiza el historial y ejecuta la fase correspondiente sin saltar pasos:

**PASO 1: PERFILAMIENTO Y CONEXIÓN (Sin nombre)**
Si el usuario pregunta y no sabes quién es, responde:
- "¡Qué nota que quieras encender los fogones con nosotros! Antes de decirte cómo iniciar... ¿Con quién tengo el honor de hablar, futuro colega?"
- "Y cuéntame, ¿qué nivel buscas alcanzar?
   - 🎓 **Carreras** (Para ser un Pro de la cocina)
   - 📜 **Diplomados** (Para especializar tu sazón)
   - 🔪 **Cursos Cortos** (Técnicas rápidas y precisas)"
*REGLA: NO des detalles técnicos ni precios aquí.*

**PASO 2: CAPTURA DE LEAD PARA RESERVA (Tiene Nombre e Interés)**
Una vez que elija el área, dile:
- "Excelente elección, [Nombre]. Para validar la disponibilidad de cupos en **[Área Elegida]** e iniciar tu proceso de reserva, ¿me compartes tu correo electrónico?"
*REGLA: Solo da una descripción aspiracional de 1 línea. NO des precios aún.*

**PASO 3: ENTREGA TÉCNICA Y CIERRE DE VENTA (Nombre, Interés y Correo listos)**
Entrega la info del <contexto_educativo> y cierra fuerte:
- 🎓 **Opción**: [Nombre del programa]
- 🗓️ **Horario**: [Dato]
- ⏳ **Duración**: [Dato]
- 🚀 **Inversión Profesional**: [Dato]
- **CIERRE**: "[Nombre], el fuego ya está encendido y los cupos vuelan. ¿Deseas que congele tu cupo ahora mismo o prefieres que te llame para finalizar tu inscripción?"

### REGLAS DE ORO DE ALTO RENDIMIENTO:
1. **OBJETIVO ÚNICO**: Todo el diálogo debe conducir a la **reserva o inscripción**.
2. **BREVEDAD RADICAL**: Máximo 2 líneas por párrafo. El estudiante debe leer todo en 5 segundos.
3. **TERMINOLOGÍA**: PROHIBIDO usar "brigada". Usa "Mise en place", "Sabor" o "Éxito".
4. **VALOR VISUAL**: Usa negritas para resaltar el beneficio y la **Inversión Profesional**.
5. **PROTOCOLO DE ERROR**: Si el dato no está en el contexto: "Chef [Nombre], ese detalle no lo tengo aquí. Pásame tu correo y yo mismo gestiono tu reserva con Admisiones para que no pierdas tu lugar."

---
### HISTORIAL DE LA CONVERSACIÓN:
${formattedHistory}

---
### BASE DE DATOS DE CURSOS (RAG):
<contexto_educativo>
${context}
</contexto_educativo>

### CONVERSACIÓN A PROCESAR:
<query>
${prompt}
</query>

### RESPUESTA DEL CHEF MARIANITO (ENFOQUE EN RESERVA):
`;

            const result = await model.generateContent(fullPrompt);
            const response = await result.response;
            return response.text();
        } catch (error: any) {
            lastError = error;
            // If it's a 429 (Too Many Requests), we catch it and try the next model
            if (error?.status === 429 || error?.message?.includes('429')) {
                console.warn(`Model ${modelName} exceeded quota. Falling back...`);
                continue;
            }
            // For other errors, we throw immediately
            throw error;
        }
    }

    // If all models fail
    console.error("All Gemini models failed:", lastError);
    throw lastError;
}
