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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white/95 dark:bg-blue-950/90 rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-2 text-blue-600">
            <Bot className="w-5 h-5" />
            <h3 className="font-bold text-gray-900 dark:text-blue-100">AI Data Extraction</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 dark:text-blue-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          <p className="text-sm text-gray-500">
            Upload a receipt image or paste text. The AI agent will extract the relevant information and pre-fill the form for you to clarify before saving.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Paste Text (e.g., M-Pesa Message, Notes)</label>
            <textarea
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full px-3 py-2 bg-transparent border border-blue-300 dark:border-blue-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-blue-100 resize-none"
              placeholder="e.g. Paid KES 15,000 for Super fuel, truck KCF 119R..."
            />
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-2 bg-white text-sm text-gray-500">AND / OR</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Upload Receipt</label>
            <div 
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 cursor-pointer transition-colors"
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
                <div className="text-sm text-blue-600 font-medium">
                  {file.name}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-500">
                  <Upload className="w-6 h-6 text-gray-400" />
                  <span className="text-sm font-medium">Click to upload an image</span>
                  <span className="text-xs">PNG, JPG, JPEG</span>
                </div>
              )}
            </div>
          </div>

          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExtract}
            disabled={loading || (!text && !file)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors border border-transparent shadow-sm flex items-center gap-2 disabled:opacity-50"
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
