import { Bell, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CircleDollarSign, ClipboardList, Crown, Gem, LayoutDashboard, LogOut, Menu, Moon, Package, Palette, Search, Settings, ShieldCheck, ShoppingBag, Sparkles, Sun, TrendingUp, UsersRound, Eye, Pencil, Trash2, Download, ShoppingCart, CheckCircle, Clock, Play, Pause, CheckCircle2, BarChart3, Image as ImageIcon, PenTool } from 'lucide-react'

export const formatDateDDMMYY = (dateInput) => {
  if (!dateInput) return ''
  const d = new Date(dateInput)
  if (isNaN(d.getTime())) return dateInput
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const year = d.getFullYear().toString().slice(-2)
  return `${day}/${month}/${year}`
}

export function getIndianDate() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);
  return istTime.toISOString().split('T')[0];
}

export const formatDateTimeDDMMYY = (dateInput) => {
  if (!dateInput) return ''
  const d = new Date(dateInput)
  if (isNaN(d.getTime())) return dateInput
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const year = d.getFullYear().toString().slice(-2)
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return `${day}/${month}/${year} ${time}`
}

export const boutiqueThemes = {
  champagne: {
    name: 'Champagne',
    accent: '#8e4431',
    accentSoft: '#ebd2c3',
    jewel: '#1b5e54',
    gold: '#b58739',
    hero: 'linear-gradient(135deg,#1f6f63 0%,#9b4d3a 52%,#171211 100%)',
  },
  emerald: {
    name: 'Emerald',
    accent: '#0d665f',
    accentSoft: '#cae6e1',
    jewel: '#7a4f26',
    gold: '#c29645',
    hero: 'linear-gradient(135deg,#0f3f39 0%,#0f766e 48%,#2b1810 100%)',
  },
  ruby: {
    name: 'Ruby',
    accent: '#8e1032',
    accentSoft: '#edc4cf',
    jewel: '#2f3846',
    gold: '#c7973d',
    hero: 'linear-gradient(135deg,#4a0f1e 0%,#9f1239 48%,#171211 100%)',
  },
}

export const appearanceTokens = {
  light: {
    appBg: '#faf8f5',
    pageBg: 'linear-gradient(145deg, #ffffff 0%, #f4ede6 100%)',
    surface: 'rgba(255,255,255,0.65)',
    surfaceStrong: 'rgba(255,255,255,0.95)',
    text: '#191514',
    muted: '#7d6e67',
    border: 'rgba(20, 15, 10, 0.08)',
    borderGlow: 'rgba(255,255,255,0.9)',
    soft: 'rgba(20, 15, 10, 0.03)',
    sidebar: '#0c0a09',
    sidebarText: '#eae2db',
    shadow: '0 24px 50px -12px rgba(30,20,15,0.08), 0 4px 16px rgba(30,20,15,0.03)',
  },
  dark: {
    appBg: '#090807',
    pageBg: 'radial-gradient(ellipse at top, #1a1513 0%, #090807 100%)',
    surface: 'rgba(30,24,22,0.4)',
    surfaceStrong: 'rgba(30,24,22,0.85)',
    text: '#fcfaf8',
    muted: '#a3948c',
    border: 'rgba(255,255,255,0.08)',
    borderGlow: 'rgba(255,255,255,0.05)',
    soft: 'rgba(255,255,255,0.03)',
    sidebar: '#030202',
    sidebarText: '#d8cfc9',
    shadow: '0 32px 64px -12px rgba(0,0,0,0.6), 0 8px 32px rgba(0,0,0,0.4)',
  },
}

export const navItems = [
  { label: 'Overview', icon: LayoutDashboard, id: 'overview' },
  {
    label: 'Clients',
    icon: UsersRound,
    id: 'clients',
    hasSubmenu: true,
    submenu: [
      { label: 'Add Clients', id: 'add-clients' },
      { label: 'View Clients', id: 'view-clients' }
    ]
  },
  {
    label: 'Orders',
    icon: ShoppingBag,
    id: 'orders',
    hasSubmenu: true,
    submenu: [
      { label: 'Add New Order', id: 'add-order' },
      { label: 'View Orders', id: 'view-orders' }
    ]
  },
  {
    label: 'Inventory',
    icon: Package,
    id: 'inventory',
    hasSubmenu: true,
    submenu: [
      { label: 'Create Inventory', id: 'create-inventory' },
      { label: 'View Inventory', id: 'view-inventory' }
    ]
  },
  {
    label: 'Sales',
    icon: TrendingUp,
    id: 'sales',
    hasSubmenu: true,
    submenu: [
      { label: 'Create Sales', id: 'create-sales' },
      { label: 'View Sales', id: 'view-sales' }
    ]
  },
  {
    label: 'Users',
    icon: ShieldCheck,
    id: 'users',
    hasSubmenu: true,
    submenu: [
      { label: 'Create User', id: 'create-user' },
      { label: 'View Users', id: 'view-users' }
    ]
  },
  {
    label: 'Account',
    icon: CircleDollarSign,
    id: 'account',
    hasSubmenu: true,
    submenu: [
      { label: 'Add Income', id: 'add-income' },
      { label: 'Add Expense', id: 'add-expense' },
      { label: 'Staff Payroll', id: 'staff-management' },
      { label: 'View Accounts', id: 'view-accounts' }
    ]
  },
  {
    label: 'Pattern Customisation',
    icon: Crown,
    id: 'pattern-customisation',
    hasSubmenu: true,
    submenu: [
      { label: 'Create Design', id: 'create-design' },
      { label: 'Library', id: 'design-library' }
    ]
  },
  { label: 'Reports', icon: BarChart3, id: 'reports' },
]

export const stats = [
  { label: 'Monthly revenue', value: '₹42,680', note: '+18.4% from April', icon: CircleDollarSign },
  { label: 'Active orders', value: '126', note: '34 ready for fitting', icon: ClipboardList },
  { label: 'VIP clients', value: '842', note: '21 new this week', icon: Crown },
  { label: 'Low stock items', value: '14', note: 'Silks and lace trims', icon: Package },
]

export const orders = [
  ['Anaya Rao', 'Bridal lehenga', 'Final fitting', '₹2,450'],
  ['Mira Patel', 'Evening gown', 'Pattern review', '₹980'],
  ['Sofia Khan', 'Silk saree blouse', 'Embroidery', '₹420'],
  ['Nora Shah', 'Reception dress', 'Ready pickup', '₹1,320'],
]

export const products = [
  ['Rose Silk Lehenga', '18 pieces', 'Best seller'],
  ['Ivory Bridal Gown', '7 pieces', 'Premium'],
  ['Emerald Saree Set', '22 pieces', 'New arrival'],
]

export const staffActivities = [
  ['10:00', 'Design review', 'Ayesha (Admin)'],
  ['12:30', 'Inventory audit', 'Meera (Manager)'],
  ['15:00', 'Client fitting', 'Zara (Staff)'],
]