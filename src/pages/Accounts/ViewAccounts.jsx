import React, { useState, useEffect, useMemo, useRef } from 'react'
import { ChevronLeft, ChevronRight, Search, CircleDollarSign, TrendingDown, Trash2, Plus, Wallet, TrendingUp, Lightbulb, Book, Filter, X, Save, Edit3, Download, Eye, Layers } from 'lucide-react'
import supabase from '../../supabase'
import { formatDateDDMMYY } from '../../utils/constants'
import html2pdf from 'html2pdf.js'
import CustomDatePicker from '../../components/CustomDatePicker'

function ViewAccountsPage({ themeStyle, setCurrentPage, showGlobalToast, currentUser, highlightAccountId, setHighlightAccountId, refreshAccounts }) {
  const rowRefs = useRef({})
  const tabsContainerRef = useRef(null)
  const [activeTab, setActiveTab] = useState('All') // 'All', 'Income', 'Expense', 'Cashbook'
  const [cashbookMode, setCashbookMode] = useState('All') // 'All' or 'Cash'
  const [accounts, setAccounts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPageNum, setCurrentPageNum] = useState(1)
  const [initialBalance, setInitialBalance] = useState(0)
  const [showBalanceModal, setShowBalanceModal] = useState(false)
  const [balanceInput, setBalanceInput] = useState('')
  const [initialBalanceDate, setInitialBalanceDate] = useState('')
  const [balanceDateInput, setBalanceDateInput] = useState('')
  const [isSavingBalance, setIsSavingBalance] = useState(false)
  const [deleteModalId, setDeleteModalId] = useState(null)
  const [showDeleteOpeningBalanceModal, setShowDeleteOpeningBalanceModal] = useState(false)
  const [editModalData, setEditModalData] = useState(null)
  const [viewModalData, setViewModalData] = useState(null)
  const [isUpdatingRecord, setIsUpdatingRecord] = useState(false)
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')
  const itemsPerPage = 10

  const fetchAccounts = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('erp_accounts')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error;
      setAccounts(data || [])

      // Fetch Initial Cash Balance
      const { data: configData } = await supabase.from('erp_config').select('data').eq('id', 'initialCashBalance').maybeSingle()
      if (configData && configData.data !== undefined) {
        setInitialBalance(parseFloat(configData.data) || 0)
      }
      const { data: dateData } = await supabase.from('erp_config').select('data').eq('id', 'initialCashBalanceDate').maybeSingle()
      if (dateData && dateData.data) {
        setInitialBalanceDate(dateData.data)
      }

    } catch (err) {
      console.error("Error fetching accounts:", err)
      if (showGlobalToast) showGlobalToast('Error', 'Failed to load accounts data.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  const handleDeleteClick = (id) => {
    if (currentUser?.role !== 'Admin') {
      if (showGlobalToast) showGlobalToast('Denied', 'Only Admins can delete records.');
      return;
    }
    setDeleteModalId(id);
  }

  const confirmDelete = async () => {
    if (!deleteModalId) return;
    try {
      const { error } = await supabase.from('erp_accounts').delete().eq('id', deleteModalId)
      if (error) throw error;
      
      setAccounts(prev => prev.filter(acc => acc.id !== deleteModalId))
      if (refreshAccounts) refreshAccounts();
      if (showGlobalToast) showGlobalToast('Success', 'Record deleted successfully.')
    } catch (err) {
      console.error("Error deleting account:", err)
      if (showGlobalToast) showGlobalToast('Error', 'Failed to delete record.')
    } finally {
      setDeleteModalId(null)
    }
  }

  const handleEditClick = (item) => {
    if (currentUser?.role !== 'Admin' && currentUser?.role !== 'Owner') {
      if (showGlobalToast) showGlobalToast('Denied', 'You do not have permission to edit records.');
      return;
    }
    setEditModalData({ ...item });
  }

  const updateRecord = async (e) => {
    e.preventDefault();
    if (!editModalData || isUpdatingRecord) return;

    if (!editModalData.amount || parseFloat(editModalData.amount) <= 0) {
      if (showGlobalToast) showGlobalToast('Invalid', 'Please enter a valid amount.');
      return;
    }

    setIsUpdatingRecord(true);
    try {
      const { id, type, date, category, amount, payment_mode, reference, notes } = editModalData;
      const { error } = await supabase.from('erp_accounts')
        .update({ type, date, category, amount: parseFloat(amount), payment_mode, reference, notes })
        .eq('id', id);

      if (error) throw error;

      setAccounts(prev => prev.map(acc => acc.id === id ? { ...acc, type, date, category, amount: parseFloat(amount), payment_mode, reference, notes } : acc));
      if (refreshAccounts) refreshAccounts();
      if (showGlobalToast) showGlobalToast('Success', 'Record updated successfully!');
      setEditModalData(null);
    } catch (err) {
      console.error("Error updating account:", err);
      if (showGlobalToast) showGlobalToast('Error', 'Failed to update record.');
    } finally {
      setIsUpdatingRecord(false);
    }
  }

  const filteredAccounts = useMemo(() => {
    if (activeTab === 'Cashbook') return []; // Handled separately
    return accounts.filter(acc => {
      if (activeTab !== 'All' && acc.type !== activeTab) return false;
      
      // Date filtering
      if (filterStartDate && acc.date < filterStartDate) return false;
      if (filterEndDate && acc.date > filterEndDate) return false;

      const query = searchQuery.toLowerCase();
      const matchCat = (acc.category || '').toLowerCase().includes(query)
      const matchRef = (acc.reference || '').toLowerCase().includes(query)
      const matchNote = (acc.notes || '').toLowerCase().includes(query)
      return matchCat || matchRef || matchNote
    })
  }, [accounts, activeTab, searchQuery, filterStartDate, filterEndDate])

  const cashbookData = useMemo(() => {
    const filteredForCashbook = cashbookMode === 'Cash' 
      ? accounts.filter(acc => acc.payment_mode?.toLowerCase() === 'cash')
      : accounts;

    const grouped = {};
    filteredForCashbook.forEach(acc => {
      const date = acc.date;
      if (!grouped[date]) {
        grouped[date] = { date, income: 0, expense: 0 };
      }
      const amt = parseFloat(acc.amount || 0);
      if (acc.type === 'Income') grouped[date].income += amt;
      else if (acc.type === 'Expense') grouped[date].expense += amt;
    });

    const sortedDates = Object.keys(grouped).sort();
    
    let currentBalance = initialBalance;
    const finalData = [];

    sortedDates.forEach(date => {
      const day = grouped[date];
      const opening = currentBalance;
      const closing = opening + day.income - day.expense;
      
      finalData.push({
        date: date,
        opening: opening,
        income: day.income,
        expense: day.expense,
        closing: closing
      });

      currentBalance = closing;
    });

    // Sort descending for viewing (newest first)
    const reversed = finalData.reverse();

    let finalCashbook = reversed;

    // Apply date filters AFTER calculating all running balances so starting balances are accurate
    if (filterStartDate) finalCashbook = finalCashbook.filter(item => item.date >= filterStartDate);
    if (filterEndDate) finalCashbook = finalCashbook.filter(item => item.date <= filterEndDate);

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return finalCashbook.filter(item => formatDateDDMMYY(item.date).toLowerCase().includes(query));
    }
    return finalCashbook;
  }, [accounts, cashbookMode, searchQuery, initialBalance, filterStartDate, filterEndDate]);

  const { totalIncome, totalExpense } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    accounts.forEach(acc => {
      if (acc.type === 'Income') inc += parseFloat(acc.amount || 0);
      else if (acc.type === 'Expense') exp += parseFloat(acc.amount || 0);
    });
    return { totalIncome: inc, totalExpense: exp };
  }, [accounts]);

  const netBalance = totalIncome - totalExpense;
  const sortedAccounts = useMemo(() => {
    return [...filteredAccounts].sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [filteredAccounts])

  useEffect(() => {
    if (highlightAccountId) {
      setTimeout(() => {
        const row = rowRefs.current[highlightAccountId];
        if (row) {
          row.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => {
            if (setHighlightAccountId) setHighlightAccountId(null);
          }, 3000);
        }
      }, 300);
    }
  }, [highlightAccountId, setHighlightAccountId]);

  const balancePercentage = totalIncome > 0 ? Math.min(100, Math.round((netBalance / totalIncome) * 100)) : 0;

  const currentListLength = activeTab === 'Cashbook' ? cashbookData.length : filteredAccounts.length;
  const totalPages = Math.max(1, Math.ceil(currentListLength / itemsPerPage))
  
  const paginatedAccounts = filteredAccounts.slice((currentPageNum - 1) * itemsPerPage, currentPageNum * itemsPerPage)
  const paginatedCashbook = cashbookData.slice((currentPageNum - 1) * itemsPerPage, currentPageNum * itemsPerPage)

  const handleTabChange = (tab, e) => {
    setActiveTab(tab)
    setCurrentPageNum(1)
    setSearchQuery('')
    
    // Auto-scroll the tab container so the clicked tab is fully visible horizontally
    if (tabsContainerRef.current && e && e.currentTarget) {
      const container = tabsContainerRef.current;
      const button = e.currentTarget;
      const scrollLeft = button.offsetLeft - (container.offsetWidth / 2) + (button.offsetWidth / 2);
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
    
    // Auto-scroll to the table area so it's fully visible
    setTimeout(() => {
      const el = document.getElementById('accounts-table-container');
      if (el) {
        const topOffset = el.getBoundingClientRect().top + window.scrollY - 100; // 100px padding from top
        window.scrollTo({ top: topOffset, behavior: 'smooth' });
      }
    }, 100);
  }

  const exportToPDF = () => {
    const element = document.getElementById('accounts-table-container');
    if (!element) return;
    const opt = {
      margin:       0.5,
      filename:     `Accounts_${activeTab}_${new Date().getTime()}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'landscape' }
    };
    html2pdf().set(opt).from(element).save();
  }

  const handleSetInitialBalance = () => {
    setBalanceInput(initialBalance.toString())
    setBalanceDateInput(initialBalanceDate || new Date().toISOString().split('T')[0])
    setShowBalanceModal(true)
  }

  const saveInitialBalance = async () => {
    const parsed = parseFloat(balanceInput)
    if (isNaN(parsed)) return;

    setIsSavingBalance(true)
    try {
      await supabase.from('erp_config').upsert([{ id: 'initialCashBalance', data: parsed }]);
      if (balanceDateInput) {
        await supabase.from('erp_config').upsert([{ id: 'initialCashBalanceDate', data: balanceDateInput }]);
      } else {
        await supabase.from('erp_config').delete().eq('id', 'initialCashBalanceDate');
      }
      setInitialBalance(parsed);
      setInitialBalanceDate(balanceDateInput);
      setShowBalanceModal(false);
      if (showGlobalToast) showGlobalToast('Success', 'Opening balance updated!');
    } catch (err) {
      console.error("Failed to save initial balance", err);
      if (showGlobalToast) showGlobalToast('Error', 'Failed to update balance.');
    } finally {
      setIsSavingBalance(false)
    }
  }

  const deleteInitialBalance = async () => {
    try {
      await supabase.from('erp_config').delete().in('id', ['initialCashBalance', 'initialCashBalanceDate']);
      setInitialBalance(0);
      setInitialBalanceDate('');
      setShowDeleteOpeningBalanceModal(false);
      if (showGlobalToast) showGlobalToast('Success', 'Opening balance removed!');
    } catch (err) {
      console.error("Failed to delete initial balance", err);
      if (showGlobalToast) showGlobalToast('Error', 'Failed to remove balance.');
    }
  }

  return (
    <div style={themeStyle} className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-h1">Account Ledger</h1>
          <p className="text-para text-[var(--muted)] mt-1">View and manage income and expenses</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            className="flex items-center gap-2 rounded-xl bg-[var(--surface-strong)] border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--soft)]"
            onClick={() => setCurrentPage('add-income')}
          >
            <CircleDollarSign size={16} className="text-green-500"/> Add Income
          </button>
          <button 
            className="flex items-center gap-2 rounded-xl bg-[var(--surface-strong)] border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--soft)]"
            onClick={() => setCurrentPage('add-expense')}
          >
            <TrendingDown size={16} className="text-red-500"/> Add Expense
          </button>
        </div>
      </div>

      {/* Financial Dashboard Widget */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] backdrop-blur relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 rounded-full bg-green-500/10 p-8 transition-transform group-hover:scale-110">
            <TrendingUp size={48} className="text-green-500/20" />
          </div>
          <p className="text-sm font-medium text-[var(--muted)] flex items-center gap-2 mb-1"><CircleDollarSign size={16} className="text-green-500" /> Total Income</p>
          <p className="text-2xl font-bold text-[var(--text)]">₹{totalIncome.toLocaleString()}</p>
        </div>
        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] backdrop-blur relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 rounded-full bg-red-500/10 p-8 transition-transform group-hover:scale-110">
            <TrendingDown size={48} className="text-red-500/20" />
          </div>
          <p className="text-sm font-medium text-[var(--muted)] flex items-center gap-2 mb-1"><TrendingDown size={16} className="text-red-500" /> Total Expense</p>
          <p className="text-2xl font-bold text-[var(--text)]">₹{totalExpense.toLocaleString()}</p>
        </div>
        <div className={`rounded-[24px] border border-[var(--border)] p-5 shadow-[var(--shadow)] backdrop-blur relative overflow-hidden group ${netBalance >= 0 ? 'bg-[var(--accent)] text-white' : 'bg-red-600 text-white'}`}>
          <div className="absolute -right-6 -top-6 rounded-full bg-white/10 p-8 transition-transform group-hover:scale-110">
            <Wallet size={48} className="text-white/20" />
          </div>
          <p className="text-sm font-medium text-white/80 flex items-center gap-2 mb-1"><Wallet size={16} /> Net Balance</p>
          <p className="text-2xl font-bold">₹{Math.abs(netBalance).toLocaleString()}</p>
        </div>
      </div>

      {/* Business Insights Widget */}
      <div className="rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-4 flex gap-4 items-start">
        <div className="rounded-full bg-[var(--accent)]/20 p-2 shrink-0">
          <Lightbulb size={20} className="text-[var(--accent)]" />
        </div>
        <div>
          <h4 className="font-semibold text-[var(--text)]">AI Business Insight</h4>
          <p className="text-sm text-[var(--muted)] mt-1">
            {totalIncome === 0 && totalExpense === 0 ? "You haven't recorded any transactions yet. Start adding income and expenses to see insights here." : 
             netBalance > 0 ? `Great job! Your income exceeds your expenses by ₹${netBalance.toLocaleString()}. You are operating at a healthy ${balancePercentage}% profit margin relative to gross income. Consider reinvesting a portion of this into new inventory to boost future sales.` :
             netBalance < 0 ? `Warning: Your expenses exceed your income by ₹${Math.abs(netBalance).toLocaleString()}. Review your material costs and overheads, or consider running a promotional sale to boost incoming revenue quickly.` :
             "Your income exactly matches your expenses. You are breaking even. Try to identify areas where you can reduce costs or increase sales volume."}
          </p>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col xl:flex-row items-center justify-between gap-4">
        <div ref={tabsContainerRef} className="flex p-1 space-x-1 bg-[var(--surface-strong)] rounded-xl border border-[var(--border)] w-full overflow-x-auto whitespace-nowrap [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <button
            title="All"
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all duration-300 overflow-hidden ${activeTab === 'All' ? 'flex-1 bg-[var(--surface)] text-[var(--text)] shadow-sm px-6' : 'w-12 sm:w-16 text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--soft)]'}`}
            onClick={(e) => handleTabChange('All', e)}
          >
            <Layers size={18} className="shrink-0" /> 
            {activeTab === 'All' && <span className="whitespace-nowrap animate-in fade-in duration-300">All</span>}
          </button>
          <button
            title="Income"
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all duration-300 overflow-hidden ${activeTab === 'Income' ? 'flex-1 bg-[var(--surface)] text-green-500 shadow-sm px-6' : 'w-12 sm:w-16 text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--soft)]'}`}
            onClick={(e) => handleTabChange('Income', e)}
          >
            <CircleDollarSign size={18} className="shrink-0" /> 
            {activeTab === 'Income' && <span className="whitespace-nowrap animate-in fade-in duration-300">Income</span>}
          </button>
          <button
            title="Expense"
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all duration-300 overflow-hidden ${activeTab === 'Expense' ? 'flex-1 bg-[var(--surface)] text-red-500 shadow-sm px-6' : 'w-12 sm:w-16 text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--soft)]'}`}
            onClick={(e) => handleTabChange('Expense', e)}
          >
            <TrendingDown size={18} className="shrink-0" /> 
            {activeTab === 'Expense' && <span className="whitespace-nowrap animate-in fade-in duration-300">Expense</span>}
          </button>
          <button
            title="Cashbook"
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all duration-300 overflow-hidden ${activeTab === 'Cashbook' ? 'flex-1 bg-[var(--accent)] text-white shadow-sm px-6' : 'w-12 sm:w-16 text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--soft)]'}`}
            onClick={(e) => handleTabChange('Cashbook', e)}
          >
            <Book size={18} className="shrink-0" /> 
            {activeTab === 'Cashbook' && <span className="whitespace-nowrap animate-in fade-in duration-300">Cashbook</span>}
          </button>
        </div>

        <div className="flex flex-wrap xl:flex-nowrap items-center gap-4 w-full xl:w-auto shrink-0">
          {activeTab === 'Cashbook' && (
            <div className="flex items-center gap-2 bg-[var(--surface-strong)] rounded-xl border border-[var(--border)] px-3 py-2 text-sm">
              <Filter size={16} className="text-[var(--muted)]" />
                <select 
                  className="bg-transparent outline-none text-[var(--text)] font-medium cursor-pointer"
                  value={cashbookMode}
                  onChange={(e) => {
                    setCashbookMode(e.target.value)
                    setCurrentPageNum(1)
                  }}
                >
                  <option value="All">All Modes</option>
                  <option value="Cash">Cash Only</option>
                </select>
              </div>
          )}

          <div className="relative w-full sm:w-auto shrink-0 flex flex-wrap sm:flex-nowrap items-center gap-2">
            <input 
              type="date"
              value={filterStartDate}
              onChange={(e) => { setFilterStartDate(e.target.value); setCurrentPageNum(1); }}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm outline-none transition focus:border-[var(--accent)] text-[var(--text)]"
              title="Start Date"
            />
            <span className="text-[var(--muted)]">to</span>
            <input 
              type="date"
              value={filterEndDate}
              onChange={(e) => { setFilterEndDate(e.target.value); setCurrentPageNum(1); }}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm outline-none transition focus:border-[var(--accent)] text-[var(--text)]"
              title="End Date"
            />
          </div>

          <div className="relative w-full sm:w-48 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={18} />
            <input
              type="text"
              placeholder={`Search...`}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPageNum(1)
              }}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10"
            />
          </div>

          <button
            onClick={exportToPDF}
            className="flex items-center gap-2 rounded-xl bg-[var(--surface-strong)] border border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] hover:border-[var(--accent)] whitespace-nowrap shadow-sm"
          >
            <Download size={16} /> <span className="hidden sm:inline">Download</span> PDF
          </button>
        </div>
      </div>

      {/* Cashbook Initial Balance Card */}
      {activeTab === 'Cashbook' && (
        <div className="rounded-[24px] border border-[var(--accent)]/30 bg-[var(--surface)] p-5 shadow-[var(--shadow)] backdrop-blur flex items-center justify-between relative overflow-hidden group">
          <div className="absolute -left-6 -bottom-6 rounded-full bg-[var(--accent)]/5 p-12 transition-transform group-hover:scale-110"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="rounded-full bg-[var(--accent)]/10 p-4 text-[var(--accent)]">
              <Wallet size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--muted)]">Opening Balance</p>
              <p className="text-2xl font-black text-[var(--text)] tracking-tight">
                ₹{initialBalance.toLocaleString()}
                {initialBalanceDate && <span className="ml-2 text-xs font-semibold text-[var(--muted)]">as of {new Date(initialBalanceDate).toLocaleDateString()}</span>}
              </p>
            </div>
          </div>
          <div className="relative z-10 flex items-center gap-2">
            <button
              onClick={handleSetInitialBalance}
              className="flex items-center gap-2 rounded-xl bg-[var(--surface-strong)] border border-[var(--border)] px-5 py-2.5 text-sm font-bold text-[var(--text)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] hover:border-[var(--accent)] active:scale-95 shadow-sm"
            >
              <Edit3 size={16} /> Edit Balance
            </button>
            {initialBalance > 0 && (
              <button
                onClick={() => setShowDeleteOpeningBalanceModal(true)}
                className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2.5 text-sm font-bold text-red-500 transition hover:bg-red-500/20 active:scale-95 shadow-sm"
                title="Remove Opening Balance"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table Section */}
      <div id="accounts-table-container" className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-2 sm:p-4 shadow-[var(--shadow)] backdrop-blur">
        <div className="mb-4 hidden print:block text-xl font-bold text-center">Accounts Report - {activeTab}</div>
        <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface-strong)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--soft)] text-[var(--muted)]">
              {activeTab === 'Cashbook' ? (
                <tr>
                  <th className="p-4 font-semibold">Date</th>
                  <th className="p-4 font-semibold text-right">Opening Balance</th>
                  <th className="p-4 font-semibold text-right text-green-600">Total In</th>
                  <th className="p-4 font-semibold text-right text-red-600">Total Out</th>
                  <th className="p-4 font-semibold text-right text-[var(--accent)]">Closing Balance</th>
                </tr>
              ) : (
                <tr>
                  <th className="p-4 font-semibold">Date</th>
                  <th className="p-4 font-semibold">Type</th>
                  <th className="p-4 font-semibold">Category</th>
                  <th className="p-4 font-semibold hidden md:table-cell">Reference</th>
                  <th className="p-4 font-semibold hidden sm:table-cell">Mode</th>
                  <th className="p-4 font-semibold text-right">Amount</th>
                  <th className="p-4 font-semibold text-center">Action</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-[var(--muted)]">Loading accounts data...</td>
                </tr>
              ) : activeTab === 'Cashbook' ? (
                paginatedCashbook.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-[var(--muted)]">
                      No cashbook records found.
                    </td>
                  </tr>
                ) : (
                  paginatedCashbook.map((item, idx) => (
                    <tr key={item.date} className="transition hover:bg-[var(--soft)]">
                      <td className="p-4 whitespace-nowrap font-medium text-[var(--text)]">{formatDateDDMMYY(item.date)}</td>
                      <td className="p-4 text-right font-medium">₹{item.opening.toLocaleString()}</td>
                      <td className="p-4 text-right font-semibold text-green-600">
                        {item.income > 0 ? `+ ₹${item.income.toLocaleString()}` : '-'}
                      </td>
                      <td className="p-4 text-right font-semibold text-red-600">
                        {item.expense > 0 ? `- ₹${item.expense.toLocaleString()}` : '-'}
                      </td>
                      <td className="p-4 text-right font-bold text-[var(--accent)]">₹{item.closing.toLocaleString()}</td>
                    </tr>
                  ))
                )
              ) : (
                paginatedAccounts.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-[var(--muted)]">
                      No {activeTab.toLowerCase()} records found.
                    </td>
                  </tr>
                ) : (
                  paginatedAccounts.map((item) => (
                    <tr 
                      key={item.id} 
                      ref={el => rowRefs.current[item.id] = el}
                      className={`transition-all duration-1000 group ${highlightAccountId === item.id ? 'bg-[var(--accent-soft)]/50 ring-2 ring-[var(--accent)] ring-inset' : 'hover:bg-[var(--soft)]'}`}
                    >
                      <td className="p-4 whitespace-nowrap">{formatDateDDMMYY(item.date)}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-bold ${item.type === 'Income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {item.type}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center rounded-md bg-[var(--accent-soft)] px-2 py-1 text-xs font-medium text-[var(--accent)]">
                          {item.category}
                        </span>
                      </td>
                      <td className="p-4 text-[var(--muted)] max-w-xs truncate hidden md:table-cell" title={item.reference || item.notes}>
                        {item.reference || '-'}
                      </td>
                      <td className="p-4 text-[var(--text)] hidden sm:table-cell">{item.payment_mode}</td>
                      <td className={`p-4 text-right font-bold whitespace-nowrap ${item.type === 'Income' ? 'text-green-600' : 'text-red-600'}`}>
                        {item.type === 'Income' ? '+' : '-'} ₹{parseFloat(item.amount).toLocaleString()}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            className="rounded-lg p-2 text-[var(--muted)] transition hover:bg-[var(--surface-strong)] hover:text-[var(--text)]"
                            title="View Record"
                            onClick={() => setViewModalData(item)}
                          >
                            <Eye size={18} />
                          </button>
                          {!(item.reference?.startsWith('Sale #') || item.reference?.startsWith('Inventory #') || item.reference?.startsWith('Order Advance #')) && (
                            <button
                              className="rounded-lg p-2 text-[var(--muted)] transition hover:bg-[var(--accent)]/10 hover:text-[var(--accent)]"
                              title="Edit Record"
                              onClick={() => handleEditClick(item)}
                            >
                              <Edit3 size={18} />
                            </button>
                          )}
                          <button
                            className="rounded-lg p-2 text-[var(--muted)] transition hover:bg-red-500/10 hover:text-red-500"
                            title="Delete Record"
                            onClick={() => handleDeleteClick(item.id)}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {currentListLength > 0 && (
          <div className="mt-4 flex items-center justify-between px-2">
            <span className="text-sm text-[var(--muted)]">
              Showing {(currentPageNum - 1) * itemsPerPage + 1} to {Math.min(currentPageNum * itemsPerPage, currentListLength)} of {currentListLength}
            </span>
            <div className="flex gap-2">
              <button
                className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] text-[var(--muted)] transition hover:bg-[var(--soft)] hover:text-[var(--text)] disabled:opacity-50 disabled:hover:bg-[var(--surface-strong)] disabled:hover:text-[var(--muted)]"
                disabled={currentPageNum === 1}
                onClick={() => setCurrentPageNum(p => Math.max(1, p - 1))}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] text-[var(--muted)] transition hover:bg-[var(--soft)] hover:text-[var(--text)] disabled:opacity-50 disabled:hover:bg-[var(--surface-strong)] disabled:hover:text-[var(--muted)]"
                disabled={currentPageNum === totalPages}
                onClick={() => setCurrentPageNum(p => Math.min(totalPages, p + 1))}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Custom Theme-Based Balance Modal */}
      {showBalanceModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowBalanceModal(false)} />
          <div className="relative w-full max-w-sm rounded-[24px] border border-[var(--border)] bg-[var(--surface-strong)] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
                <Wallet size={20} className="text-[var(--accent)]" /> Opening Balance
              </h3>
              <button 
                onClick={() => setShowBalanceModal(false)}
                className="rounded-full p-2 text-[var(--muted)] hover:bg-[var(--soft)] hover:text-[var(--text)] transition"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[var(--muted)]">Opening Balance (₹)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-[var(--muted)]">₹</span>
                  <input
                    type="number"
                    value={balanceInput}
                    onChange={(e) => setBalanceInput(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-3 pl-8 pr-4 font-bold outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10"
                    placeholder="e.g. 5000"
                    autoFocus
                  />
                </div>
                <p className="mt-2 text-xs text-[var(--muted)]">This sets the baseline for your cashbook before any transactions are added.</p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[var(--muted)]">As of Date (Optional)</label>
                <div className="relative z-50">
                  <CustomDatePicker
                    value={balanceDateInput}
                    onChange={(date) => setBalanceDateInput(date)}
                    placeholder="Select Date"
                    maxDate={new Date().toISOString().split('T')[0]}
                    position="top"
                  />
                </div>
              </div>

              <button
                onClick={saveInitialBalance}
                disabled={isSavingBalance}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-3 text-sm font-bold text-white shadow-lg shadow-[var(--accent)]/20 transition hover:opacity-90 active:scale-95 disabled:opacity-50"
              >
                {isSavingBalance ? 'Saving...' : (
                  <>
                    <Save size={16} /> Save Balance
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal for Records */}
      {deleteModalId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteModalId(null)} />
          <div className="relative w-full max-w-sm rounded-[24px] border border-[var(--border)] bg-[var(--surface-strong)] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                <Trash2 size={32} />
              </div>
              <h3 className="mb-2 text-xl font-bold text-[var(--text)]">Delete Record</h3>
              <p className="mb-6 text-sm text-[var(--muted)]">
                Are you sure you want to delete this record? This action cannot be undone.
              </p>
              <div className="flex w-full gap-3">
                <button
                  className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] py-3 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--soft)]"
                  onClick={() => setDeleteModalId(null)}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-bold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700 active:scale-95"
                  onClick={confirmDelete}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal for Opening Balance */}
      {showDeleteOpeningBalanceModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDeleteOpeningBalanceModal(false)} />
          <div className="relative w-full max-w-sm rounded-[24px] border border-[var(--border)] bg-[var(--surface-strong)] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                <Trash2 size={32} />
              </div>
              <h3 className="mb-2 text-xl font-bold text-[var(--text)]">Remove Opening Balance</h3>
              <p className="mb-6 text-sm text-[var(--muted)]">
                Are you sure you want to remove the Opening Balance? This will reset the cashbook starting point to ₹0.
              </p>
              <div className="flex w-full gap-3">
                <button
                  className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] py-3 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--soft)]"
                  onClick={() => setShowDeleteOpeningBalanceModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-bold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700 active:scale-95"
                  onClick={deleteInitialBalance}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View & Edit Record Modal */}
      {editModalData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditModalData(null)} />
          <div className="relative w-full max-w-lg rounded-[24px] border border-[var(--border)] bg-[var(--surface-strong)] p-6 shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
                <Edit3 size={20} className="text-[var(--accent)]" /> View & Edit Record
              </h3>
              <button 
                onClick={() => setEditModalData(null)}
                className="rounded-full p-2 text-[var(--muted)] hover:bg-[var(--soft)] hover:text-[var(--text)] transition"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={updateRecord} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[var(--muted)]">Type</label>
                  <select 
                    value={editModalData.type}
                    onChange={(e) => setEditModalData({...editModalData, type: e.target.value})}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 outline-none transition focus:border-[var(--accent)] text-[var(--text)] font-medium"
                  >
                    <option value="Income">Income</option>
                    <option value="Expense">Expense</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[var(--muted)]">Date</label>
                  <input 
                    type="date"
                    value={editModalData.date}
                    onChange={(e) => setEditModalData({...editModalData, date: e.target.value})}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 outline-none transition focus:border-[var(--accent)] text-[var(--text)] font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[var(--muted)]">Category</label>
                  <input 
                    type="text"
                    value={editModalData.category}
                    onChange={(e) => setEditModalData({...editModalData, category: e.target.value})}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 outline-none transition focus:border-[var(--accent)] text-[var(--text)] font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[var(--muted)]">Amount (₹)</label>
                  <input 
                    type="number"
                    value={editModalData.amount}
                    onChange={(e) => setEditModalData({...editModalData, amount: e.target.value})}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 outline-none transition focus:border-[var(--accent)] text-[var(--text)] font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[var(--muted)]">Payment Mode</label>
                  <select 
                    value={editModalData.payment_mode}
                    onChange={(e) => setEditModalData({...editModalData, payment_mode: e.target.value})}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 outline-none transition focus:border-[var(--accent)] text-[var(--text)] font-medium"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[var(--muted)]">Reference / Link</label>
                  <input 
                    type="text"
                    value={editModalData.reference || ''}
                    onChange={(e) => setEditModalData({...editModalData, reference: e.target.value})}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 outline-none transition focus:border-[var(--accent)] text-[var(--text)]"
                    placeholder="e.g. Sale #123"
                  />
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-sm font-semibold text-[var(--muted)]">Notes</label>
                  <textarea 
                    value={editModalData.notes || ''}
                    onChange={(e) => setEditModalData({...editModalData, notes: e.target.value})}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 outline-none transition focus:border-[var(--accent)] text-[var(--text)] resize-none"
                    rows="3"
                    placeholder="Additional details..."
                  ></textarea>
                </div>
              </div>

              <div className="pt-4 mt-2 border-t border-[var(--border)] flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setEditModalData(null)}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--soft)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingRecord}
                  className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-[var(--accent)]/20 transition hover:opacity-90 active:scale-95 disabled:opacity-50"
                >
                  {isUpdatingRecord ? 'Saving...' : (
                    <>
                      <Save size={16} /> Update Record
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Record Read-Only Modal */}
      {viewModalData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setViewModalData(null)} />
          <div className="relative w-full max-w-lg rounded-[24px] border border-[var(--border)] bg-[var(--surface-strong)] p-6 shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
                <Eye size={20} className="text-[var(--accent)]" /> Record Details
              </h3>
              <button 
                onClick={() => setViewModalData(null)}
                className="rounded-full p-2 text-[var(--muted)] hover:bg-[var(--soft)] hover:text-[var(--text)] transition"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[var(--muted)]">Type</label>
                  <p className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)] font-bold">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ${viewModalData.type === 'Income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {viewModalData.type}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[var(--muted)]">Date</label>
                  <p className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)] font-medium">
                    {formatDateDDMMYY(viewModalData.date)}
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[var(--muted)]">Category</label>
                  <p className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)] font-medium">
                    <span className="inline-flex items-center rounded-md bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-medium text-[var(--accent)]">
                      {viewModalData.category}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[var(--muted)]">Amount (₹)</label>
                  <p className={`w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 font-black ${viewModalData.type === 'Income' ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{parseFloat(viewModalData.amount).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[var(--muted)]">Payment Mode</label>
                  <p className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)] font-medium">
                    {viewModalData.payment_mode}
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[var(--muted)]">Reference / Link</label>
                  <p className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)] font-medium">
                    {viewModalData.reference || '-'}
                  </p>
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-sm font-semibold text-[var(--muted)]">Notes</label>
                  <div className="w-full min-h-[80px] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)] whitespace-pre-wrap">
                    {viewModalData.notes || '-'}
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-2 border-t border-[var(--border)] flex justify-end">
                <button
                  onClick={() => setViewModalData(null)}
                  className="rounded-xl bg-[var(--accent)] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-[var(--accent)]/20 transition hover:opacity-90 active:scale-95"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ViewAccountsPage;
