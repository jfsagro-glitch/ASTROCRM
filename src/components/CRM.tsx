import React, { useState, useEffect } from 'react';
import { auth, db, loginWithGoogle, logout } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, Timestamp, getDoc, doc, orderBy, deleteDoc, updateDoc } from 'firebase/firestore';
import { LogOut, Users, Calendar as CalendarIcon, Plus, UserPlus, FileText, Clock, CheckCircle, XCircle, Download, Search, Trash2, Edit2, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { downloadPDF } from '../lib/pdfUtils';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Link } from 'react-router-dom';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  birthDate?: string;
  birthTime?: string;
  birthLocation?: string;
  tags?: string[];
  authorUid: string;
  createdAt: Timestamp;
}

interface Consultation {
  id: string;
  clientId: string;
  date: Timestamp;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  type?: string;
  price?: number;
  paymentStatus?: 'pending' | 'paid' | 'refunded';
  authorUid: string;
  createdAt: Timestamp;
}

export default function CRM() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState<'clients' | 'consultations'>('clients');
  
  const [clients, setClients] = useState<Client[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  
  const [showAddClient, setShowAddClient] = useState(false);
  const [showAddConsultation, setShowAddConsultation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthReady || !user) {
      setClients([]);
      setConsultations([]);
      return;
    }

    const clientsQuery = query(
      collection(db, 'clients'),
      where('authorUid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeClients = onSnapshot(clientsQuery, (snapshot) => {
      const clientsData: Client[] = [];
      snapshot.forEach((doc) => {
        clientsData.push({ id: doc.id, ...doc.data() } as Client);
      });
      setClients(clientsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'clients');
    });

    const consultationsQuery = query(
      collection(db, 'consultations'),
      where('authorUid', '==', user.uid),
      orderBy('date', 'desc')
    );

    const unsubscribeConsultations = onSnapshot(consultationsQuery, (snapshot) => {
      const consultationsData: Consultation[] = [];
      snapshot.forEach((doc) => {
        consultationsData.push({ id: doc.id, ...doc.data() } as Consultation);
      });
      setConsultations(consultationsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'consultations');
    });

    return () => {
      unsubscribeClients();
      unsubscribeConsultations();
    };
  }, [user, isAuthReady]);

  const handleDeleteClient = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this client? All their consultations will remain but lose the client link.')) {
      try {
        await deleteDoc(doc(db, 'clients', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `clients/${id}`);
      }
    }
  };

  const handleDeleteConsultation = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this consultation?')) {
      try {
        await deleteDoc(doc(db, 'consultations', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `consultations/${id}`);
      }
    }
  };

  const handleStatusChange = async (id: string, newStatus: 'scheduled' | 'completed' | 'cancelled') => {
    try {
      await updateDoc(doc(db, 'consultations', id), { status: newStatus });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `consultations/${id}`);
    }
  };

  const handlePaymentStatusChange = async (id: string, newStatus: 'pending' | 'paid' | 'refunded') => {
    try {
      await updateDoc(doc(db, 'consultations', id), { paymentStatus: newStatus });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `consultations/${id}`);
    }
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredConsultations = consultations.filter(c => {
    const clientName = clients.find(cl => cl.id === c.clientId)?.name || '';
    return clientName.toLowerCase().includes(searchQuery.toLowerCase()) || 
           c.notes?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const upcomingCount = consultations.filter(c => c.status === 'scheduled').length;

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              CRM & Consultations
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Manage your clients and consultation history securely.
            </p>
          </div>
          <div>
            <button
              onClick={loginWithGoogle}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Sign in with Google
            </button>
          </div>
          <div className="text-center mt-4">
            <Link to="/" className="text-sm text-indigo-600 hover:text-indigo-500">
              &larr; Back to Client Portal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Users className="h-8 w-8 text-indigo-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">CRM Pro</span>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <button
                  onClick={() => setActiveTab('clients')}
                  className={cn(
                    "inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium",
                    activeTab === 'clients' ? "border-indigo-500 text-gray-900" : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  )}
                >
                  Clients
                </button>
                <button
                  onClick={() => setActiveTab('consultations')}
                  className={cn(
                    "inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium",
                    activeTab === 'consultations' ? "border-indigo-500 text-gray-900" : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  )}
                >
                  Consultations
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/" className="text-sm text-indigo-600 hover:text-indigo-500">
                Client Portal
              </Link>
              <span className="text-sm text-gray-500">{user.email}</span>
              <button
                onClick={logout}
                className="p-2 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-indigo-100 text-indigo-600">
                <Users className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Clients</p>
                <p className="text-2xl font-semibold text-gray-900">{clients.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <CalendarIcon className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Upcoming Consultations</p>
                <p className="text-2xl font-semibold text-gray-900">{upcomingCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Consultations</p>
                <p className="text-2xl font-semibold text-gray-900">{consultations.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search clients or consultations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm shadow-sm"
          />
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline"> {error}</span>
            <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setError(null)}>
              <XCircle className="h-5 w-5 text-red-500 cursor-pointer" />
            </span>
          </div>
        )}

        {activeTab === 'clients' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-semibold text-gray-900">Clients</h1>
              <div className="flex space-x-3">
                <button
                  onClick={() => downloadPDF('crm-clients-list', 'clients-list.pdf', false)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </button>
                <button
                  onClick={() => setShowAddClient(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Client
                </button>
              </div>
            </div>
            
            <div id="crm-clients-list" className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {filteredClients.length === 0 ? (
                  <li className="px-4 py-8 text-center text-gray-500">No clients found.</li>
                ) : (
                  filteredClients.map((client) => (
                    <li key={client.id}>
                      <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <p className="text-sm font-medium text-indigo-600 truncate">{client.name}</p>
                            {client.tags && client.tags.length > 0 && (
                              <div className="ml-3 flex gap-1">
                                {client.tags.map(tag => (
                                  <span key={tag} className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <button onClick={() => handleDeleteClient(client.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="mt-2 sm:flex sm:justify-between">
                          <div className="sm:flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-6">
                            {client.email && (
                              <p className="flex items-center text-sm text-gray-500">
                                {client.email}
                              </p>
                            )}
                            {client.phone && (
                              <p className="flex items-center text-sm text-gray-500">
                                {client.phone}
                              </p>
                            )}
                            {(client.birthDate || client.birthTime || client.birthLocation) && (
                              <p className="flex items-center text-sm text-gray-500">
                                <span className="font-medium mr-1">Birth Data:</span>
                                {client.birthDate} {client.birthTime} {client.birthLocation ? `in ${client.birthLocation}` : ''}
                              </p>
                            )}
                          </div>
                          <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                            <CalendarIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                            <p>
                              Added {client.createdAt ? format(client.createdAt.toDate(), 'MMM d, yyyy') : 'Recently'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'consultations' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-semibold text-gray-900">Consultations</h1>
              <div className="flex space-x-3">
                <button
                  onClick={() => downloadPDF('crm-consultations-list', 'consultations-list.pdf', false)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </button>
                <button
                  onClick={() => setShowAddConsultation(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Consultation
                </button>
              </div>
            </div>
            
            <div id="crm-consultations-list" className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {filteredConsultations.length === 0 ? (
                  <li className="px-4 py-8 text-center text-gray-500">No consultations found.</li>
                ) : (
                  filteredConsultations.map((consultation) => {
                    const client = clients.find(c => c.id === consultation.clientId);
                    return (
                      <li key={consultation.id}>
                        <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <p className="text-sm font-medium text-indigo-600 truncate">
                                {client ? client.name : 'Unknown Client'}
                              </p>
                              <div className="ml-3 flex items-center space-x-2">
                                <select 
                                  value={consultation.status}
                                  onChange={(e) => handleStatusChange(consultation.id, e.target.value as any)}
                                  className={cn(
                                    "text-xs font-semibold rounded-full px-2 py-1 border-0 cursor-pointer focus:ring-0",
                                    consultation.status === 'completed' ? "bg-green-100 text-green-800" :
                                    consultation.status === 'scheduled' ? "bg-blue-100 text-blue-800" :
                                    "bg-red-100 text-red-800"
                                  )}
                                >
                                  <option value="scheduled">Scheduled</option>
                                  <option value="completed">Completed</option>
                                  <option value="cancelled">Cancelled</option>
                                </select>
                                <select 
                                  value={consultation.paymentStatus || 'pending'}
                                  onChange={(e) => handlePaymentStatusChange(consultation.id, e.target.value as any)}
                                  className={cn(
                                    "text-xs font-semibold rounded-full px-2 py-1 border-0 cursor-pointer focus:ring-0",
                                    consultation.paymentStatus === 'paid' ? "bg-green-100 text-green-800" :
                                    consultation.paymentStatus === 'refunded' ? "bg-gray-100 text-gray-800" :
                                    "bg-yellow-100 text-yellow-800"
                                  )}
                                >
                                  <option value="pending">Pending</option>
                                  <option value="paid">Paid</option>
                                  <option value="refunded">Refunded</option>
                                </select>
                              </div>
                            </div>
                            <button onClick={() => handleDeleteConsultation(consultation.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="mt-2 sm:flex sm:justify-between">
                            <div className="sm:flex gap-6">
                              <p className="flex items-center text-sm text-gray-500">
                                <Clock className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                                {consultation.date ? format(consultation.date.toDate(), 'MMM d, yyyy h:mm a') : 'Unknown Date'}
                              </p>
                              {consultation.type && (
                                <p className="flex items-center text-sm text-gray-500 font-medium">
                                  {consultation.type}
                                </p>
                              )}
                              {consultation.price !== undefined && (
                                <p className="flex items-center text-sm text-gray-500">
                                  ${consultation.price}
                                </p>
                              )}
                            </div>
                            {consultation.notes && (
                              <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                                <FileText className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                                <p className="truncate max-w-xs">{consultation.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          </div>
        )}
      </main>

      {/* Add Client Modal */}
      {showAddClient && (
        <div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowAddClient(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const name = formData.get('name') as string;
                const email = formData.get('email') as string;
                const phone = formData.get('phone') as string;
                const notes = formData.get('notes') as string;
                const birthDate = formData.get('birthDate') as string;
                const birthTime = formData.get('birthTime') as string;
                const birthLocation = formData.get('birthLocation') as string;
                const tagsString = formData.get('tags') as string;
                const tags = tagsString ? tagsString.split(',').map(t => t.trim()).filter(t => t) : [];
                
                try {
                  const newClient: any = {
                    name,
                    authorUid: user.uid,
                    createdAt: serverTimestamp()
                  };
                  if (email) newClient.email = email;
                  if (phone) newClient.phone = phone;
                  if (notes) newClient.notes = notes;
                  if (birthDate) newClient.birthDate = birthDate;
                  if (birthTime) newClient.birthTime = birthTime;
                  if (birthLocation) newClient.birthLocation = birthLocation;
                  if (tags.length > 0) newClient.tags = tags;

                  await addDoc(collection(db, 'clients'), newClient);
                  setShowAddClient(false);
                } catch (err) {
                  handleFirestoreError(err, OperationType.CREATE, 'clients');
                  setError(err instanceof Error ? err.message : 'Failed to add client');
                }
              }}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                        Add New Client
                      </h3>
                      <div className="mt-4 space-y-4">
                        <div>
                          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name *</label>
                          <input type="text" name="name" id="name" required className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" />
                        </div>
                        <div>
                          <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                          <input type="email" name="email" id="email" className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" />
                        </div>
                        <div>
                          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone</label>
                          <input type="text" name="phone" id="phone" className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" />
                        </div>
                        <div>
                          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes</label>
                          <textarea name="notes" id="notes" rows={3} className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"></textarea>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm">
                    Save
                  </button>
                  <button type="button" onClick={() => setShowAddClient(false)} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Consultation Modal */}
      {showAddConsultation && (
        <div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowAddConsultation(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const clientId = formData.get('clientId') as string;
                const dateStr = formData.get('date') as string;
                const status = formData.get('status') as string;
                const type = formData.get('type') as string;
                const priceStr = formData.get('price') as string;
                const paymentStatus = formData.get('paymentStatus') as string;
                const notes = formData.get('notes') as string;
                
                try {
                  const newConsultation: any = {
                    clientId,
                    date: Timestamp.fromDate(new Date(dateStr)),
                    status,
                    authorUid: user.uid,
                    createdAt: serverTimestamp()
                  };
                  if (type) newConsultation.type = type;
                  if (priceStr) newConsultation.price = parseFloat(priceStr);
                  if (paymentStatus) newConsultation.paymentStatus = paymentStatus;
                  if (notes) newConsultation.notes = notes;

                  await addDoc(collection(db, 'consultations'), newConsultation);
                  setShowAddConsultation(false);
                } catch (err) {
                  handleFirestoreError(err, OperationType.CREATE, 'consultations');
                  setError(err instanceof Error ? err.message : 'Failed to add consultation');
                }
              }}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                        Schedule Consultation
                      </h3>
                      <div className="mt-4 space-y-4">
                        <div>
                          <label htmlFor="clientId" className="block text-sm font-medium text-gray-700">Client *</label>
                          <select name="clientId" id="clientId" required className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border">
                            <option value="">Select a client</option>
                            {clients.map(client => (
                              <option key={client.id} value={client.id}>{client.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label htmlFor="date" className="block text-sm font-medium text-gray-700">Date & Time *</label>
                          <input type="datetime-local" name="date" id="date" required className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" />
                        </div>
                        <div>
                          <label htmlFor="type" className="block text-sm font-medium text-gray-700">Consultation Type</label>
                          <select name="type" id="type" className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border">
                            <option value="">Select type...</option>
                            <option value="Natal Chart">Natal Chart</option>
                            <option value="Synastry">Synastry</option>
                            <option value="Transit Reading">Transit Reading</option>
                            <option value="Tarot Reading">Tarot Reading</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="price" className="block text-sm font-medium text-gray-700">Price ($)</label>
                            <input type="number" step="0.01" name="price" id="price" className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" />
                          </div>
                          <div>
                            <label htmlFor="paymentStatus" className="block text-sm font-medium text-gray-700">Payment Status</label>
                            <select name="paymentStatus" id="paymentStatus" defaultValue="pending" className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border">
                              <option value="pending">Pending</option>
                              <option value="paid">Paid</option>
                              <option value="refunded">Refunded</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status *</label>
                          <select name="status" id="status" required defaultValue="scheduled" className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border">
                            <option value="scheduled">Scheduled</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes</label>
                          <textarea name="notes" id="notes" rows={3} className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"></textarea>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm">
                    Save
                  </button>
                  <button type="button" onClick={() => setShowAddConsultation(false)} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
