import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Download, 
  Sparkles, 
  CheckCircle2, 
  Play, 
  AlertCircle, 
  Database, 
  Truck, 
  Fuel, 
  DollarSign, 
  Users,
  RefreshCw
} from 'lucide-react';
import { collection, getDocs, query, limit, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/auth';
import { 
  createFleetExpense, 
  createDelivery, 
  createPayment, 
  createTruck, 
  createCustomer, 
  updateCustomer 
} from '../lib/db';
import { addFuelRate } from '../lib/operationsDb';
import { formatCurrency } from '../lib/utils';
import ReactMarkdown from 'react-markdown';
import jsPDF from 'jspdf';
import { format } from 'date-fns';

interface ActionData {
  actionType: 'log_fleet_expense' | 'record_delivery' | 'record_payment' | 'add_truck' | 'add_customer' | 'update_fuel_rate' | string;
  title: string;
  description: string;
  params: Record<string, any>;
  executed?: boolean;
  executing?: boolean;
  error?: string;
  resultId?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  action?: ActionData;
}

const QUICK_PROMPTS = [
  { label: '📊 Pull Business Overview', prompt: 'Please pull a full executive data summary for our business right now: total debtors, fleet consumption, recent deliveries, and active vehicles.' },
  { label: '🚛 Pull Fleet Fueling Breakdown', prompt: 'Pull our fleet fueling data: breakdown by vehicle, product spend (Diesel, Engine Oil, Greasing, Brake Fluid), and recent transactions.' },
  { label: '💰 Who Owes Us Money?', prompt: 'Pull data on all customers with outstanding debt balances, showing credit limits and amount owed.' },
  { label: '⛽ Recent Fuel Deliveries', prompt: 'Pull our recent fuel deliveries with customer names, litres delivered, rates, and total amounts.' },
  { label: '⚡ Log Fleet Fueling', prompt: 'Log 55L of Diesel for truck KDE 179Y at Loruk - Ndalu at rate 219.50 KES.' }
];

export default function AIAssistant() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      text: `### ⚡ Welcome to Loruk Energy Super AI Assistant\n\nI am your intelligent operations & logistics engine with direct read/write capabilities across the entire system.\n\n**What I can do for you:**\n- 📊 **Pull & Read Live Data**: Query customer debts, fleet consumption, delivery logs, fuel rates, and station activities.\n- ✍️ **Write & Execute Operations**: Command me to log fleet expenses, record wholesale deliveries, capture customer payments, register new trucks, or update fuel rates directly from chat.\n- 💡 **Analysis & Auditing**: Calculate vehicle efficiency, identify top credit risks, and generate PDF executive reports.\n\n*Click one of the quick prompts below or type any command to get started!*`
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshingData, setIsRefreshingData] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleDownloadText = (text: string) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Loruk_AI_Report_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = (text: string) => {
    const doc = new jsPDF();
    const splitText = doc.splitTextToSize(text, 180);
    doc.text(splitText, 15, 15);
    doc.save(`Loruk_AI_Report_${Date.now()}.pdf`);
  };

  // Pull deep, real-time context directly from Firestore
  const gatherLiveContext = async () => {
    try {
      setIsRefreshingData(true);
      
      // 1. Customers
      const custSnap = await getDocs(query(collection(db, 'customers'), limit(50)));
      const customers = custSnap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name,
          customerId: data.customerId,
          balance: data.balance || 0,
          creditLimit: data.creditLimit || 0,
          status: data.status || 'active'
        };
      });

      const debtors = customers
        .filter(c => c.balance > 0)
        .sort((a, b) => b.balance - a.balance);
      const totalOutstandingDebt = debtors.reduce((sum, c) => sum + c.balance, 0);

      // 2. Fleet Expenses (corrected collection: 'fleetExpenses')
      const fleetSnap = await getDocs(query(collection(db, 'fleetExpenses'), orderBy('date', 'desc'), limit(50)));
      const fleetLogs = fleetSnap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          reg: data.carRegistration,
          amount: data.amount || 0,
          litres: data.litres || 0,
          rate: data.rate || 0,
          station: data.station || 'Unknown',
          product: data.product || 'Diesel',
          date: data.date ? format(new Date(data.date), 'yyyy-MM-dd') : 'Recent'
        };
      });

      const totalFleetSpend = fleetLogs.reduce((sum, f) => sum + f.amount, 0);
      
      // Product spend aggregation
      const productSpend: Record<string, number> = {};
      const vehicleSpend: Record<string, number> = {};
      fleetLogs.forEach(f => {
        const p = f.product || 'Diesel';
        productSpend[p] = (productSpend[p] || 0) + f.amount;
        vehicleSpend[f.reg] = (vehicleSpend[f.reg] || 0) + f.amount;
      });

      // 3. Deliveries
      const delivSnap = await getDocs(query(collection(db, 'deliveries'), orderBy('date', 'desc'), limit(25)));
      const deliveries = delivSnap.docs.map(d => {
        const data = d.data();
        const cust = customers.find(c => c.id === data.customerId);
        return {
          id: d.id,
          customerName: cust?.name || data.customerName || 'Unknown',
          productType: data.productType || 'Diesel',
          litres: data.litres || 0,
          totalAmount: data.totalAmount || 0,
          date: data.date ? format(new Date(data.date), 'yyyy-MM-dd') : 'Recent'
        };
      });

      const totalDeliveriesValue = deliveries.reduce((sum, d) => sum + d.totalAmount, 0);

      // 4. Trucks
      const trucksSnap = await getDocs(query(collection(db, 'trucks'), limit(30)));
      const trucks = trucksSnap.docs.map(d => ({
        id: d.id,
        reg: d.data().registration,
        status: d.data().status || 'active'
      }));

      // 5. Fuel Rates
      const ratesSnap = await getDocs(query(collection(db, 'fuel_rates'), limit(20)));
      const fuelRates = ratesSnap.docs.map(d => ({
        station: d.data().station,
        product: d.data().product,
        rate: d.data().rate
      }));

      const snapshot = {
        metadata: {
          timestamp: new Date().toISOString(),
          operationalProducts: ['Diesel', 'Super (Premium)', 'Engine Oil', 'Brake Fluid', 'Greasing']
        },
        customersSummary: {
          totalCount: customers.length,
          totalDebtOutstanding: totalOutstandingDebt,
          topDebtors: debtors.slice(0, 10),
          allCustomersList: customers.map(c => ({ id: c.id, name: c.name, balance: c.balance }))
        },
        fleetSummary: {
          recentLogCount: fleetLogs.length,
          totalSpend: totalFleetSpend,
          spendByProduct: productSpend,
          topVehiclesBySpend: Object.entries(vehicleSpend)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([reg, amount]) => ({ reg, amount })),
          recentFuelingLogs: fleetLogs.slice(0, 12)
        },
        deliveriesSummary: {
          totalCount: deliveries.length,
          totalRevenue: totalDeliveriesValue,
          recentDeliveries: deliveries.slice(0, 8)
        },
        activeFleetTrucks: trucks.map(t => t.reg),
        currentFuelRates: fuelRates
      };

      return JSON.stringify(snapshot, null, 2);
    } catch (err) {
      console.error('Failed to gather rich live context:', err);
      return JSON.stringify({ error: 'Partial live data context available.' });
    } finally {
      setIsRefreshingData(false);
    }
  };

  const handleSendMessage = async (userText: string) => {
    if (!userText.trim() || isLoading) return;

    setInput('');
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: userText };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const liveContext = await gatherLiveContext();
      
      const historyPayload = messages.map(m => ({
        role: m.role,
        text: m.text
      }));

      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userText, 
          context: liveContext,
          conversationHistory: historyPayload
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      
      const aiMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        text: data.text || 'I processed your request.',
        action: data.action ? {
          ...data.action,
          executed: false,
          executing: false
        } : undefined
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error('Chat error:', error);
      const errMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        text: `⚠️ **Error Processing Request**\n\nI was unable to complete the analysis. Please check your network connection and try again.` 
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Execution engine: writes directly to Firestore
  const handleExecuteAction = async (msgId: string, action: ActionData) => {
    setMessages(prev => prev.map(m => {
      if (m.id === msgId && m.action) {
        return { ...m, action: { ...m.action, executing: true, error: undefined } };
      }
      return m;
    }));

    try {
      const userEmail = user?.email || 'AI Assistant';
      const p = action.params || {};

      switch (action.actionType) {
        case 'log_fleet_expense': {
          const docId = await createFleetExpense({
            carRegistration: p.carRegistration,
            amount: Number(p.amount) || 0,
            date: p.date ? new Date(p.date).getTime() : Date.now(),
            station: p.station || 'Loruk - Ndalu',
            product: p.product || 'Diesel',
            litres: p.litres ? Number(p.litres) : undefined,
            rate: p.rate ? Number(p.rate) : undefined,
            createdBy: userEmail
          });

          setMessages(prev => prev.map(m => {
            if (m.id === msgId && m.action) {
              return { 
                ...m, 
                action: { ...m.action, executed: true, executing: false, resultId: docId as any } 
              };
            }
            return m;
          }));
          break;
        }

        case 'record_delivery': {
          // Resolve customerId
          let targetCustomerId = p.customerId;
          if (!targetCustomerId && p.customerName) {
            const custSnap = await getDocs(query(collection(db, 'customers'), limit(50)));
            const match = custSnap.docs.find(d => 
              d.data().name.toLowerCase().includes(p.customerName.toLowerCase())
            );
            if (match) targetCustomerId = match.id;
          }

          if (!targetCustomerId) {
            throw new Error(`Customer "${p.customerName}" not found in database.`);
          }

          const amt = Number(p.totalAmount) || 0;
          const deliveryId = await createDelivery({
            customerId: targetCustomerId,
            date: p.date ? new Date(p.date).getTime() : Date.now(),
            productType: p.productType || 'Diesel',
            litres: Number(p.litres) || 0,
            totalAmount: amt,
            createdBy: userEmail
          }, userEmail);

          await updateCustomer(targetCustomerId, {}, { balance: amt, totalPurchases: amt }, userEmail);

          setMessages(prev => prev.map(m => {
            if (m.id === msgId && m.action) {
              return { 
                ...m, 
                action: { ...m.action, executed: true, executing: false, resultId: deliveryId as any } 
              };
            }
            return m;
          }));
          break;
        }

        case 'record_payment': {
          let targetCustomerId = p.customerId;
          if (!targetCustomerId && p.customerName) {
            const custSnap = await getDocs(query(collection(db, 'customers'), limit(50)));
            const match = custSnap.docs.find(d => 
              d.data().name.toLowerCase().includes(p.customerName.toLowerCase())
            );
            if (match) targetCustomerId = match.id;
          }

          if (!targetCustomerId) {
            throw new Error(`Customer "${p.customerName}" not found in database.`);
          }

          const amt = Number(p.amount) || 0;
          const paymentId = await createPayment({
            customerId: targetCustomerId,
            date: p.date ? new Date(p.date).getTime() : Date.now(),
            amount: amt,
            createdBy: userEmail
          }, userEmail);

          await updateCustomer(targetCustomerId, {}, { balance: -amt }, userEmail);

          setMessages(prev => prev.map(m => {
            if (m.id === msgId && m.action) {
              return { 
                ...m, 
                action: { ...m.action, executed: true, executing: false, resultId: paymentId as any } 
              };
            }
            return m;
          }));
          break;
        }

        case 'add_truck': {
          const truckId = await createTruck({
            registration: p.registration?.toUpperCase()?.trim(),
            status: 'active'
          });

          setMessages(prev => prev.map(m => {
            if (m.id === msgId && m.action) {
              return { 
                ...m, 
                action: { ...m.action, executed: true, executing: false, resultId: truckId as any } 
              };
            }
            return m;
          }));
          break;
        }

        case 'add_customer': {
          const customCode = `CUST-${Math.floor(100 + Math.random() * 900)}`;
          const custId = await createCustomer({
            name: p.name,
            customerId: customCode,
            creditLimit: Number(p.creditLimit) || 0,
            balance: Number(p.openingBalance) || 0,
            totalPurchases: 0,
            status: 'active',
            updatedBy: userEmail,
            actionType: 'create'
          });

          setMessages(prev => prev.map(m => {
            if (m.id === msgId && m.action) {
              return { 
                ...m, 
                action: { ...m.action, executed: true, executing: false, resultId: custId as any } 
              };
            }
            return m;
          }));
          break;
        }

        case 'update_fuel_rate': {
          await addFuelRate({
            station: p.station as any,
            product: p.product,
            rate: Number(p.rate) || 0,
            date: Date.now(),
            updatedAt: Date.now()
          });

          setMessages(prev => prev.map(m => {
            if (m.id === msgId && m.action) {
              return { 
                ...m, 
                action: { ...m.action, executed: true, executing: false } 
              };
            }
            return m;
          }));
          break;
        }

        default:
          throw new Error(`Unsupported action type: ${action.actionType}`);
      }

      // Add positive confirmation in chat
      const confirmMsg: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        text: `✅ **Action Executed Successfully!**\n\nThe operation **"${action.title || action.description}"** has been written and persisted to the live database.`
      };
      setMessages(prev => [...prev, confirmMsg]);

    } catch (err: any) {
      console.error('Action execution failed:', err);
      setMessages(prev => prev.map(m => {
        if (m.id === msgId && m.action) {
          return { 
            ...m, 
            action: { 
              ...m.action, 
              executing: false, 
              error: err.message || 'Execution failed' 
            } 
          };
        }
        return m;
      }));
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] glass-panel rounded-xl shadow-2xl border border-theme-border overflow-hidden relative font-sans bg-black">
      {/* Top Header Bar */}
      <div className="px-5 py-3.5 border-b border-theme-border flex items-center justify-between bg-black/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center shadow-[0_0_12px_rgba(124,58,237,0.25)]">
            <Sparkles className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100">Super AI Operations Engine</h2>
              <span className="text-[10px] font-extrabold uppercase tracking-widest bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Read / Write
              </span>
            </div>
            <p className="text-xs text-slate-400">Direct integration with Firestore database, fleet fueling, and wholesale accounts</p>
          </div>
        </div>

        <button
          onClick={gatherLiveContext}
          disabled={isRefreshingData}
          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-theme-border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Refresh real-time data cache"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-violet-400 ${isRefreshingData ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Sync Live Data</span>
        </button>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 sm:gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center shrink-0 shadow-[0_0_8px_rgba(124,58,237,0.2)]">
                <Bot className="w-4 h-4 text-violet-400" />
              </div>
            )}

            <div className={`max-w-[85%] sm:max-w-[78%] rounded-2xl px-5 py-4 ${
              msg.role === 'user' 
                ? 'bg-violet-600/20 text-slate-100 border border-violet-500/30 rounded-br-none shadow-[0_0_15px_rgba(124,58,237,0.15)]' 
                : 'bg-zinc-950/80 text-slate-200 border border-white/10 rounded-bl-none shadow-md'
            }`}>
              {msg.role === 'user' ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed font-medium">{msg.text}</p>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm leading-relaxed prose prose-invert max-w-none text-slate-200 prose-headings:text-violet-300 prose-strong:text-emerald-400 prose-table:border prose-table:border-white/10 prose-th:bg-white/5 prose-td:border-b prose-td:border-white/5">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>

                  {/* Interactive Super Action Execution Card */}
                  {msg.action && (
                    <div className="mt-4 p-4 rounded-xl border border-violet-500/40 bg-violet-500/[0.04] shadow-[0_0_20px_rgba(124,58,237,0.15)] space-y-3">
                      <div className="flex items-center justify-between gap-2 border-b border-violet-500/20 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 rounded-lg bg-violet-500/20 text-violet-300 border border-violet-500/30">
                            {msg.action.actionType.includes('fleet') ? <Truck className="w-4 h-4" /> :
                             msg.action.actionType.includes('delivery') ? <Fuel className="w-4 h-4" /> :
                             msg.action.actionType.includes('payment') ? <DollarSign className="w-4 h-4" /> :
                             <Database className="w-4 h-4" />}
                          </span>
                          <div>
                            <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider">{msg.action.title || 'Executable Database Action'}</h4>
                            <p className="text-[11px] text-slate-400">{msg.action.description}</p>
                          </div>
                        </div>

                        {msg.action.executed ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Executed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-violet-500/20 text-violet-300 border border-violet-500/30">
                            Ready to Execute
                          </span>
                        )}
                      </div>

                      {/* Action Parameters Preview */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        {Object.entries(msg.action.params || {}).map(([key, val]) => (
                          <div key={key} className="bg-black/50 p-2 rounded-lg border border-white/5">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">{key}</span>
                            <span className="font-mono font-bold text-slate-200 truncate block">
                              {typeof val === 'number' && key.toLowerCase().includes('amount') 
                                ? formatCurrency(val) 
                                : String(val)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {msg.action.error && (
                        <div className="p-2.5 rounded-lg bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{msg.action.error}</span>
                        </div>
                      )}

                      {/* Execution Trigger Button */}
                      {!msg.action.executed && (
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            disabled={msg.action.executing}
                            onClick={() => handleExecuteAction(msg.id, msg.action!)}
                            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all cursor-pointer disabled:opacity-50"
                          >
                            {msg.action.executing ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Executing Operation...
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5 fill-black" />
                                Execute Action Now
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions & Export toolbar */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5 opacity-70 hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleDownloadText(msg.text)}
                      className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider text-slate-400 hover:text-white bg-white/5 rounded border border-white/10 hover:border-white/20 transition-all flex items-center gap-1 cursor-pointer"
                      title="Download as Text"
                    >
                      <Download className="w-3 h-3" /> Text
                    </button>
                    <button 
                      onClick={() => handleDownloadPdf(msg.text)}
                      className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider text-violet-300 hover:text-violet-200 bg-violet-500/10 rounded border border-violet-500/20 hover:border-violet-500/40 transition-all flex items-center gap-1 cursor-pointer"
                      title="Download as PDF"
                    >
                      <Download className="w-3 h-3" /> PDF
                    </button>
                  </div>
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-violet-300" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 sm:gap-4 justify-start animate-fade-in">
            <div className="w-8 h-8 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center shrink-0 shadow-[0_0_8px_rgba(124,58,237,0.2)]">
              <Bot className="w-4 h-4 text-violet-400" />
            </div>
            <div className="max-w-[75%] rounded-2xl px-5 py-3.5 bg-zinc-950/80 text-slate-200 border border-white/10 rounded-bl-none flex items-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-slate-200">Reading live database & compiling analysis...</p>
                <p className="text-[10px] text-slate-500">Gemini 3.8 Flash Engine</p>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Action Prompt Chips */}
      <div className="px-4 py-2 border-t border-theme-border bg-black/90 overflow-x-auto flex items-center gap-2 scrollbar-none">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 shrink-0 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-violet-400" /> Quick Commands:
        </span>
        {QUICK_PROMPTS.map((qp, idx) => (
          <button
            key={`qp-${idx}`}
            onClick={() => handleSendMessage(qp.prompt)}
            disabled={isLoading}
            className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/5 hover:bg-violet-500/15 text-slate-300 hover:text-violet-300 border border-white/10 hover:border-violet-500/30 whitespace-nowrap transition-all cursor-pointer shrink-0 disabled:opacity-40"
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <div className="p-4 border-t border-theme-border bg-black">
        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(input); }} className="flex gap-2.5">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI to pull data, analyze reports, or execute an action (e.g. 'Log 50L diesel for KDE 179Y')..."
            className="flex-1 px-4 py-3 bg-zinc-950 border border-white/15 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 text-sm shadow-inner transition-all"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-5 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(124,58,237,0.3)] flex items-center gap-2 cursor-pointer text-sm shrink-0"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
