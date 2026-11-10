import React, { useState, useEffect } from 'react';
import { X, Sparkles, Check, ClipboardPaste, ArrowRight, DollarSign, Calendar, User, FileText, AlertCircle, Copy } from 'lucide-react';
import { useCustomers, createPayment, updateCustomer } from '../lib/db';
import { useDailyInvoices, updateDailyInvoice } from '../lib/operationsDb';
import { useAuth } from '../lib/auth';
import { formatCurrency, parseDateToTimestamp, formatDateToInput, parseCleanNumber } from '../lib/utils';
import { parseReceiptMessage, ParsedReceiptData } from '../lib/receiptParser';
import { Payment } from '../types';

interface ShareReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialText?: string;
  defaultCustomerId?: string;
  onPaymentRecorded?: (payment: any) => void;
}

export default function ShareReceiptModal({
  isOpen,
  onClose,
  initialText = '',
  defaultCustomerId = '',
  onPaymentRecorded
}: ShareReceiptModalProps) {
  const { customers, loading: customersLoading } = useCustomers();
  const { invoices } = useDailyInvoices();
  const { user } = useAuth();

  const [rawText, setRawText] = useState(initialText);
  const [selectedCustomerId, setSelectedCustomerId] = useState(defaultCustomerId);
  const [amountStr, setAmountStr] = useState('');
  const [dateStr, setDateStr] = useState(formatDateToInput(new Date()));
  const [detectedConfidence, setDetectedConfidence] = useState(0);
  const [detectedRef, setDetectedRef] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Sync incoming initial text or customer ID
  useEffect(() => {
    if (initialText) {
      setRawText(initialText);
      runParser(initialText);
    }
  }, [initialText]);

  useEffect(() => {
    if (defaultCustomerId && !selectedCustomerId) {
      setSelectedCustomerId(defaultCustomerId);
    }
  }, [defaultCustomerId]);

  const runParser = (text: string) => {
    setErrorMsg(null);
    if (!text.trim()) {
      setAmountStr('');
      setDetectedConfidence(0);
      setDetectedRef(null);
      return;
    }

    const parsed = parseReceiptMessage(text, customers);
    if (parsed.amount) {
      setAmountStr(String(parsed.amount));
    }
    if (parsed.dateStr) {
      setDateStr(parsed.dateStr);
    }
    if (parsed.matchedCustomer) {
      setSelectedCustomerId(parsed.matchedCustomer.id);
      setDetectedConfidence(parsed.confidenceScore);
    }
    if (parsed.referenceCode) {
      setDetectedRef(parsed.referenceCode);
    }
  };

  const handlePasteFromClipboard = async () => {
    setErrorMsg(null);
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        setRawText(text.trim());
        runParser(text.trim());
      } else {
        setErrorMsg('Clipboard is empty or does not contain text. Copy a message first.');
      }
    } catch (err) {
      console.error('Failed to read clipboard', err);
      setErrorMsg('Could not access clipboard. Paste manually into the text box below (Ctrl+V).');
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setRawText(text);
    runParser(text);
  };

  const handleCopyText = async () => {
    if (!rawText.trim()) return;
    try {
      await navigator.clipboard.writeText(rawText);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const amountVal = parseCleanNumber(amountStr);
    if (!amountVal || amountVal <= 0) {
      setErrorMsg('Please enter or confirm a valid payment amount (greater than 0).');
      return;
    }

    if (!selectedCustomerId) {
      setErrorMsg('Please select the customer this payment belongs to.');
      return;
    }

    const targetCustomer = customers.find(c => c.id === selectedCustomerId);
    if (!targetCustomer) {
      setErrorMsg('Selected customer was not found. Please pick from the list.');
      return;
    }

    setLoading(true);
    try {
      const paymentTimestamp = parseDateToTimestamp(dateStr);
      const userEmail = user?.email || user?.uid || 'Unknown';

      const paymentData: Omit<Payment, 'id' | 'updatedBy' | 'actionType'> = {
        customerId: targetCustomer.id,
        date: paymentTimestamp,
        amount: amountVal,
        createdBy: userEmail,
      };

      if (rawText.trim()) {
        paymentData.receiptText = rawText.trim();
      }

      // 1. Record payment in database
      const created = await createPayment(paymentData, userEmail);

      // 2. Adjust customer balance
      await updateCustomer(targetCustomer.id, {}, { balance: -amountVal }, userEmail);

      // 3. Optional invoice reconciliation (safe non-blocking)
      try {
        const matchingInvoice = invoices.find(i => i.customerName === targetCustomer.name && i.balance > 0);
        if (matchingInvoice) {
          const newPaidAmount = Math.min(matchingInvoice.invoiceAmount, (matchingInvoice.paidAmount || 0) + amountVal);
          const newBalance = matchingInvoice.invoiceAmount - newPaidAmount;
          await updateDailyInvoice(matchingInvoice.id!, {
            paidAmount: newPaidAmount,
            balance: newBalance,
            status: newBalance <= 0 ? 'PAID' : 'PARTIAL'
          });
        }
      } catch (invErr) {
        console.warn('Invoice balance update notice:', invErr);
      }

      setSuccessMsg(`Successfully recorded Ksh ${amountVal.toLocaleString()} for ${targetCustomer.name}!`);
      if (onPaymentRecorded) {
        onPaymentRecorded(created);
      }

      setTimeout(() => {
        setSuccessMsg(null);
        setRawText('');
        setAmountStr('');
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Payment creation error:', err);
      setErrorMsg(`Error recording payment: ${err?.message || 'Please check the values and try again'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentCustomer = customers.find(c => c.id === selectedCustomerId);

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in">
      <div className="bg-[#09090b] border border-[#4338CA]/40 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#4338CA]/20 bg-[#4338CA]/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#4338CA]/20 text-[#818CF8] border border-[#4338CA]/30">
              <Sparkles className="w-5 h-5 text-[#818CF8]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Smart Receipt & Payment Auto-Fill</span>
              </h3>
              <p className="text-xs text-slate-400">
                Paste or share any SMS or message to auto-detect customer, amount & date
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2 font-bold animate-fade-in">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Section 1: Raw Receipt Text / SMS Box with Quick Paste */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#4338CA]" />
                <span>Receipt SMS / Message Text</span>
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold bg-[#4338CA]/20 hover:bg-[#4338CA]/30 text-[#818CF8] border border-[#4338CA]/40 transition-colors cursor-pointer shadow-xs"
                  title="Paste copied SMS message"
                >
                  <ClipboardPaste className="w-3.5 h-3.5 text-[#818CF8]" />
                  <span>Paste SMS from Clipboard</span>
                </button>
                {rawText.trim().length > 0 && (
                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors cursor-pointer"
                    title="Copy message"
                  >
                    {copyFeedback ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                    <span>{copyFeedback ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>
            </div>
            <textarea
              rows={3}
              value={rawText}
              onChange={handleTextChange}
              placeholder="Paste any M-PESA SMS (e.g. QDH728JS9K Confirmed. Ksh50,660 sent to Loruk Energy by Birachi Filling Station on 05/11/2026...), bank alert, or transaction memo..."
              className="w-full rounded-xl border border-white/15 bg-black/60 px-3 py-2.5 text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:border-[#4338CA] focus:outline-none focus:ring-1 focus:ring-[#4338CA] transition-all resize-none"
            />
          </div>

          {/* Section 2: Detected & Confirmed Payment Parameters */}
          <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 space-y-3.5">
            <div className="flex items-center justify-between text-xs border-b border-white/10 pb-2">
              <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">
                Verified Transaction Details
              </span>
              {detectedConfidence > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <Check className="w-2.5 h-2.5" /> Auto-matched Customer
                </span>
              )}
            </div>

            {/* Customer Dropdown (Pre-selected by parser with one-tap picker to change) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#4338CA]" />
                  <span>Customer *</span>
                </span>
                {currentCustomer && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    Balance: Ksh {currentCustomer.balance.toLocaleString()}
                  </span>
                )}
              </label>
              <select
                required
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                disabled={customersLoading}
                className="w-full px-3 py-2.5 bg-[#000000] border border-white/15 rounded-lg text-slate-100 font-semibold cursor-pointer outline-none hover:border-[#4338CA] focus:border-[#4338CA] focus:ring-1 focus:ring-[#4338CA] text-sm shadow-sm transition-colors"
              >
                <option value="" disabled>-- Select a customer --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id} className="bg-black text-white">
                    {c.customerId ? `[${c.customerId}] ` : ''}{c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount and Date in Two Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Amount (KES) *</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2.5 bg-[#000000] border border-white/15 rounded-lg text-emerald-400 font-mono font-bold text-base outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-sm"
                />
                {parseCleanNumber(amountStr) > 0 && (
                  <p className="mt-1 text-[10px] text-slate-400 font-mono">
                    {formatCurrency(parseCleanNumber(amountStr))}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#4338CA]" />
                  <span>Payment Date *</span>
                </label>
                <input
                  type="date"
                  required
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#000000] border border-white/15 rounded-lg text-slate-100 font-mono text-sm outline-none focus:border-[#4338CA] focus:ring-1 focus:ring-[#4338CA] shadow-sm"
                />
              </div>
            </div>

            {detectedRef && (
              <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                <span className="text-slate-400">Transaction Reference Code:</span>
                <span className="font-mono font-bold text-[#818CF8] bg-[#4338CA]/20 px-2 py-0.5 rounded border border-[#4338CA]/30">
                  {detectedRef}
                </span>
              </div>
            )}
          </div>

          {/* Footer Submit */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedCustomerId || !parseCleanNumber(amountStr)}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl text-xs sm:text-sm transition-all cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <span>Recording...</span>
              ) : (
                <>
                  <span>Record Payment</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
