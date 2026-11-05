import React, { useState, useRef } from 'react';
import { Upload, FileText, Image as ImageIcon, X, Check, Paperclip, AlertCircle } from 'lucide-react';

interface ReceiptProofUploaderProps {
  receiptImage: string | null;
  onImageChange: (image: string | null) => void;
  receiptText: string;
  onTextChange: (text: string) => void;
  compact?: boolean;
}

// Client-side image compression to keep base64 lean and performant
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1200;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(readerEvent.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        // Compress as image/jpeg at 0.82 quality
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
        resolve(compressedDataUrl);
      };
      img.onerror = () => {
        resolve(readerEvent.target?.result as string);
      };
      img.src = readerEvent.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

export default function ReceiptProofUploader({
  receiptImage,
  onImageChange,
  receiptText,
  onTextChange,
  compact = false
}: ReceiptProofUploaderProps) {
  const [activeTab, setActiveTab] = useState<'file' | 'text'>('file');
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcess = async (file: File) => {
    setErrorMessage(null);
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setErrorMessage('Please upload a valid image file (PNG, JPG, WEBP).');
      return;
    }

    try {
      setProcessing(true);
      const compressed = await compressImage(file);
      onImageChange(compressed);
    } catch (err) {
      console.error('Failed to process receipt image:', err);
      setErrorMessage('Could not process this file. Please try another.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await handleFileProcess(file);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await handleFileProcess(file);
    }
  };

  const hasProof = Boolean(receiptImage || receiptText.trim());

  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-black/40 p-3">
      {/* Header with Mode Switching Tabs */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
        <div className="flex items-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5 text-[#6D28D9]" />
          <span className="text-xs font-bold text-slate-200">Transaction Proof / Receipt</span>
          {hasProof && (
            <span className="inline-flex items-center gap-1 rounded bg-[#6D28D9]/20 px-1.5 py-0.2 text-[10px] font-bold text-[#6D28D9] border border-[#6D28D9]/30">
              <Check className="w-2.5 h-2.5" /> Attached
            </span>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 rounded-lg bg-black/60 p-0.5 border border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab('file')}
            className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded transition-all cursor-pointer ${
              activeTab === 'file'
                ? 'bg-[#6D28D9]/25 text-[#6D28D9] border border-[#6D28D9]/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ImageIcon className="w-3 h-3" />
            <span>Image / File</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded transition-all cursor-pointer ${
              activeTab === 'text'
                ? 'bg-[#6D28D9]/25 text-[#6D28D9] border border-[#6D28D9]/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3 h-3" />
            <span>Reference Memo</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-1.5 rounded-lg bg-red-500/15 border border-red-500/30 px-2.5 py-1.5 text-xs text-red-300">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* TAB 1: FILE / IMAGE UPLOAD (With two clear options: Browse & Drag/Drop) */}
      {activeTab === 'file' && (
        <div className="space-y-2">
          {receiptImage ? (
            /* Thumbnail Preview Area */
            <div className="relative flex items-center justify-between gap-3 rounded-lg border border-[#6D28D9]/40 bg-[#6D28D9]/[0.05] p-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-12 w-12 shrink-0 rounded-lg overflow-hidden border border-white/10 bg-black">
                  <img
                    src={receiptImage}
                    alt="Receipt Proof"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-200 truncate">Receipt Proof Image</p>
                  <p className="text-[10px] text-emerald-400 font-medium">Ready to record with transaction</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg bg-white/5 hover:bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-300 border border-white/10 transition-colors cursor-pointer"
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={() => onImageChange(null)}
                  className="rounded-lg bg-red-500/10 hover:bg-red-500/20 p-1 text-red-400 border border-red-500/25 transition-colors cursor-pointer"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* Dual-Option Upload Area: Open Files Button + Drag-and-Drop Surface */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 text-center transition-all ${
                isDragging
                  ? 'border-[#6D28D9] bg-[#6D28D9]/15 shadow-[0_0_20px_rgba(109,40,217,0.25)]'
                  : 'border-white/15 bg-black/20 hover:border-[#6D28D9]/40 hover:bg-[#6D28D9]/[0.02]'
              } ${compact ? 'py-3' : 'py-5'}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
                id="receipt-file-input"
              />

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-sm">
                {/* Option 1: File Dialog Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={processing}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6D28D9]/20 hover:bg-[#6D28D9]/30 text-[#6D28D9] border border-[#6D28D9]/40 hover:border-[#6D28D9]/60 text-xs font-bold transition-all cursor-pointer shadow-xs whitespace-nowrap"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Open / Browse Files</span>
                </button>

                <span className="text-xs text-slate-500 font-medium">or</span>

                {/* Option 2: Active Drop Target */}
                <div className="text-center sm:text-left">
                  <p className="text-xs text-slate-300 font-semibold">Drop receipt image here</p>
                  <p className="text-[10px] text-slate-500">PNG, JPG up to 10MB</p>
                </div>
              </div>

              {processing && (
                <div className="mt-2 text-xs font-semibold text-[#6D28D9] animate-pulse">
                  Processing image...
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REFERENCE MEMO / TEXT PROOF */}
      {activeTab === 'text' && (
        <div className="space-y-1.5">
          <label className="block text-[11px] font-semibold text-slate-400">
            M-Pesa Code, Bank Reference, or Physical Receipt Voucher Note
          </label>
          <textarea
            value={receiptText}
            onChange={(e) => onTextChange(e.target.value)}
            rows={compact ? 2 : 3}
            placeholder="e.g. M-PESA REF: QDH728JS9K, Deposited via Equity Bank Till 92834, Voucher #1042..."
            className="w-full rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:border-[#6D28D9] focus:outline-none focus:ring-1 focus:ring-[#6D28D9] transition-all resize-none"
          />
          <div className="flex justify-between items-center text-[10px] text-slate-500">
            <span>Text will be saved alongside the transaction record</span>
            <span>{receiptText.length} chars</span>
          </div>
        </div>
      )}
    </div>
  );
}
