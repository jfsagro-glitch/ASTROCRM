/**
 * CRM.tsx — adapted from jfsagro-glitch/ASTROCRM
 * Changes: added natal chart quick-view button, birth coords fields,
 *          links to ClientPortal with pre-filled birth data.
 */
import React, { useState, useEffect } from 'react';
import { auth, db, loginWithGoogle, logout, firebaseConfigured } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  collection, query, where, onSnapshot, addDoc, serverTimestamp,
  Timestamp, doc, orderBy, deleteDoc, updateDoc,
} from 'firebase/firestore';
import {
  LogOut, Users, Calendar as CalendarIcon, Plus, UserPlus,
  FileText, Clock, CheckCircle, XCircle, Download, Search,
  Trash2, Edit2, TrendingUp, Star, ExternalLink,
} from 'lucide-react';
import { format } from 'date-fns';
import { downloadPDF } from '../lib/pdfUtils';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Link, useNavigate } from 'react-router-dom';
import { useLang } from '../i18n/LanguageContext';

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

// ─── Types ────────────────────────────────────────────────────────────────────
interface Client {
  id: string; name: string; email?: string; phone?: string;
  notes?: string; birthDate?: string; birthTime?: string;
  birthLocation?: string; birthLat?: number; birthLon?: number;
  birthUtc?: number; tags?: string[]; authorUid: string;
  createdAt: Timestamp;
}

interface Consultation {
  id: string; clientId: string; date: Timestamp; notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  type?: string; price?: number; paymentStatus?: 'pending' | 'paid' | 'refunded';
  authorUid: string; createdAt: Timestamp;
}

// ─── Error handler ────────────────────────────────────────────────────────────
function handleError(err: unknown, op: string) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`[CRM ${op}]`, msg);
  throw new Error(msg);
}

// ─── Add Client Modal ─────────────────────────────────────────────────────────
function AddClientModal({
  onClose, onSave, user,
}: { onClose: () => void; onSave: (data: Omit<Client, 'id'|'authorUid'|'createdAt'>) => void; user: User }) {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', notes: '',
    birthDate: '', birthTime: '', birthLocation: '',
    birthLat: '', birthLon: '', birthUtc: '',
    tags: '',
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: form.name, email: form.email || undefined, phone: form.phone || undefined,
      notes: form.notes || undefined, birthDate: form.birthDate || undefined,
      birthTime: form.birthTime || undefined, birthLocation: form.birthLocation || undefined,
      birthLat: form.birthLat ? parseFloat(form.birthLat) : undefined,
      birthLon: form.birthLon ? parseFloat(form.birthLon) : undefined,
      birthUtc: form.birthUtc ? parseFloat(form.birthUtc) : undefined,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
    });
  };

  const inp = (label: string, field: keyof typeof form, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} placeholder={placeholder} value={form[field]} onChange={set(field)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
    </div>
  );

  return (
    <div className="fixed z-10 inset-0 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="fixed inset-0 bg-gray-500/75" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6 z-10">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Client</h3>
          <form onSubmit={submit} className="space-y-3">
            {inp('Full Name *', 'name')}
            <div className="grid grid-cols-2 gap-3">
              {inp('Email', 'email', 'email')}
              {inp('Phone', 'phone', 'tel')}
            </div>
            <div className="border-t pt-3">
              <p className="text-xs font-medium text-indigo-600 mb-2">Birth Data</p>
              <div className="grid grid-cols-2 gap-3">
                {inp('Date (YYYY-MM-DD)', 'birthDate')}
                {inp('Time (HH:MM)', 'birthTime')}
                {inp('Location (city)', 'birthLocation')}
                {inp('UTC Offset (+3, -5…)', 'birthUtc')}
                {inp('Latitude', 'birthLat', 'number')}
                {inp('Longitude', 'birthLon', 'number')}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea value={form.notes} onChange={set('notes')} rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>
            {inp('Tags (comma-separated)', 'tags')}
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={!form.name}
                className="flex-1 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                Add Client
              </button>
              <button type="button" onClick={onClose}
                className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Add Consultation Modal ───────────────────────────────────────────────────
function AddConsultationModal({
  clients, onClose, onSave,
}: { clients: Client[]; onClose: () => void; onSave: (data: Omit<Consultation, 'id'|'authorUid'|'createdAt'>) => void }) {
  const [clientId, setClientId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [type, setType] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const dt = new Date(`${date}T${time || '00:00'}`);
    onSave({
      clientId, date: Timestamp.fromDate(dt),
      status: 'scheduled', type: type || undefined,
      price: price ? parseFloat(price) : undefined,
      notes: notes || undefined, paymentStatus: 'pending',
    });
  };

  return (
    <div className="fixed z-10 inset-0 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="fixed inset-0 bg-gray-500/75" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6 z-10">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">New Consultation</h3>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
              <select value={clientId} onChange={e => setClientId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500">
                <option value="">Select client…</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input type="time" value={time} onChange={e => setTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={type} onChange={e => setType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                  <option value="">Select…</option>
                  {['Natal Chart','Predictive','Synastry','Relocation','General'].map(t =>
                    <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={!clientId || !date}
                className="flex-1 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                Schedule
              </button>
              <button type="button" onClick={onClose}
                className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Main CRM ─────────────────────────────────────────────────────────────────
export default function CRM() {
  const { lang, setLang, tr } = useLang();
  const [user, setUser]     = useState<User | null>(null);
  const [ready, setReady]   = useState(false);
  const [tab, setTab]       = useState<'clients' | 'consultations'>('clients');
  const [clients, setClients]           = useState<Client[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [showAddClient, setShowAddClient]   = useState(false);
  const [showAddConsult, setShowAddConsult] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!firebaseConfigured) { setReady(true); return; }
    const unsub = onAuthStateChanged(auth, u => { setUser(u); setReady(true); });
    return unsub;
  }, []);

  useEffect(() => {
    if (!ready || !user) { setClients([]); setConsultations([]); return; }
    const cq = query(collection(db, 'clients'), where('authorUid','==',user.uid), orderBy('createdAt','desc'));
    const unC = onSnapshot(cq, snap => setClients(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Client)),
      err => handleError(err, 'clients'));
    const nq = query(collection(db, 'consultations'), where('authorUid','==',user.uid), orderBy('date','desc'));
    const unN = onSnapshot(nq, snap => setConsultations(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Consultation)),
      err => handleError(err, 'consultations'));
    return () => { unC(); unN(); };
  }, [user, ready]);

  const addClient = async (data: Omit<Client,'id'|'authorUid'|'createdAt'>) => {
    if (!user) return;
    try {
      await addDoc(collection(db,'clients'), { ...data, authorUid: user.uid, createdAt: serverTimestamp() });
      setShowAddClient(false);
    } catch (err) { handleError(err, 'addClient'); }
  };

  const addConsult = async (data: Omit<Consultation,'id'|'authorUid'|'createdAt'>) => {
    if (!user) return;
    try {
      await addDoc(collection(db,'consultations'), { ...data, authorUid: user.uid, createdAt: serverTimestamp() });
      setShowAddConsult(false);
    } catch (err) { handleError(err, 'addConsultation'); }
  };

  const deleteClient = async (id: string) => {
    if (!window.confirm('Delete this client?')) return;
    try { await deleteDoc(doc(db,'clients',id)); } catch (err) { handleError(err, 'deleteClient'); }
  };

  const deleteConsult = async (id: string) => {
    if (!window.confirm('Delete this consultation?')) return;
    try { await deleteDoc(doc(db,'consultations',id)); } catch (err) { handleError(err, 'deleteConsultation'); }
  };

  const setConsultStatus = (id: string, status: Consultation['status']) =>
    updateDoc(doc(db,'consultations',id), { status }).catch(err => handleError(err, 'setStatus'));

  const setPayStatus = (id: string, paymentStatus: Consultation['paymentStatus']) =>
    updateDoc(doc(db,'consultations',id), { paymentStatus }).catch(err => handleError(err, 'setPayment'));

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );
  const filteredConsults = consultations.filter(c => {
    const name = clients.find(cl => cl.id === c.clientId)?.name || '';
    return name.toLowerCase().includes(search.toLowerCase()) ||
           c.notes?.toLowerCase().includes(search.toLowerCase());
  });

  // ── Loading ──
  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center bg-transparent">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400" />
    </div>
  );

  // ── Login ──
  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-transparent px-4">
      <div className="max-w-md w-full glass-panel p-10 rounded-xl space-y-6">
        <div className="flex justify-end -mt-4 -mr-4">
          <button onClick={() => setLang(lang === 'en' ? 'ru' : 'en')}
            className="px-2.5 py-1 rounded-md text-xs font-bold border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors">
            {tr.langToggle}
          </button>
        </div>
        <div className="text-center">
          <Star className="h-10 w-10 text-amber-300 mx-auto mb-2" />
          <h2 className="text-3xl font-extrabold text-amber-100">{tr.crmTitle}</h2>
          <p className="mt-2 text-sm text-amber-100/75">{tr.crmSubtitle}</p>
        </div>
        {firebaseConfigured ? (
          <button onClick={loginWithGoogle}
            className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold rounded-md text-sm">
            {tr.signInGoogle}
          </button>
        ) : (
          <div className="rounded-md bg-amber-300/8 border border-amber-300/35 p-4 text-sm text-amber-100/90">
            <p className="font-semibold mb-1">{tr.firebaseNotConfigured}</p>
            <p>{tr.firebaseSetupHint}</p>
          </div>
        )}
        <p className="text-center"><Link to="/" className="text-sm gold-link hover:underline">{tr.backToPortal}</Link></p>
      </div>
    </div>
  );

  const upcomingCount = consultations.filter(c => c.status === 'scheduled').length;
  const totalRevenue  = consultations.filter(c => c.paymentStatus === 'paid').reduce((s, c) => s + (c.price || 0), 0);

  return (
    <div className="min-h-screen bg-transparent text-amber-50">
      {/* Navbar */}
      <nav className="glass-panel">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Star className="h-7 w-7 text-amber-300" />
                <span className="text-xl font-bold text-amber-100">HOLO CRM</span>
              </div>
              <div className="hidden sm:flex gap-1">
                {([['clients', tr.clients], ['consultations', tr.consultations]] as const).map(([k, label]) => (
                  <button key={k} onClick={() => setTab(k as 'clients' | 'consultations')}
                    className={cn('px-3 py-1 text-sm font-medium rounded-md border transition-colors',
                      tab === k ? 'bg-amber-300/15 border-amber-300/35 text-amber-100' : 'border-transparent text-amber-100/70 hover:text-amber-100 hover:border-amber-300/30')}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setLang(lang === 'en' ? 'ru' : 'en')}
                className="px-2.5 py-1 rounded-md text-xs font-bold border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors">
                {tr.langToggle}
              </button>
              <Link to="/" className="text-sm text-indigo-600 hover:text-indigo-500">{tr.portal}</Link>
              <span className="text-sm text-gray-500">{user.email}</span>
              <button onClick={logout} className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { icon: Users, label: tr.clients, value: clients.length, color: 'indigo' },
            { icon: CalendarIcon, label: tr.upcoming, value: upcomingCount, color: 'blue' },
            { icon: TrendingUp, label: tr.consultations, value: consultations.length, color: 'green' },
            { icon: CheckCircle, label: tr.revenue, value: `$${totalRevenue.toFixed(0)}`, color: 'purple' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full bg-${color}-100`}>
                  <Icon className={`h-5 w-5 text-${color}-600`} />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">{label}</p>
                  <p className="text-xl font-semibold text-gray-900">{value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error} <button onClick={() => setError(null)} className="ml-2 font-bold">✕</button>
          </div>
        )}

        {/* ── Clients tab ── */}
        {tab === 'clients' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-xl font-semibold text-gray-900">Clients ({filteredClients.length})</h1>
              <div className="flex gap-2">
                <button onClick={() => downloadPDF('crm-clients-list', 'clients.pdf', false)}
                  className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50">
                  <Download className="h-4 w-4" /> Export
                </button>
                <button onClick={() => setShowAddClient(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700">
                  <UserPlus className="h-4 w-4" /> Add Client
                </button>
              </div>
            </div>
            <div id="crm-clients-list" className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
              {filteredClients.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>No clients yet.</p>
                </div>
              ) : filteredClients.map(c => (
                <div key={c.id} className="px-4 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-indigo-600">{c.name}</p>
                      {c.tags?.map(t => (
                        <span key={t} className="px-2 text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">{t}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Open in Portal button */}
                      {c.birthDate && c.birthLat != null && c.birthLon != null && (
                        <Link
                          to={`/?date=${c.birthDate}&time=${c.birthTime||'12:00'}&lat=${c.birthLat}&lon=${c.birthLon}&utc=${c.birthUtc||0}&name=${encodeURIComponent(c.name)}`}
                          className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded-md"
                          title="Open in AstroCRM Portal">
                          <Star className="h-3 w-3" /> Chart
                        </Link>
                      )}
                      <button onClick={() => deleteClient(c.id)} className="text-gray-400 hover:text-red-500 p-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-4 text-sm text-gray-500">
                    {c.email && <span>{c.email}</span>}
                    {c.phone && <span>{c.phone}</span>}
                    {c.birthDate && (
                      <span className="font-medium text-gray-700">
                        ☉ {c.birthDate}{c.birthTime ? ' ' + c.birthTime : ''}{c.birthLocation ? ` · ${c.birthLocation}` : ''}
                      </span>
                    )}
                    <span className="ml-auto text-xs text-gray-400">
                      {c.createdAt ? format(c.createdAt.toDate(), 'MMM d, yyyy') : 'Recently'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Consultations tab ── */}
        {tab === 'consultations' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-xl font-semibold text-gray-900">Consultations ({filteredConsults.length})</h1>
              <div className="flex gap-2">
                <button onClick={() => downloadPDF('crm-consults-list', 'consultations.pdf', false)}
                  className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50">
                  <Download className="h-4 w-4" /> Export
                </button>
                <button onClick={() => setShowAddConsult(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700">
                  <Plus className="h-4 w-4" /> New
                </button>
              </div>
            </div>
            <div id="crm-consults-list" className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
              {filteredConsults.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  <CalendarIcon className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>No consultations yet.</p>
                </div>
              ) : filteredConsults.map(c => {
                const client = clients.find(cl => cl.id === c.clientId);
                return (
                  <div key={c.id} className="px-4 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-indigo-600">{client?.name || 'Unknown Client'}</p>
                        {c.type && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{c.type}</span>}
                        <select value={c.status} onChange={e => setConsultStatus(c.id, e.target.value as Consultation['status'])}
                          className={cn('text-xs font-semibold rounded-full px-2 py-0.5 border-0 cursor-pointer',
                            c.status === 'completed' ? 'bg-green-100 text-green-800' :
                            c.status === 'scheduled' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800')}>
                          <option value="scheduled">Scheduled</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        <select value={c.paymentStatus || 'pending'} onChange={e => setPayStatus(c.id, e.target.value as Consultation['paymentStatus'])}
                          className={cn('text-xs font-semibold rounded-full px-2 py-0.5 border-0 cursor-pointer',
                            c.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                            c.paymentStatus === 'refunded' ? 'bg-gray-100 text-gray-800' : 'bg-yellow-100 text-yellow-800')}>
                          <option value="pending">Pending</option>
                          <option value="paid">Paid</option>
                          <option value="refunded">Refunded</option>
                        </select>
                      </div>
                      <button onClick={() => deleteConsult(c.id)} className="text-gray-400 hover:text-red-500 p-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {c.date ? format(c.date.toDate(), 'MMM d, yyyy h:mm a') : 'Unknown Date'}
                      </span>
                      {c.price !== undefined && <span className="font-medium text-gray-700">${c.price}</span>}
                      {c.notes && <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" />{c.notes}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {showAddClient && user && (
        <AddClientModal user={user} onClose={() => setShowAddClient(false)} onSave={addClient} />
      )}
      {showAddConsult && (
        <AddConsultationModal clients={clients} onClose={() => setShowAddConsult(false)} onSave={addConsult} />
      )}
    </div>
  );
}
