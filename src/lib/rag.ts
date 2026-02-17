import { supabase } from './supabase';
import { generateEmbedding, getChatResponse } from './gemini';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export async function performRagQuery(userQuery: string, sessionId: string = 'default-session'): Promise<string> {
    try {
        // 1. Get existing history from Supabase
        const { data: historyData } = await supabase
            .from('chat_history')
            .select('messages')
            .eq('session_id', sessionId)
            .maybeSingle();

        let history: ChatMessage[] = historyData?.messages || [];

        // 2. Generate embedding for the user query
        const queryEmbedding = await generateEmbedding(userQuery);

        // 3. Search for relevant context in Supabase
        const { data: contextData, error: rpcError } = await supabase.rpc('match_active_courses', {
            query_embedding: queryEmbedding,
            match_threshold: 0.5,
            match_count: 5
        });

        if (rpcError) throw rpcError;

        // 4. Format context
        const context = contextData && contextData.length > 0
            ? contextData.map((item: any) => `Curso: ${item.title}\nContenido: ${item.content}`).join('\n\n---\n\n')
            : "No se encontró información específica sobre esta consulta en el catálogo actual.";

        // 5. Get AI response with context and history
        const response = await getChatResponse(userQuery, context, history);

        // 6. Update history (keep last 30 messages)
        const updatedHistory = [
            ...history,
            { role: 'user', content: userQuery },
            { role: 'assistant', content: response }
        ].slice(-30);

        // 7. Save updated history back to Supabase
        const { error: upsertError } = await supabase
            .from('chat_history')
            .upsert(
                { session_id: sessionId, messages: updatedHistory, updated_at: new Date().toISOString() },
                { onConflict: 'session_id' }
            );

        if (upsertError) console.error('Error saving chat history:', upsertError);

        return response;

    } catch (error) {
        console.error('Error in RAG process:', error);
        return "Lo siento, tuve un problema al procesar tu consulta. Por favor, intenta de nuevo más tarde.";
    }
}
