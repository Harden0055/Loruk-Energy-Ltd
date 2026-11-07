import React, { useState } from 'react';
import { X, Download, Copy, Check, ZoomIn, ZoomOut, FileText, Image as ImageIcon, Calendar, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '../lib/utils';

export interface ReceiptProofData {
  image?: string;
  receiptImage?: string;
  text?: string;
  receiptText?: string;
  title?: string;
  amount?: number;
  date?: number;
  subtitle?: string;
  referenceType?: 'Payment' | 'Fleet Fueling' | 'Transaction';
  entityName?: string;
  category?: string;
}

interface ReceiptProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  proof: ReceiptProofData | null;
}

export default function ReceiptProofModal({ isOpen, onClose, proof }: ReceiptProofModalProps) {
  const [copied, setCopied] = useState(false);
  const [imageCopied, setImageCopied] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  if (!isOpen || !proof) return null;

  const displayImage = proof.receiptImage || proof.image;
  const displayText = proof.receiptText || proof.text;

  const handleCopyText = async () => {
    if (!displayText) return;
    try {
      await navigator.clipboard.writeText(displayText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  const handleCopyImage = async () => {
    if (!displayImage) return;
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = displayImage;
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
          setImageCopied(true);
          setTimeout(() => setImageCopied(false), 2000);
        } catch (clipErr) {
          console.error('Failed to write image to clipboard:', clipErr);
        }
      }, 'image/png');
    } catch (err) {
      console.error('Failed to copy image to clipboard', err);
    }
  };

  const handleDownloadImage = () => {
    if (!displayImage) return;
    const link = document.createElement('a');
    link.href = displayImage;
    link.download = `receipt_proof_${proof.date ? format(new Date(proof.date), 'yyyyMMdd_HHmm') : Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-[#09090b] border border-[#6D28D9]/40 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#6D28D9]/20 bg-[#6D28D9]/[0.05] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#6D28D9]/20 text-[#6D28D9] border border-[#6D28D9]/30">
              {displayImage ? <ImageIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100">
                  {proof.title || 'Transaction Receipt Proof'}
                </h3>
                {proof.referenceType && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#6D28D9]/20 text-[#6D28D9] border border-[#6D28D9]/30 uppercase tracking-wider">
                    {proof.referenceType}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {proof.subtitle || 'Verified proof of payment/fueling recorded in the system'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Transaction Summary Chips */}
        {(proof.amount !== undefined || proof.date !== undefined) && (
          <div className="px-5 py-2.5 bg-black/40 border-b border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
            {proof.date && (
              <div className="flex items-center gap-1.5 text-slate-400 font-mono">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{format(new Date(proof.date), 'dd MMM yyyy, HH:mm')}</span>
              </div>
            )}
            {proof.amount !== undefined && (
              <div className="flex items-center gap-1 font-mono font-bold">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-400 text-[11px]">Amount:</span>
                <span className="text-emerald-400 text-sm">{formatCurrency(proof.amount)}</span>
              </div>
            )}
          </div>
        )}

        {/* Body Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* 1. Image Preview Section */}
          {displayImage && (
            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-[#6D28D9]" /> Receipt Scan / Slip Photo
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={handleCopyImage}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#6D28D9]/20 hover:bg-[#6D28D9]/30 text-[#A78BFA] border border-[#6D28D9]/40 transition-colors cursor-pointer"
                    title="Copy receipt image to clipboard"
                  >
                    {imageCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#A78BFA]" />}
                    <span>{imageCopied ? 'Image Copied!' : 'Copy Image'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsZoomed(!isZoomed)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors cursor-pointer"
                  >
                    {isZoomed ? <ZoomOut className="w-3.5 h-3.5" /> : <ZoomIn className="w-3.5 h-3.5" />}
                    <span>{isZoomed ? 'Fit' : 'Full Size'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadImage}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-white/15 bg-black/60 overflow-hidden flex items-center justify-center p-2 min-h-[220px]">
                <img
                  src={displayImage}
                  alt="Receipt Document Proof"
                  className={`rounded-lg transition-all ${
                    isZoomed ? 'w-auto max-h-none object-contain' : 'max-h-[380px] w-full object-contain'
                  }`}
                />
              </div>
            </div>
          )}

          {/* 2. Text Reference / Memo Section */}
          {displayText && (
            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#6D28D9]" /> Reference Memo / Receipt SMS
                </span>
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg bg-[#6D28D9]/20 hover:bg-[#6D28D9]/30 text-[#A78BFA] border border-[#6D28D9]/40 transition-colors cursor-pointer shadow-xs"
                  title="Copy reference memo or SMS to clipboard"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#A78BFA]" />}
                  <span>{copied ? 'Copied Reference!' : 'Copy Reference / SMS'}</span>
                </button>
              </div>

              <div className="p-3.5 rounded-xl border border-white/10 bg-black/50 font-mono text-xs sm:text-sm text-slate-200 whitespace-pre-wrap leading-relaxed select-all">
                {displayText}
              </div>
            </div>
          )}

          {!displayImage && !displayText && (
            <div className="py-8 text-center text-xs text-slate-500">
              No receipt image or text proof attached to this transaction record.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 bg-black/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
}
