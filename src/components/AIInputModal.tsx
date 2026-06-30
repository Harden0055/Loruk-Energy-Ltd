import React, { useState, useRef } from 'react';
import { Bot, Upload, X, Loader2 } from 'lucide-react';

interface AIInputModalProps {
  onClose: () => void;
  onResult: (data: any) => void;
}

export default function AIInputModal({ onClose, onResult }: AIInputModalProps) {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleExtract = async () => {
    if (!text && !file) {
      setError("Please provide text or an image.");
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      let inlineData;
      if (file) {
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
             const result = reader.result as string;
             // extract base64 part
             const base64 = result.split(',')[1];
             resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        
        inlineData = {
          data: base64Data,
          mimeType: file.type
        };
      }

      const response = await fetch('/api/gemini/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, inlineData })
      });

      if (!response.ok) {
        throw new Error('Extraction failed');
      }

      const data = await response.json();
      onResult(data);
      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to extract data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900 dark:to-indigo-950 rounded-xl shadow-2xl border border-theme-border w-full max-w-lg overflow-hidden flex flex-col transform transition-all duration-300">
        <div className="px-6 py-5 border-b border-theme-border flex justify-between items-center bg-blue-100/50 dark:glass-panel">
          <div className="flex items-center gap-2 text-cyan-500 dark:text-blue-400">
            <Bot className="w-6 h-6" />
            <h3 className="font-bold text-blue-900 dark:text-blue-50 text-xl">AI Data Extraction</h3>
          </div>
          <button onClick={onClose} className="p-1 px-2 text-blue-400 hover:text-cyan-500 dark:text-blue-400 dark:hover:text-blue-300 rounded-lg transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          <p className="text-sm text-cyan-400 dark:text-theme-text-muted font-medium leading-relaxed">
            Upload a receipt image or paste text. The AI agent will extract the relevant information and pre-fill the form for you to clarify before saving.
          </p>

          <div>
            <label className="block text-sm font-semibold text-blue-900 dark:text-theme-text mb-1.5">Paste Text (e.g., M-Pesa Message, Notes)</label>
            <textarea
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full px-3.5 py-2.5 glass-panel border border-theme-border dark:border-theme-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-blue-900 dark:text-blue-50 resize-none transition-colors"
              placeholder="e.g. Paid KES 15,000 for Super fuel, truck KCF 119R..."
            />
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-theme-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-blue-50 dark:glass-panel text-xs font-bold text-blue-400 dark:text-blue-500 uppercase tracking-widest rounded-full">AND / OR</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-blue-900 dark:text-theme-text mb-1.5">Upload Receipt</label>
            <div 
              className="border-2 border-dashed border-theme-border dark:border-theme-border glass-panel rounded-xl p-8 text-center hover:bg-blue-100/50 dark:hover:bg-blue-800/40 cursor-pointer transition-colors group"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              {file ? (
                <div className="text-sm text-cyan-500 dark:text-blue-400 font-bold">
                  {file.name}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-blue-500 dark:text-blue-400">
                  <Upload className="w-6 h-6 text-blue-400 dark:text-blue-500 mb-1 group-hover:-translate-y-1 transition-transform" />
                  <span className="text-sm font-bold block">Click to upload an image</span>
                  <span className="text-xs font-semibold opacity-70">PNG, JPG, JPEG</span>
                </div>
              )}
            </div>
          </div>

          {error && <p className="text-red-500 text-sm mt-2 font-semibold bg-red-50 dark:bg-red-950/40 p-2 rounded-lg">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-theme-border bg-blue-100/50 dark:glass-panel flex justify-end gap-3 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 font-semibold text-cyan-400 dark:text-theme-text-muted hover:text-blue-900 dark:hover:text-blue-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExtract}
            disabled={loading || (!text && !file)}
            className="px-5 py-2 bg-gradient-primary hover:opacity-90 text-white glow-purple border-0 rounded-lg text-sm font-bold transition-colors shadow-md shadow-blue-500/20 flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Extracting...
              </>
            ) : (
              <>
                <Bot className="w-4 h-4" />
                Extract Data
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
