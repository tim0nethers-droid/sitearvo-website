import { ArrowLeft, MessageCircle, Send, UserRound, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { whatsappUrl } from '../config/company';

const storageKey = 'sitearvo-live-chat-token';

async function chatFetch(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || 'Live chat is temporarily unavailable.');
  return body.data ?? body;
}

export default function LiveChatWidget() {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState(() => localStorage.getItem(storageKey) || '');
  const [chat, setChat] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', message: '', website: '' });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef(null);
  const whatsApp = whatsappUrl('Hi SiteArvo, I would like to discuss a project.');

  const load = useCallback(async (quiet = false) => {
    if (!token) return;
    try {
      const data = await chatFetch(`/chat/${token}`);
      setChat(data);
      if (!quiet) setError('');
    } catch (requestError) {
      if (!quiet) setError(requestError.message);
      if (/not found/i.test(requestError.message)) {
        localStorage.removeItem(storageKey);
        setToken('');
        setChat(null);
      }
    }
  }, [token]);

  useEffect(() => { if (token) load(); }, [token, load]);
  useEffect(() => {
    if (!token || !open || chat?.status === 'closed') return undefined;
    const timer = window.setInterval(() => load(true), 5000);
    return () => window.clearInterval(timer);
  }, [token, open, chat?.status, load]);
  useEffect(() => { if (open) listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }); }, [open, chat?.messages?.length]);

  const start = async event => {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const data = await chatFetch('/chat/start', { method: 'POST', body: JSON.stringify(form) });
      localStorage.setItem(storageKey, data.token);
      setToken(data.token); setChat(data); setForm({ name: '', email: '', message: '', website: '' });
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  };

  const send = async event => {
    event.preventDefault();
    if (!message.trim()) return;
    setBusy(true); setError('');
    try {
      await chatFetch(`/chat/${token}/messages`, { method: 'POST', body: JSON.stringify({ message }) });
      setMessage(''); await load();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  };

  const newChat = () => {
    localStorage.removeItem(storageKey); setToken(''); setChat(null); setError('');
  };

  return <div className={`live-chat ${open ? 'is-open' : ''}`}>
    {open && <section className="live-chat-panel" aria-label="SiteArvo live chat">
      <header><div className="live-chat-agent"><span><UserRound aria-hidden="true" /></span><div><b>SiteArvo Live Support</b><small><i /> Replies in this chat</small></div></div><button type="button" onClick={() => setOpen(false)} aria-label="Close live chat"><X /></button></header>
      {!token ? <form className="live-chat-start" onSubmit={start}>
        <div><span className="eyebrow">Welcome</span><h2>How can we help?</h2><p>Send your question and our team can reply here from the SiteArvo admin panel.</p></div>
        <label><span>Name *</span><input required minLength="2" maxLength="120" autoComplete="name" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label>
        <label><span>Email <small>(optional)</small></span><input type="email" autoComplete="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} /></label>
        <label className="chat-honeypot" aria-hidden="true">Website<input tabIndex="-1" autoComplete="off" value={form.website} onChange={event => setForm({ ...form, website: event.target.value })} /></label>
        <label><span>Your question *</span><textarea required maxLength="1500" rows="4" value={form.message} onChange={event => setForm({ ...form, message: event.target.value })} placeholder="Tell us what you need..." /></label>
        {error && <p className="live-chat-error" role="alert">{error}</p>}
        <button className="button" disabled={busy}>{busy ? 'Starting chat...' : <>Start Live Chat <MessageCircle /></>}</button>
        <small className="live-chat-privacy">Your conversation is stored securely so SiteArvo can reply.</small>
      </form> : <div className="live-chat-conversation">
        <div className="live-chat-reference"><span>Conversation #{chat?.public_id}</span>{chat?.status === 'closed' && <button type="button" onClick={newChat}><ArrowLeft /> Start new chat</button>}</div>
        <div className="live-chat-messages" ref={listRef} aria-live="polite">
          <div className="chat-bubble chat-bubble--admin"><b>SiteArvo</b><p>Thanks for contacting us. Send your requirements here and we will reply as soon as possible.</p></div>
          {(chat?.messages || []).map(item => <div className={`chat-bubble chat-bubble--${item.sender}`} key={item.id}><b>{item.sender === 'visitor' ? 'You' : 'SiteArvo'}</b><p>{item.message}</p><time>{new Date(item.created_at.replace(' ', 'T')).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</time></div>)}
        </div>
        {chat?.status === 'closed' ? <div className="live-chat-closed"><p>This conversation has been closed.</p>{whatsApp && <a href={whatsApp} target="_blank" rel="noreferrer">Continue on WhatsApp</a>}</div> : <form className="live-chat-compose" onSubmit={send}><label className="sr-only" htmlFor="live-chat-message">Message</label><textarea id="live-chat-message" rows="1" maxLength="1500" value={message} onChange={event => setMessage(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="Type your message..." /><button type="submit" disabled={busy || !message.trim()} aria-label="Send message"><Send /></button></form>}
        {error && <p className="live-chat-error" role="alert">{error}</p>}
      </div>}
    </section>}
    <button className="live-chat-toggle" type="button" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-label={open ? 'Close live chat' : 'Open SiteArvo live chat'}>{open ? <X /> : <MessageCircle />}<span>{open ? 'Close' : 'Live Chat'}</span>{chat?.unread_visitor > 0 && !open && <b>{chat.unread_visitor}</b>}</button>
  </div>;
}
