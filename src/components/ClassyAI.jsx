import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Send, UserPlus, ShoppingBag, BarChart3, Search, MessageSquare, Mic, Sparkles, Package } from 'lucide-react';

const ClassyAI = ({ 
  user, 
  clients, 
  setClients, 
  saveClient, 
  orders, 
  setOrders, 
  saveOrder, 
  setCurrentPage, 
  showGlobalToast,
  activities,
  saveActivity,
  inventory = []
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

  const addActivity = (title, actor) => {
    const newAct = {
      id: Date.now(),
      title,
      timestamp: new Date().toISOString(),
      actor: actor || user?.name || 'System'
    };
    saveActivity(newAct);
  };

  // --- THE BRAIN ENGINE ---
  const processCommand = async (text) => {
    const cmd = text.toLowerCase();
    const isAdmin = user?.role === 'Admin';
    setIsTyping(true);
    await new Promise(r => setTimeout(r, 1000));

    // A. DATA ANALYSIS & INSIGHTS (Admin Only for sensitive totals)
    if (cmd.includes('best client') || cmd.includes('top client') || cmd.includes('valuable client')) {
      if (!isAdmin) {
        setMessages(prev => [...prev, { role: 'assistant', content: "🔒 **Access Restricted**: Detailed financial analysis of client spending is only available to Admins. I can help you find a client's contact info instead!" }]);
        addActivity(`Staff ${user?.name} attempted to access sensitive client analytics.`);
        setIsTyping(false);
        return;
      }
      const clientStats = {};
      orders.forEach(o => {
        const cid = o.clientId || o.client;
        if (cid) clientStats[cid] = (clientStats[cid] || 0) + (parseFloat(o.totalAmount) || 0);
      });
      const topClientId = Object.keys(clientStats).reduce((a, b) => clientStats[a] > clientStats[b] ? a : b, null);
      const topClient = clients.find(c => (c.clientId || c.id || c.phone) == topClientId);
      
      if (topClient) {
        setMessages(prev => [...prev, { role: 'assistant', content: `Based on order history, **${topClient.name}** is your most valuable client with a total spend of ₹${clientStats[topClientId].toLocaleString()}. Shall I open their profile?` }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: "I couldn't find enough order data to calculate that yet. Keep adding orders and I'll let you know!" }]);
      }
      setIsTyping(false);
      return;
    }

    if (cmd.includes('popular product') || cmd.includes('best selling')) {
      const prodStats = {};
      orders.forEach(o => {
        if (o.product) prodStats[o.product] = (prodStats[o.product] || 0) + 1;
      });
      const topProd = Object.keys(prodStats).reduce((a, b) => prodStats[a] > prodStats[b] ? a : b, null);
      
      if (topProd) {
        setMessages(prev => [...prev, { role: 'assistant', content: `Your most popular item right now is the **${topProd}**, appearing in ${prodStats[topProd]} orders.` }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: "I don't see any orders yet! Once you start selling, I'll track your top products." }]);
      }
      setIsTyping(false);
      return;
    }

    // B. DELETION & MODIFICATION (Admin Only)
    if (cmd.includes('delete order') || cmd.includes('delete client') || cmd.includes('remove')) {
      if (!isAdmin) {
        setMessages(prev => [...prev, { role: 'assistant', content: "🚫 **Permission Denied**: For security reasons, record deletion is restricted to Admins only. Please contact your manager for assistance." }]);
        addActivity(`Unauthorized: Staff ${user?.name} tried to delete a record via AI.`);
        setIsTyping(false);
        return;
      }
      const orderId = text.match(/\d+/);
      if (orderId) {
        setMessages(prev => [...prev, { role: 'assistant', content: `I've found record #${orderId[0]}. I've opened the correct page for you. Please confirm the deletion manually there.` }]);
        setCurrentPage(cmd.includes('client') ? 'view-clients' : 'view-orders');
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: "Which record would you like to remove? Please provide the ID." }]);
      }
      setIsTyping(false);
      return;
    }

    // C. MULTI-STEP CREATION (Allowed for all)
    if (cmd.includes('add client')) {
      const parts = text.split(' ');
      const nameIndex = parts.findIndex(p => p.toLowerCase() === 'client') + 1;
      const name = parts[nameIndex] || 'New Client';
      const phoneMatch = text.match(/\d{10}/);
      
      const newClient = {
        clientId: `CL-${Date.now()}`,
        name: name.charAt(0).toUpperCase() + name.slice(1),
        phone: phoneMatch ? phoneMatch[0] : '',
        createdAt: new Date().toISOString()
      };

      setClients(prev => [...prev, newClient]);
      await saveClient(newClient);
      addActivity(`AI created client: ${newClient.name} (by ${user?.name})`);
      
      setMessages(prev => [...prev, { role: 'assistant', content: `✅ **Success!** I've registered ${newClient.name}. I'm taking you to the Clients module now.` }]);
      setTimeout(() => { setCurrentPage('view-clients'); setIsOpen(false); }, 1500);
      setIsTyping(false);
      return;
    }

    // --- ADVANCED BUSINESS REASONING ---

    // A. Financial Intelligence
    if (cmd.includes('revenue') || cmd.includes('earned') || cmd.includes('money') || cmd.includes('made')) {
      if (!isAdmin) return "🔒 **Financial Access Restricted**: I can only share revenue data with the Boutique Admin.";
      const safeSales = Array.isArray(sales) ? sales : [];
      const total = safeSales.reduce((acc, s) => acc + (parseFloat(s.total || s.paidAmount || 0)), 0);
      const thisMonth = safeSales.filter(s => {
        const d = new Date(s.timestamp || s.date);
        return d.getMonth() === new Date().getMonth();
      });
      const monthTotal = thisMonth.reduce((acc, s) => acc + (parseFloat(s.total || s.paidAmount || 0)), 0);
      
      return `💸 **Financial Summary**:\n- **Total Life-time Revenue**: ₹${total.toLocaleString()}\n- **Revenue This Month**: ₹${monthTotal.toLocaleString()}\n- **Sales Count**: ${safeSales.length} transactions.\n\nWould you like me to open the full Reports page?`;
    }

    // B. VIP & Client Intelligence
    if (cmd.includes('valuable') || cmd.includes('top client') || cmd.includes('vip')) {
      const safeSales = Array.isArray(sales) ? sales : [];
      const safeClients = Array.isArray(clients) ? clients : [];
      const clientSpending = {};
      
      safeSales.forEach(s => {
        const cName = s.client?.name || s.clientName;
        if (cName) clientSpending[cName] = (clientSpending[cName] || 0) + (parseFloat(s.total || s.paidAmount || 0));
      });

      const topClient = Object.entries(clientSpending).sort((a,b) => b[1] - a[1])[0];
      
      if (!topClient) return "I don't have enough sales data yet to identify a VIP client. Keep those sales coming!";
      
      return `👑 **VIP Alert**: Your most valuable client is **${topClient[0]}**, with a total spend of **₹${topClient[1].toLocaleString()}**. They are truly a gem for the boutique!`;
    }

    // C. Measurement Retrieval
    if (cmd.includes('measure') || cmd.includes('profile')) {
      const name = text.replace(/.*measurements for |.*profile for |.*check /, '').trim();
      const client = clients.find(c => c.name.toLowerCase().includes(name.toLowerCase()));
      
      if (client && client.measurements) {
        return `📏 **Measurements for ${client.name}**:\n${JSON.stringify(client.measurements, null, 2)}\n\nI've found their profile! Should I open the Client Detail page for you?`;
      }
      if (client) {
        setCurrentPage('view-clients');
        return `I found **${client.name}**, but they don't have measurements saved yet. I've taken you to their list so you can add them.`;
      }
      return `I couldn't find a client named "${name}". Try just asking "Search for [Name]" first.`;
    }

    // D. Production & Inventory
    if (cmd.includes('status') || cmd.includes('production') || cmd.includes('how are we')) {
      const active = orders.filter(o => o.status !== 'Closed' && o.status !== 'Sold').length;
      const ready = orders.filter(o => o.status === 'Ready').length;
      const safeInventory = Array.isArray(inventory) ? inventory : [];
      const low = safeInventory.filter(i => (parseFloat(i.quantity) || 0) < 5).length;

      return `🏭 **Boutique Pulse**:\n- **Active Production**: ${active} orders in progress.\n- **Ready for Pickup**: ${ready} items waiting.\n- **Inventory Alert**: ${low} items are running low on stock.\n\nEverything looks ${active > 20 ? 'busy but productive' : 'smooth'}!`;
    }

    // E. Navigation & Safety
    if (cmd.includes('inventory') || cmd.includes('stock')) {
      setCurrentPage('view-inventory');
      const lowStock = (Array.isArray(inventory) ? inventory : []).filter(item => (parseFloat(item?.quantity) || 0) < 5).length;
      return `Opening Inventory. You have **${lowStock} items** running low. I'm here if you need to create a new stock entry!`;
    }

    if (cmd.includes('report') || cmd.includes('analytics')) {
      if (!isAdmin) return "🔒 **Access Denied**: Reports are restricted to Admins.";
      setCurrentPage('reports');
      return "Opening your Business Intelligence dashboard. Let's look at the numbers!";
    }

    // F. CURIOSITY & HELP
    if (cmd.includes('what can you do') || cmd.includes('help')) {
      setMessages(prev => [...prev, { role: 'assistant', content: "I am your Digital Manager! I can:\n1. **Add records** (clients/orders)\n2. **Analyze business** (Admins only)\n3. **Monitor stock** (low inventory alerts)\n4. **Navigate** anywhere in the app\n\nJust talk to me like a human!" }]);
      setIsTyping(false);
      return;
    }

    // DEFAULT
    setMessages(prev => [...prev, { role: 'assistant', content: "I'm not exactly sure how to do that yet, but I can help with clients, orders, inventory, or business reports!" }]);
    setIsTyping(false);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');
    processCommand(userMsg);
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
            className="flex-1 space-y-6 overflow-y-auto p-8 min-h-[350px] max-h-[500px] custom-scrollbar"
          >
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`relative max-w-[85%] px-5 py-4 text-sm shadow-sm transition-all ${
                  m.role === 'user' 
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
