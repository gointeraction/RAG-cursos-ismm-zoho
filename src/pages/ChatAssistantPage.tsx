
import { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { performRagQuery } from '../lib/rag';
import type { ChatMessage } from '../lib/rag';

export default function ChatAssistantPage() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId] = useState(() => {
        const saved = localStorage.getItem('chat_session_id');
        if (saved) return saved;
        const newId = crypto.randomUUID();
        localStorage.setItem('chat_session_id', newId);
        return newId;
    });
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Load history on mount
    useEffect(() => {
        async function loadHistory() {
            try {
                const { data } = await supabase
                    .from('chat_history')
                    .select('messages')
                    .eq('session_id', sessionId)
                    .maybeSingle();

                if (data?.messages) {
                    setMessages(data.messages);
                } else {
                    // Initial message if no history
                    setMessages([{
                        role: 'assistant',
                        content: '¡Hola! Soy el Chef Marianito, Coordinador Académico del ISMM. Es un placer saludarte. ¿En qué puedo asesorarte hoy para comenzar tu viaje gastronómico con nosotros?'
                    }]);
                }
            } catch (error) {
                console.error('Error loading history:', error);
            }
        }
        loadHistory();
    }, [sessionId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = { role: 'user', content: input.trim() };
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setInput('');
        setIsLoading(true);

        try {
            const aiResponse = await performRagQuery(userMessage.content, sessionId);
            const assistantMessage: ChatMessage = { role: 'assistant', content: aiResponse };
            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Chat error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-12rem)] bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
            {/* Header */}
            <div className="bg-indigo-600 p-4 flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                    <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h2 className="text-white font-bold text-lg">Chef Marianito (ISMM)</h2>
                    <p className="text-indigo-100 text-xs">Coordinador Académico y Chef Ejecutivo</p>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                {messages.map((msg, index) => (
                    <div
                        key={index}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                            <div className={`p-2 rounded-full h-fit ${msg.role === 'user' ? 'bg-indigo-100' : 'bg-white shadow-sm border border-gray-100'}`}>
                                {msg.role === 'user' ? <User className="w-4 h-4 text-indigo-600" /> : <Bot className="w-4 h-4 text-indigo-600" />}
                            </div>
                            <div
                                className={`p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                    ? 'bg-indigo-600 text-white rounded-tr-none'
                                    : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-tl-none'
                                    }`}
                            >
                                {msg.content}
                            </div>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="flex gap-3 max-w-[80%]">
                            <div className="bg-white shadow-sm border border-gray-100 p-2 rounded-full h-fit">
                                <Bot className="w-4 h-4 text-indigo-600" />
                            </div>
                            <div className="bg-white text-gray-500 p-4 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 flex items-center gap-2 italic">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Pensando...
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-100 flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Escribe tu consulta sobre cursos..."
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm"
                    disabled={isLoading}
                />
                <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-out transition-all active:scale-95 shadow-lg shadow-indigo-200"
                >
                    <Send className="w-5 h-5" />
                </button>
            </form>
        </div>
    );
}
