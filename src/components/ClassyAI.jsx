import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Send, UserPlus, ShoppingBag, BarChart3, Search, MessageSquare, Mic, Sparkles, Package } from 'lucide-react';

const ClassyAI = ({
  user,
  isAdmin,
  clients,
  setClients,
  saveClient,
  deleteClient,
  orders,
  setOrders,
  saveOrder,
  deleteOrder,
  sales,
  setCurrentPage,
  showGlobalToast,
  activities,
  saveActivity,
  inventory = [],
  users = [],
  orderLimits = {},
  setOrderLimits,
  saveConfig,
  selectedClient,
  setSelectedClient,
  clientDetailMode,
  setClientDetailMode
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `Hello ${user?.name || 'there'}! I'm Classy AI. How can I help you manage your boutique today?` }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const addActivity = (title) => {
    if (!saveActivity) return;
    const newAct = {
      id: Date.now(),
      title,
      timestamp: new Date().toISOString(),
      actor: user?.name || 'System',
      type: 'AI_AGENT'
    };
    saveActivity(newAct);
  };

  // --- THE BRAIN ENGINE ---
  const processCommand = async (text) => {
    const cmd = text.toLowerCase();
    setIsTyping(true);
    await new Promise(r => setTimeout(r, 500)); // Faster response

    // --- 0. CONTEXT & MEMORY (HIGHEST PRIORITY) ---
    const isAffirmative = cmd.startsWith('yes') || cmd.startsWith('sure') || cmd.startsWith('ok') || cmd.startsWith('go') || cmd.startsWith('do it');
    const dateMatch = cmd.match(/\d+/);
    const hasMonth = (cmd.includes('jan') || cmd.includes('feb') || cmd.includes('mar') || cmd.includes('apr') || cmd.includes('may') || cmd.includes('jun') || cmd.includes('jul') || cmd.includes('aug') || cmd.includes('sep') || cmd.includes('oct') || cmd.includes('nov') || cmd.includes('dec'));
    
    // If we are waiting for a date to set a limit
    if ((isAffirmative || (dateMatch && hasMonth) || cmd.length < 10) && window._pendingAIAction === 'SET_LIMIT') {
      const limit = window._pendingAILimit || 2;
      const year = new Date().getFullYear();
      
      const monthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
      const monthShort = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
      let fM = -1, fD = -1;
      
      cmd.split(/[ \/\-,]/).forEach(w => {
        const mI = monthNames.indexOf(w.trim());
        const sI = monthShort.indexOf(w.trim());
        if (mI !== -1) fM = mI;
        if (sI !== -1) fM = sI;
        const v = parseInt(w);
        if (!isNaN(v) && v <= 31 && fD === -1) fD = v;
      });

      if (fM !== -1 && fD !== -1) {
        const dateKey = `${year}-${String(fM + 1).padStart(2, '0')}-${String(fD).padStart(2, '0')}`;
        const newLimits = { ...orderLimits, [dateKey]: limit };
        setOrderLimits(newLimits);
        if (saveConfig) saveConfig('orderLimits', newLimits);
        window._pendingAIAction = null;
        return `✅ **Operational Success**: I've successfully applied the limit of **${limit} orders** to **${monthNames[fM].toUpperCase()} ${fD}**. Thank you for your patience!`;
      }
    }

    // --- 1. MASTER DELETE & CONTROL (Admin Only) ---
    if (cmd.includes('delete') || cmd.includes('remove') || cmd.includes('erase')) {
      if (!isAdmin) {
        addActivity(`Unauthorized: Staff ${user?.name} tried to delete a record via AI.`);
        return "🚫 **Permission Denied**: For security reasons, only the **Boutique Admin** can delete records. Please contact your manager.";
      }
      
      if (cmd.includes('order')) {
        const orderId = cmd.match(/\d+/)?.[0];
        if (orderId) {
          const found = orders.find(o => String(o.id) === String(orderId) || String(o.orderId) === String(orderId));
          if (found) {
            if (deleteOrder) deleteOrder(found.id);
            setOrders(prev => prev.filter(o => String(o.id) !== String(found.id)));
            addActivity(`AI Deleted Order: #${found.id}`);
            return `🗑️ **Order Purged**: Order **#${found.id}** has been permanently removed from the cloud.`;
          }
          return `I couldn't find order #${orderId}. Please verify the ID!`;
        }
      }

      if (cmd.includes('client')) {
        const name = cmd.replace(/.*delete client |.*remove client /, '').trim();
        const found = clients.find(c => c.name.toLowerCase().includes(name.toLowerCase()));
        if (found) {
          if (deleteClient) deleteClient(found.id);
          setClients(prev => prev.filter(c => String(c.id) !== String(found.id)));
          addActivity(`AI Deleted Client: ${found.name}`);
          return `🗑️ **Client Removed**: **${found.name}** and their history have been permanently deleted from your boutique cloud.`;
        }
        return `I couldn't find a client named "${name}". Try giving me their full name!`;
      }
      return "What would you like to delete? Please say 'Delete order [ID]' or 'Delete client [Name]'.";
    }

    // --- 2. DATA ANALYSIS & INSIGHTS ---
    if (cmd.includes('best client') || cmd.includes('top client') || cmd.includes('valuable client')) {
      if (!isAdmin) return "🔒 **Admin Access Required** for financial client analysis.";
      const clientStats = {};
      orders.forEach(o => {
        const cid = o.clientId || o.client;
        if (cid) clientStats[cid] = (clientStats[cid] || 0) + (parseFloat(o.totalAmount) || 0);
      });
      const topClientId = Object.keys(clientStats).reduce((a, b) => clientStats[a] > clientStats[b] ? a : b, null);
      const topClient = clients.find(c => (c.clientId || c.id || c.phone) == topClientId);
      if (topClient) return `Based on order history, **${topClient.name}** is your top client with ₹${clientStats[topClientId].toLocaleString()} spend. Shall I open their profile?`;
      return "I need more order data to calculate that!";
    }

    // --- 3. FINANCIAL INTELLIGENCE ---
    if (cmd.includes('report') || cmd.includes('revenue') || cmd.includes('money') || cmd.includes('sale')) {
      if (!isAdmin) return "🔒 **Access Denied**: Financial reports are for Admins only.";
      const total = orders.reduce((acc, s) => acc + (parseFloat(s.total || s.paidAmount || 0)), 0);
      return `💸 **Revenue Pulse**: Your total life-time revenue is **₹${total.toLocaleString()}**. Would you like me to open the full Reports page?`;
    }

    // --- 4. FUZZY NAVIGATION & MASTER ACCESS ---
    const isNav = cmd.includes('go') || cmd.includes('open') || cmd.includes('show') || cmd.includes('take') || cmd.includes('view') || cmd.includes('page') || cmd.includes('look');
    
    if (isNav || cmd.length < 12) {
      if (cmd.includes('inv') || cmd.includes('stock') || cmd.includes('material')) {
        setCurrentPage('view-inventory');
        return "Opening **Inventory**. Everything is in its place!";
      }
      if (cmd.includes('client') || cmd.includes('cust') || cmd.includes('people')) {
        setCurrentPage('view-clients');
        return "Showing your **Client List**.";
      }
      if (cmd.includes('order') || cmd.includes('stitch') || cmd.includes('book')) {
        setCurrentPage('view-orders');
        return "Opening the **Order Book**.";
      }
      if (cmd.includes('user') || cmd.includes('team') || cmd.includes('staff')) {
        setCurrentPage('view-users');
        return "Showing your **Team Members**.";
      }
      if (cmd.includes('dash') || cmd.includes('home')) {
        setCurrentPage('dashboard');
        return "Back to **Dashboard**!";
      }
    }

    // --- 5. OPERATIONAL CONTROL (Settings & Limits) ---
    if (cmd.includes('limit') && (cmd.includes('set') || cmd.includes('change'))) {
      if (!isAdmin) return "🔒 **Admin Access Required**: Production limits are owner-only.";
      
      const numMatch = cmd.match(/\d+/);
      const limit = numMatch ? parseInt(numMatch[0]) : null;
      
      const monthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
      const monthShort = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
      let fMonth = -1, fDay = -1;
      
      // Smart Parse: Ignore the limit number when looking for the day
      const words = cmd.split(/[ \/\-]/);
      words.forEach((w, idx) => {
        const mI = monthNames.indexOf(w);
        const sI = monthShort.indexOf(w);
        if (mI !== -1) fMonth = mI;
        if (sI !== -1) fMonth = sI;
        
        const v = parseInt(w);
        if (!isNaN(v)) {
          // If this number isn't the limit, or if it's clearly a day (1-31) and we found a month
          if (v !== limit || (idx > 0 && (words[idx-1].includes('may') || words[idx-1].includes('jun') || words[idx-1].includes('jul')))) {
             if (v <= 31 && fDay === -1 && v !== limit) fDay = v;
             // Special case: if "may 15" and limit is 2, 15 is definitely the day
             if (v > limit && v <= 31) fDay = v;
          }
        }
      });

      // Fallback: if we still don't have a day, look for the last number in the string
      if (fDay === -1 && words.length > 0) {
        for (let i = words.length - 1; i >= 0; i--) {
          const v = parseInt(words[i]);
          if (!isNaN(v) && v <= 31 && v !== limit) { fDay = v; break; }
        }
      }

      if (fMonth !== -1 && fDay !== -1 && limit !== null) {
        const dateKey = `${new Date().getFullYear()}-${String(fMonth + 1).padStart(2, '0')}-${String(fDay).padStart(2, '0')}`;
        const newLimits = { ...orderLimits, [dateKey]: limit };
        setOrderLimits(newLimits);
        if (saveConfig) saveConfig('orderLimits', newLimits);
        window._pendingAIAction = null;
        return `✅ **Operational Update**: I've correctly set the limit to **${limit} orders** for **${monthNames[fMonth].toUpperCase()} ${fDay}**. I ignored the "2" when looking for the date this time!`;
      }
      
      window._pendingAIAction = 'SET_LIMIT';
      window._pendingAILimit = limit;
      if (limit === null) return "How many orders should we limit it to? (Example: 'Limit 2')";
      return `I've got the limit count (${limit}), but I need the date. Could you please say just the date (like "May 15")?`;
    }

    // --- 6. ENTITY NAVIGATION (Edit/View Specifics) ---
    if (cmd.includes('edit') && (cmd.includes('client') || cmd.includes('cust'))) {
      const searchName = cmd.replace(/edit|client|cust/g, '').trim();
      if (searchName.length < 2) return "Who should I edit? (Example: 'Edit client Meera')";
      
      const target = clients.find(c => 
        c.name?.toLowerCase().includes(searchName) || 
        searchName.includes(c.name?.toLowerCase())
      );
      
      if (target) {
        setSelectedClient(target);
        setClientDetailMode('edit');
        setCurrentPage('client-detail');
        return `🎯 **Direct Access**: Opening **${target.name}**'s profile in **Edit Mode**...`;
      }
      return `I couldn't find a client named "${searchName}". Please check the name and try again!`;
    }

    if ((cmd.includes('view') || cmd.includes('show') || cmd.includes('open')) && (cmd.includes('client') || cmd.includes('cust'))) {
       const searchName = cmd.replace(/view|show|open|client|cust/g, '').trim();
       if (searchName.length >= 2) {
         const target = clients.find(c => 
           c.name?.toLowerCase().includes(searchName) || 
           searchName.includes(c.name?.toLowerCase())
         );
         if (target) {
           setSelectedClient(target);
           setClientDetailMode('view');
           setCurrentPage('client-detail');
           return `🔍 **Profile Located**: Viewing **${target.name}**'s measurements and history.`;
         }
       }
    }

    // F. CURIOSITY & HELP
    if (cmd.includes('what can you do') || cmd.includes('help')) {
      return "I am your Digital Manager! I can:\n1. **Add records** (clients/orders)\n2. **Analyze business** (Admins only)\n3. **Monitor stock** (low inventory alerts)\n4. **Navigate** anywhere in the app\n\nJust talk to me like a human!";
    }

    // DEFAULT
    return "I'm not exactly sure how to do that yet, but I can help with clients, orders, inventory, or business reports!";
  };

  const handleSend = async () => {
    try {
      const currentInput = input.trim();
      if (!currentInput) return;
      
      setMessages(prev => [...prev, { role: 'user', content: currentInput }]);
      setInput('');
      setIsTyping(true);

      const response = await processCommand(currentInput.toLowerCase());
      if (response) {
        setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      }
      setIsTyping(false);
    } catch (err) {
      console.error("AI Fatal Error:", err);
      setIsTyping(false);
      setMessages(prev => [...prev, { role: 'assistant', content: "⚠️ Something went wrong. I've reset myself and I'm ready for your next command!" }]);
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-[2500]">
      {/* AI Bubble - Premium Luxury Design */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`group relative flex h-16 w-16 items-center justify-center rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] transition-all duration-500 hover:scale-110 active:scale-95 ${isOpen ? 'bg-stone-900 rotate-90' : 'bg-[var(--jewel)]'}`}
      >
        {isOpen ? (
          <X className="text-white" />
        ) : (
          <div className="relative">
            <Bot className="text-white group-hover:scale-110 transition-transform animate-pulse" size={28} />
            <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-white ring-4 ring-[var(--jewel)]" />
          </div>
        )}
      </button>

      {/* Chat Window - Premium Silk Finish */}
      {isOpen && (
        <div className="absolute bottom-24 right-0 w-[400px] max-w-[90vw] overflow-hidden rounded-[32px] border border-stone-200 bg-white shadow-[0_40px_120px_rgba(0,0,0,0.35)] transition-all animate-in slide-in-from-bottom-10 duration-500 flex flex-col ring-1 ring-black/10">
          {/* Header - Jewel Theme Color */}
          <div className="relative overflow-hidden bg-[var(--jewel)] p-7 text-white shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
            <div className="absolute top-0 right-0 -mr-4 -mt-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute bottom-0 left-0 -ml-4 -mb-4 h-16 w-16 rounded-full bg-black/10 blur-xl" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/20 backdrop-blur-md shadow-inner">
                  <Sparkles size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold tracking-tight drop-shadow-md">Classy AI</h3>
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-black py-1 px-2 bg-black/20 rounded-lg mt-0.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                    </span>
                    Digital Manager
                  </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="rounded-xl bg-black/10 p-2 hover:bg-black/20 transition">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages - Clean Boutique Style */}
          <div
            ref={scrollRef}
            className="flex-1 space-y-6 overflow-y-auto p-8 min-h-[350px] max-h-[200px] custom-scrollbar"
          >
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`relative max-w-[85%] px-5 py-4 text-sm shadow-sm transition-all ${m.role === 'user'
                    ? 'bg-[var(--accent)] text-white rounded-[24px] rounded-tr-none'
                    : 'bg-white/80 border border-stone-100 text-[var(--text)] rounded-[24px] rounded-tl-none'
                  }`}>
                  {m.content.split('\n').map((line, li) => (
                    <p key={li} className={li > 0 ? 'mt-2' : ''}>{li === 0 && m.role === 'assistant' ? <strong>{line}</strong> : line}</p>
                  ))}
                  {m.role === 'assistant' && (
                    <div className="absolute -left-2 top-0 h-4 w-4 bg-white/80 border-l border-t border-stone-100 transform -skew-x-[45deg]" />
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white/50 rounded-[24px] rounded-tl-none px-6 py-4 border border-stone-100 backdrop-blur-md shadow-sm">
                  <div className="flex gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-[var(--accent)] animate-bounce" />
                    <div className="h-2 w-2 rounded-full bg-[var(--accent)] animate-bounce [animation-delay:0.2s]" />
                    <div className="h-2 w-2 rounded-full bg-[var(--accent)] animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area - Integrated & Elegant */}
          <div className="border-t border-black/5 bg-stone-50/50 p-6 backdrop-blur-xl">
            <div className="mb-4 flex flex-wrap gap-2.5">
              {[
                { icon: UserPlus, label: 'New Client', text: 'Add client ' },
                { icon: Search, label: 'Analytics', text: 'Who is our top client?' },
                { icon: Package, label: 'Stock Check', text: 'Low stock items' }
              ].map((btn) => (
                <button
                  key={btn.label}
                  onClick={() => setInput(btn.text)}
                  className="flex items-center gap-2 rounded-xl bg-white border border-stone-200 px-4 py-2 text-[11px] font-bold text-stone-600 transition-all hover:border-[var(--accent)] hover:text-[var(--accent)] hover:shadow-lg active:scale-95"
                >
                  <btn.icon size={13} /> {btn.label}
                </button>
              ))}
            </div>
            <div className="relative group">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="How can I help you today?"
                className="w-full rounded-2xl border border-stone-200 bg-white py-4 pl-6 pr-14 text-sm shadow-sm transition-all focus:border-[var(--accent)] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[var(--accent-soft)]"
              />
              <button
                onClick={handleSend}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-xl bg-[var(--jewel)] p-2.5 text-white shadow-xl transition-all hover:scale-105 active:scale-90"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassyAI;
