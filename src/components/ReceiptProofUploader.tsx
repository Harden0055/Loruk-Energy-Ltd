import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Image as ImageIcon, X, Check, Paperclip, AlertCircle, ClipboardPaste, Copy } from 'lucide-react';

interface ReceiptProofUploaderProps {
  receiptImage: string | null;
  onImageChange: (image: string | null) => void;
  receiptText: string;
  onTextChange: (text: string) => void;
  compact?: boolean;
}

// Client-side image compression to keep base64 lean and fast in Firestore
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
  const [activeTab, setActiveTab] = useState<'file' | 'text'>(receiptImage ? 'file' : receiptText.trim() ? 'text' : 'file');
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [pasteFeedback, setPasteFeedback] = useState(false);
  const [imagePasteFeedback, setImagePasteFeedback] = useState(false);
  const [imageCopyFeedback, setImageCopyFeedback] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Copy text memo to clipboard
  const handleCopyReference = async () => {
    if (!receiptText.trim()) return;
    try {
      await navigator.clipboard.writeText(receiptText);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  // Paste text memo from clipboard (e.g., M-Pesa SMS or bank reference)
  const handlePasteReference = async () => {
    setErrorMessage(null);
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        onTextChange(text.trim());
        setPasteFeedback(true);
        setTimeout(() => setPasteFeedback(false), 2000);
      } else {
        setErrorMessage('Clipboard is empty or does not contain text. Copy a message first.');
      }
    } catch (err) {
      console.error('Failed to paste from clipboard', err);
      setErrorMessage('Please allow clipboard permission or paste using Ctrl+V / Cmd+V.');
    }
  };

  // Paste image directly from clipboard (e.g., screenshot or copied picture)
  const handlePasteImageFromClipboard = async () => {
    setErrorMessage(null);
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) {
        setErrorMessage('Clipboard image reading not available in this browser. Please use Ctrl+V to paste.');
        return;
      }
      const clipboardItems = await navigator.clipboard.read();
      let foundImage = false;
      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            const file = new File([blob], 'pasted-receipt.png', { type });
            await handleFileProcess(file);
            setImagePasteFeedback(true);
            setTimeout(() => setImagePasteFeedback(false), 2000);
            foundImage = true;
            return;
          }
        }
      }

      if (!foundImage) {
        // If no image, check if clipboard has text message
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          onTextChange(text.trim());
          setActiveTab('text');
          setPasteFeedback(true);
          setTimeout(() => setPasteFeedback(false), 2000);
          return;
        }
        setErrorMessage('No image found in clipboard. Copy a screenshot or photo first, then paste.');
      }
    } catch (err: any) {
      console.error('Failed to read image from clipboard', err);
      setErrorMessage('Could not access clipboard image. Try pressing Ctrl+V / Cmd+V directly.');
    }
  };

  // Copy attached receipt image to clipboard
  const handleCopyImageToClipboard = async () => {
    if (!receiptImage) return;
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = receiptImage;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          setImageCopyFeedback(true);
          setTimeout(() => setImageCopyFeedback(false), 2000);
        } catch (clipErr) {
          console.error('Failed to write image to clipboard:', clipErr);
        }
      }, 'image/png');
    } catch (err) {
      console.error('Failed to copy image to clipboard', err);
    }
  };

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

  // Intercept paste anywhere in this component or window
  const handleContainerPaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            setActiveTab('file');
            await handleFileProcess(file);
            setImagePasteFeedback(true);
            setTimeout(() => setImagePasteFeedback(false), 2000);
            return;
          }
        }
      }
    }

    const target = e.target as HTMLElement;
    if (target.tagName !== 'TEXTAREA' && target.tagName !== 'INPUT') {
      const text = e.clipboardData?.getData('text');
      if (text && text.trim()) {
        e.preventDefault();
        onTextChange(text.trim());
        setActiveTab('text');
        setPasteFeedback(true);
        setTimeout(() => setPasteFeedback(false), 2000);
      }
    }
  };

  // Global paste handler to capture screenshots or text even when clicking anywhere in modal
  useEffect(() => {
    const handleGlobalPaste = async (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

      const items = e.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            if (file) {
              e.preventDefault();
              setActiveTab('file');
              await handleFileProcess(file);
              setImagePasteFeedback(true);
              setTimeout(() => setImagePasteFeedback(false), 2000);
              return;
            }
          }
        }
      }

      if (!isInput) {
        const text = e.clipboardData?.getData('text');
        if (text && text.trim()) {
          e.preventDefault();
          onTextChange(text.trim());
          setActiveTab('text');
          setPasteFeedback(true);
          setTimeout(() => setPasteFeedback(false), 2000);
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, []);

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

  const hasImage = Boolean(receiptImage);
  const hasText = Boolean(receiptText.trim());

  return (
    <div onPaste={handleContainerPaste} className="space-y-2 rounded-xl border border-white/10 bg-black/40 p-3">
      {/* Header with Mode Switching Tabs */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Paperclip className="w-3.5 h-3.5 text-[#6D28D9]" />
          <span className="text-xs font-bold text-slate-200">Proof of Transaction</span>
          {(hasImage || hasText) && (
            <span className="inline-flex items-center gap-1 rounded bg-[#6D28D9]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#A78BFA] border border-[#6D28D9]/30">
              <Check className="w-2.5 h-2.5 text-emerald-400" />
              {hasImage && hasText ? 'Image + Memo' : hasImage ? 'Image' : 'Text Memo'}
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
                ? 'bg-[#6D28D9]/25 text-[#A78BFA] border border-[#6D28D9]/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ImageIcon className="w-3 h-3" />
            <span>Image / File</span>
            {hasImage && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded transition-all cursor-pointer ${
              activeTab === 'text'
                ? 'bg-[#6D28D9]/25 text-[#A78BFA] border border-[#6D28D9]/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3 h-3" />
            <span>Text Message / SMS</span>
            {hasText && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-1.5 rounded-lg bg-red-500/15 border border-red-500/30 px-2.5 py-1.5 text-xs text-red-300">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* TAB 1: FILE / IMAGE UPLOAD (Open file, Drag & Drop, or Paste Image) */}
      {activeTab === 'file' && (
        <div className="space-y-2">
          {receiptImage ? (
            /* Thumbnail Preview Area with Copy & Replace actions */
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
                  onClick={handleCopyImageToClipboard}
                  className="rounded-lg bg-[#6D28D9]/20 hover:bg-[#6D28D9]/30 px-2 py-1 text-[11px] font-bold text-[#A78BFA] border border-[#6D28D9]/40 transition-colors cursor-pointer flex items-center gap-1"
                  title="Copy image to clipboard"
                >
                  {imageCopyFeedback ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-[#A78BFA]" />}
                  <span>{imageCopyFeedback ? 'Copied!' : 'Copy Image'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg bg-white/5 hover:bg-white/10 px-2 py-1 text-[11px] font-semibold text-slate-300 border border-white/10 transition-colors cursor-pointer"
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
            /* Multi-Option Upload Area: Open File + Drag/Drop + Paste Image Button */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 text-center transition-all ${
                isDragging
                  ? 'border-[#6D28D9] bg-[#6D28D9]/15 shadow-[0_0_20px_rgba(109,40,217,0.25)]'
                  : 'border-white/15 bg-black/20 hover:border-[#6D28D9]/40 hover:bg-[#6D28D9]/[0.02]'
              } ${compact ? 'py-3' : 'py-4'}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
                id="receipt-file-input"
              />

              <div className="flex flex-wrap items-center justify-center gap-2.5 w-full">
                {/* Option 1: File Dialog Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={processing}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6D28D9]/20 hover:bg-[#6D28D9]/30 text-[#A78BFA] border border-[#6D28D9]/40 hover:border-[#6D28D9]/60 text-xs font-bold transition-all cursor-pointer shadow-xs whitespace-nowrap"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Open Files</span>
                </button>

                {/* Option 2: Paste Image Button */}
                <button
                  type="button"
                  onClick={handlePasteImageFromClipboard}
                  disabled={processing}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/50 text-xs font-bold transition-all cursor-pointer shadow-xs whitespace-nowrap"
                  title="Paste copied screenshot or image from clipboard"
                >
                  {imagePasteFeedback ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <ClipboardPaste className="w-3.5 h-3.5 text-emerald-300" />}
                  <span>{imagePasteFeedback ? 'Image Pasted!' : 'Paste Image'}</span>
                </button>

                {/* Option 3: Active Drop Target Info */}
                <span className="text-xs text-slate-500 font-medium">or drop image / press Ctrl+V</span>
              </div>

              {processing && (
                <div className="mt-2 text-xs font-semibold text-[#A78BFA] animate-pulse">
                  Compressing and preparing image...
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REFERENCE MEMO / TEXT PROOF / SMS */}
      {activeTab === 'text' && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <label className="block text-[11px] font-semibold text-slate-400">
              Receipt SMS, M-Pesa Message, or Bank Reference
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePasteReference}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold bg-[#6D28D9]/20 hover:bg-[#6D28D9]/30 text-[#A78BFA] border border-[#6D28D9]/40 transition-colors cursor-pointer"
                title="Paste text message or reference from clipboard"
              >
                {pasteFeedback ? <Check className="w-3 h-3 text-emerald-400" /> : <ClipboardPaste className="w-3 h-3 text-[#A78BFA]" />}
                <span>{pasteFeedback ? 'Pasted!' : 'Paste Text Message'}</span>
              </button>
              {receiptText.trim().length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleCopyReference}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors cursor-pointer"
                    title="Copy text memo to clipboard"
                  >
                    {copyFeedback ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                    <span>{copyFeedback ? 'Copied!' : 'Copy'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onTextChange('')}
                    className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                    title="Clear reference text"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
          <textarea
            value={receiptText}
            onChange={(e) => onTextChange(e.target.value)}
            rows={compact ? 2 : 3}
            placeholder="Paste M-PESA SMS (e.g. QDH728JS9K Confirmed. Ksh 50,000 sent to Loruk Energy...) or bank slip number..."
            className="w-full rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:border-[#6D28D9] focus:outline-none focus:ring-1 focus:ring-[#6D28D9] transition-all resize-none"
          />
          <div className="flex justify-between items-center text-[10px] text-slate-500">
            <span>Tip: You can press Ctrl+V to paste SMS text or screenshot image directly</span>
            <span>{receiptText.length} chars</span>
          </div>
        </div>
      )}
    </div>
  );
}
