import React, { useState, useEffect } from 'react';
import { auth, db, loginWithGoogle, logout } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, Timestamp, getDoc, doc, orderBy } from 'firebase/firestore';
import { LogOut, Users, Calendar as CalendarIcon, Plus, UserPlus, FileText, Clock, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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

async function testConnection() {
  try {
    await getDoc(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
}
testConnection();

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  authorUid: string;
  createdAt: Timestamp;
}

interface Consultation {
  id: string;
  clientId: string;
  date: Timestamp;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  authorUid: string;
  createdAt: Timestamp;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState<'clients' | 'consultations'>('clients');
  
  const [clients, setClients] = useState<Client[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  
  const [showAddClient, setShowAddClient] = useState(false);
  const [showAddConsultation, setShowAddConsultation] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
            <div className="flex items-center">
              <span className="text-sm text-gray-500 mr-4">{user.email}</span>
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
              <button
                onClick={() => setShowAddClient(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Client
              </button>
            </div>
            
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {clients.length === 0 ? (
                  <li className="px-4 py-8 text-center text-gray-500">No clients found. Add one to get started.</li>
                ) : (
                  clients.map((client) => (
                    <li key={client.id}>
                      <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-indigo-600 truncate">{client.name}</p>
                          <div className="ml-2 flex-shrink-0 flex">
                            <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              Active
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 sm:flex sm:justify-between">
                          <div className="sm:flex">
                            {client.email && (
                              <p className="flex items-center text-sm text-gray-500 mr-6">
                                {client.email}
                              </p>
                            )}
                            {client.phone && (
                              <p className="flex items-center text-sm text-gray-500">
                                {client.phone}
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
              <button
                onClick={() => setShowAddConsultation(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Consultation
              </button>
            </div>
            
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {consultations.length === 0 ? (
                  <li className="px-4 py-8 text-center text-gray-500">No consultations found. Schedule one to get started.</li>
                ) : (
                  consultations.map((consultation) => {
                    const client = clients.find(c => c.id === consultation.clientId);
                    return (
                      <li key={consultation.id}>
                        <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-indigo-600 truncate">
                              {client ? client.name : 'Unknown Client'}
                            </p>
                            <div className="ml-2 flex-shrink-0 flex">
                              <p className={cn(
                                "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
                                consultation.status === 'completed' ? "bg-green-100 text-green-800" :
                                consultation.status === 'scheduled' ? "bg-blue-100 text-blue-800" :
                                "bg-red-100 text-red-800"
                              )}>
                                {consultation.status.charAt(0).toUpperCase() + consultation.status.slice(1)}
                              </p>
                            </div>
                          </div>
                          <div className="mt-2 sm:flex sm:justify-between">
                            <div className="sm:flex">
                              <p className="flex items-center text-sm text-gray-500">
                                <Clock className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                                {consultation.date ? format(consultation.date.toDate(), 'MMM d, yyyy h:mm a') : 'Unknown Date'}
                              </p>
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
                
                try {
                  await addDoc(collection(db, 'clients'), {
                    name,
                    email: email || "",
                    phone: phone || "",
                    notes: notes || "",
                    authorUid: user.uid,
                    createdAt: serverTimestamp()
                  });
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
                const notes = formData.get('notes') as string;
                
                try {
                  await addDoc(collection(db, 'consultations'), {
                    clientId,
                    date: Timestamp.fromDate(new Date(dateStr)),
                    status,
                    notes: notes || "",
                    authorUid: user.uid,
                    createdAt: serverTimestamp()
                  });
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
