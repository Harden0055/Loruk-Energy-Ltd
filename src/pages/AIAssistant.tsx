import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      text: 'Hello! I am your Loruk Energy AI Assistant. Ask me anything about fuel management, operations, or how to use the dashboard.'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const gatherContext = async () => {
    try {
      // Gather some high-level stats from db to inform the AI
      const custSnapshot = await getDocs(query(collection(db, 'customers'), limit(10)));
      const fleetSnapshot = await getDocs(query(collection(db, 'fleet'), limit(5)));
      
      const customers = custSnapshot.docs.map(d => ({ name: d.data().name, balance: d.data().balance }));
      const fleetItems = fleetSnapshot.docs.map(d => ({ reg: d.data().carRegistration, amount: d.data().amount }));

      return JSON.stringify({
        summary: "This is a brief context of the current system state, limited for brevity.",
        recentCustomers: customers,
        recentFleetExpenses: fleetItems
      }, null, 2);
    } catch {
      return "Unable to fetch live context.";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input.trim();
    setInput('');
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: userText };
    
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const contextStr = await gatherContext();
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, context: contextStr }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      
      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', text: data.text || 'Sorry, I did not understand that.' };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error('Chat error:', error);
      const errMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', text: 'Sorry, there was an error processing your request. Please try again.' };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] glass-panel rounded-xl shadow-sm border border-theme-border overflow-hidden relative">
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:glass-panel flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 text-cyan-500 dark:text-blue-400" />
              </div>
            )}
            <div className={`max-w-[75%] rounded-2xl px-5 py-3 ${
              msg.role === 'user' 
                ? 'bg-gradient-primary text-white glow-purple border-0 rounded-br-none' 
                : 'glass-panel text-gray-800 dark:text-gray-200 rounded-bl-none'
            }`}>
              {msg.role === 'user' ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</p>
              ) : (
                <div className="text-sm leading-relaxed markdown-body">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-blue-800 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-theme-text-muted-muted" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-4 justify-start animate-fade-in">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:glass-panel flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5 text-cyan-500 dark:text-blue-400" />
            </div>
            <div className="max-w-[75%] rounded-2xl px-5 py-3 glass-panel text-gray-800 dark:text-gray-200 rounded-bl-none flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-500 dark:text-blue-400" />
              <span className="text-sm">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-theme-border bg-gray-50 dark:bg-slate-900/50">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI anything..."
            className="flex-1 px-4 py-2.5 glass-input rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all dark:text-white"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all shadow-md shadow-blue-900/20 flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
