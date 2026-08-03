import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { FiArrowLeft, FiArrowUpRight, FiHash, FiMail, FiMapPin, FiPhone, FiPlus, FiSearch, FiUsers } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { collection, doc, getDocs, query, runTransaction, serverTimestamp, where } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { db } from '../../lib/firebase';
import { getInvoiceClientPrefillStorageKey } from '../../lib/invoices';

function getInitials(name) {
  return String(name || '?')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || '?';
}

function normalizeExternalClientNumber(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 10);
}

function createExternalClientNumber() {
  return String(Math.floor(100000000 + Math.random() * 900000000));
}

function firstContactValue(value, fallback = '') {
  const values = Array.isArray(value) ? value : [];
  return String(values.find((item) => String(item || '').trim()) || fallback || '').trim();
}

function createEmptyClient() {
  return { name: '', clientId: '', emails: [''], phones: [''], city: '', externalAccountingClientNumber: '' };
}

function normalizeClient(clientDoc) {
  const data = clientDoc.data() || {};
  return {
    id: clientDoc.id,
    name: String(data.name || data.clientName || data.fullName || '').trim(),
    clientId: String(data.taxId || data.clientId || data.clientTaxId || data.businessId || '').trim(),
    email: firstContactValue(data.emails || data.emailAddresses || data.clientEmails, data.email || data.clientEmail),
    phone: firstContactValue(data.phones || data.phoneNumbers || data.clientPhones, data.phone || data.clientPhone || data.optionalPhone),
    city: String(data.address || data.city || data.clientCity || data.town || data.clientAddress || '').trim(),
    externalAccountingClientNumber: String(data.externalClientNumber || data.externalAccountingClientNumber || '').trim(),
  };
}

export default function ClientsPage() {
  const router = useRouter();
  const { user, isWorker, loading } = useAuth();
  const { t, dir } = useLanguage();
  const copy = t.invoices;
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [savingClient, setSavingClient] = useState(false);
  const [newClient, setNewClient] = useState(createEmptyClient);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth/signin?next=%2Fworker%2Fclients');
      return;
    }
    if (!loading && user && !isWorker) router.replace('/');
  }, [isWorker, loading, router, user]);

  useEffect(() => {
    let active = true;

    async function loadClients() {
      if (!user?.uid) return;
      setLoadingClients(true);
      try {
        const clientSnapshot = await getDocs(collection(db, 'users', user.uid, 'clients'));
        if (active) setClients(clientSnapshot.docs.map(normalizeClient).filter((client) => client.name));
      } catch (error) {
        if (active) {
          setClients([]);
          toast.error(t.common.error);
        }
      } finally {
        if (active) setLoadingClients(false);
      }
    }

    loadClients();
    return () => { active = false; };
  }, [t.common.error, user?.uid]);

  const filteredClients = useMemo(() => {
    const search = searchTerm.trim().toLocaleLowerCase();
    return search ? clients.filter((client) => client.name.toLocaleLowerCase().includes(search)) : clients;
  }, [clients, searchTerm]);
  function startInvoice(client) {
    if (!user?.uid || typeof window === 'undefined') return;
    window.localStorage.setItem(
      getInvoiceClientPrefillStorageKey(user.uid),
      JSON.stringify({
        clientName: client.name,
        clientId: client.clientId,
        clientEmail: client.email,
        clientPhone: client.phone,
        clientCity: client.city,
      })
    );
    router.push('/worker/invoices');
  }

  function openAddClientDialog() {
    setNewClient((current) => ({
      ...current,
      externalAccountingClientNumber: current.externalAccountingClientNumber || createExternalClientNumber(),
    }));
    setAddClientOpen(true);
  }

  function closeAddClientDialog() {
    if (savingClient) return;
    setAddClientOpen(false);
    setNewClient(createEmptyClient());
  }

  async function saveNewClient(event) {
    event.preventDefault();
    if (!user?.uid || savingClient) return;

    const name = newClient.name.trim();
    const externalAccountingClientNumber = normalizeExternalClientNumber(newClient.externalAccountingClientNumber);
    if (!name) {
      toast.error(copy.clientNameRequired);
      return;
    }
    if (!externalAccountingClientNumber) {
      toast.error(copy.externalAccountingClientNumberRequired);
      return;
    }

    const clientData = {
      name,
      nameLowercase: name.toLocaleLowerCase(),
      taxId: String(newClient.clientId || '').replace(/\D/g, '').slice(0, 9),
      emails: newClient.emails.map((email) => email.trim()).filter(Boolean),
      phones: newClient.phones.map((phone) => phone.trim()).filter(Boolean),
      address: newClient.city.trim(),
      externalClientNumber: externalAccountingClientNumber,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    clientData.email = clientData.emails[0] || '';
    clientData.phone = clientData.phones[0] || '';

    try {
      setSavingClient(true);
      const clientsRef = collection(db, 'users', user.uid, 'clients');
      const existingClientSnapshot = await getDocs(query(clientsRef, where('externalClientNumber', '==', externalAccountingClientNumber)));
      if (!existingClientSnapshot.empty) {
        toast.error(copy.externalAccountingClientNumberInUse);
        return;
      }

      const clientRef = doc(clientsRef);
      const numberRegistryRef = doc(db, 'users', user.uid, 'clientNumbers', externalAccountingClientNumber);
      await runTransaction(db, async (transaction) => {
        if ((await transaction.get(numberRegistryRef)).exists()) throw new Error('external-client-number-in-use');
        transaction.set(clientRef, clientData);
        transaction.set(numberRegistryRef, { clientId: clientRef.id, createdAt: serverTimestamp() });
      });

      setClients((current) => [...current, {
        id: clientRef.id,
        name,
        clientId: clientData.taxId,
        email: clientData.email,
        phone: clientData.phone,
        city: clientData.address,
        externalAccountingClientNumber,
      }]);
      setAddClientOpen(false);
      setNewClient(createEmptyClient());
      toast.success(copy.clientAdded);
    } catch (error) {
      toast.error(error?.message === 'external-client-number-in-use'
        ? copy.externalAccountingClientNumberInUse
        : copy.clientAddFailed);
    } finally {
      setSavingClient(false);
    }
  }

  if (loading || (user && loadingClients)) {
    return <div className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center px-4"><div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }
  if (!user || !isWorker) return null;

  return (
    <>
      <Head><title>{`Hiro | ${copy.clientsTitle}`}</title></Head>
      <main className="min-h-screen bg-[#f1f5fa] px-4 py-6 sm:px-6 sm:py-8" dir={dir}>
        <div className="mx-auto max-w-[920px]">
          <div className="flex items-center gap-4">
            <Link href="/worker/invoices" className="text-primary transition-opacity hover:opacity-80" aria-label={copy.backToEditor}>
              <FiArrowLeft className={`h-7 w-7 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="text-[28px] font-extrabold tracking-tight text-slate-900 sm:text-[38px]">{copy.clientsTitle}</h1>
              <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-slate-600 sm:text-base">{copy.clientsSubtitle}</p>
            </div>
            <button type="button" onClick={openAddClientDialog} className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-primary-dark">
              <FiPlus className="h-4 w-4" />
              <span className="hidden sm:inline">{copy.addClient}</span>
            </button>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_max-content]">
            <label className="flex items-center gap-3 rounded-[20px] border border-[#d4e0ef] bg-white px-4 py-3.5 shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
              <FiSearch className="h-6 w-6 shrink-0 text-slate-600" />
              <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder={copy.clientsSearchPlaceholder} className="w-full bg-transparent text-base text-slate-700 outline-none placeholder:text-slate-500 sm:text-lg" />
            </label>
            <div className="rounded-[20px] bg-[#dcebfa] px-4 py-3.5 text-slate-700 shadow-sm md:min-w-[168px]">
              <p className="text-3xl font-extrabold leading-none text-primary">{clients.length}</p>
              <p className="mt-1.5 text-sm font-bold uppercase tracking-wide">{copy.clientsTitle}</p>
            </div>
          </div>

          <div className="mt-6 space-y-3.5">
            {filteredClients.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[#c7d7e8] bg-white px-8 py-12 text-center shadow-sm">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#dcebfa] text-primary"><FiUsers className="h-8 w-8" /></div>
                <h2 className="mt-5 text-xl font-extrabold text-slate-900">{copy.clientsEmptyTitle}</h2>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-600">{copy.clientsEmptyBody}</p>
                <Link href="/worker/invoices" className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-primary-dark">
                  {copy.invoiceForClient}<FiArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            ) : filteredClients.map((client) => (
              <article key={client.id} className="rounded-[22px] border border-[#dbe5f0] bg-white p-4 shadow-sm transition-transform hover:-translate-y-0.5">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-[#e9f8f2] text-lg font-extrabold text-emerald-700">{getInitials(client.name)}</div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-xl font-extrabold text-slate-900 sm:text-2xl">{client.name}</h2>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-sm font-semibold text-slate-500">
                      {client.externalAccountingClientNumber ? <span className="inline-flex items-center gap-1.5"><FiHash className="h-4 w-4" />{client.externalAccountingClientNumber}</span> : null}
                      {client.email ? <span className="inline-flex items-center gap-1.5"><FiMail className="h-4 w-4" />{client.email}</span> : null}
                      {client.phone ? <span className="inline-flex items-center gap-1.5"><FiPhone className="h-4 w-4" />{client.phone}</span> : null}
                      {client.city ? <span className="inline-flex items-center gap-1.5"><FiMapPin className="h-4 w-4" />{client.city}</span> : null}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3.5">
                  <span className="text-sm font-semibold text-slate-500">{copy.externalAccountingClientNumber}</span>
                  <button type="button" onClick={() => startInvoice(client)} className="ms-auto inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-dark">
                    {copy.invoiceForClient}<FiArrowUpRight className="h-4 w-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </main>

      {addClientOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-950/35 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="add-client-title">
          <form onSubmit={saveNewClient} className="w-full rounded-t-[28px] bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-[28px] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-primary/65">{copy.clientsTitle}</p>
                <h2 id="add-client-title" className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">{copy.addClient}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">{copy.addClientSubtitle}</p>
              </div>
              <button type="button" onClick={closeAddClientDialog} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-500 transition hover:bg-slate-200" aria-label={t.common.cancel}>×</button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-sm font-bold text-slate-700">{copy.clientName} *</span>
                <input autoFocus required value={newClient.name} onChange={(event) => setNewClient((current) => ({ ...current, name: event.target.value }))} className="input-field" />
              </label>
              <label>
                <span className="mb-1.5 block text-sm font-bold text-slate-700">{copy.clientId}</span>
                <input value={newClient.clientId} onChange={(event) => setNewClient((current) => ({ ...current, clientId: String(event.target.value || '').replace(/\D/g, '').slice(0, 9) }))} inputMode="numeric" maxLength={9} className="input-field" />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1.5 flex items-center justify-between gap-3 text-sm font-bold text-slate-700">
                  <span>{copy.clientPhone}</span>
                  <button type="button" onClick={() => setNewClient((current) => ({ ...current, phones: [...current.phones, ''] }))} className="inline-flex items-center gap-1 text-primary transition hover:text-primary-dark"><FiPlus className="h-4 w-4" />+</button>
                </span>
                <div className="space-y-2">
                  {newClient.phones.map((phone, index) => (
                    <div key={`phone-${index}`} className="flex items-center gap-2">
                      <input value={phone} onChange={(event) => setNewClient((current) => ({ ...current, phones: current.phones.map((item, itemIndex) => itemIndex === index ? event.target.value : item) }))} placeholder={index === 0 ? `${copy.clientPhone} (${copy.primaryContact})` : copy.clientPhone} className="input-field flex-1" />
                      {index > 0 ? <button type="button" onClick={() => setNewClient((current) => ({ ...current, phones: current.phones.filter((_, itemIndex) => itemIndex !== index) }))} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600" aria-label={copy.remove}>×</button> : null}
                    </div>
                  ))}
                </div>
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1.5 flex items-center justify-between gap-3 text-sm font-bold text-slate-700">
                  <span>{copy.clientEmail}</span>
                  <button type="button" onClick={() => setNewClient((current) => ({ ...current, emails: [...current.emails, ''] }))} className="inline-flex items-center gap-1 text-primary transition hover:text-primary-dark"><FiPlus className="h-4 w-4" />+</button>
                </span>
                <div className="space-y-2">
                  {newClient.emails.map((email, index) => (
                    <div key={`email-${index}`} className="flex items-center gap-2">
                      <input type="email" value={email} onChange={(event) => setNewClient((current) => ({ ...current, emails: current.emails.map((item, itemIndex) => itemIndex === index ? event.target.value : item) }))} placeholder={index === 0 ? `${copy.clientEmail} (${copy.primaryContact})` : copy.clientEmail} className="input-field flex-1" />
                      {index > 0 ? <button type="button" onClick={() => setNewClient((current) => ({ ...current, emails: current.emails.filter((_, itemIndex) => itemIndex !== index) }))} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600" aria-label={copy.remove}>×</button> : null}
                    </div>
                  ))}
                </div>
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-sm font-bold text-slate-700">{copy.city}</span>
                <input value={newClient.city} onChange={(event) => setNewClient((current) => ({ ...current, city: event.target.value }))} className="input-field" />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-sm font-bold text-slate-700">{copy.externalAccountingClientNumber} *</span>
                <input required value={newClient.externalAccountingClientNumber} onChange={(event) => setNewClient((current) => ({ ...current, externalAccountingClientNumber: normalizeExternalClientNumber(event.target.value) }))} inputMode="numeric" minLength={1} maxLength={10} className="input-field bg-[#eef0ff]" />
              </label>
            </div>

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeAddClientDialog} disabled={savingClient} className="btn-ghost justify-center">{t.common.cancel}</button>
              <button type="submit" disabled={savingClient} className="btn-primary justify-center disabled:cursor-wait disabled:opacity-70">{savingClient ? t.common.loading : copy.saveClient}</button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
