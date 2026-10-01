import { ArrowDown, Sparkles, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { AssistantInput } from './AssistantInput';
import { AssistantMessage } from './AssistantMessage';
import { AssistantSuggestions } from './AssistantSuggestions';

export function AssistantPanel({ open, plannerPage, messages, openingActions, showOpeningActions, onSend, onAction, onAddItems, selectedIds, onClose, busy }) {
  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const endRef = useRef(null);

  useLayoutEffect(() => {
    if (open) inputRef.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [messages, open]);

  const trapFocus = event => {
    if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
    if (event.key !== 'Tab') return;
    const focusable = panelRef.current?.querySelectorAll('button:not(:disabled), textarea, a[href]');
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  const runAction = item => {
    onAction(item);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  return <section id="trishul-assistant-panel" ref={panelRef} className={`assistant-panel ${plannerPage ? 'assistant-panel--planner' : ''} ${open ? 'is-open' : ''}`} role="dialog" aria-modal="true" aria-labelledby="assistant-panel-title" aria-hidden={!open} onKeyDown={trapFocus}>
    <header className="assistant-panel-header">
      <span className="assistant-panel-emblem" aria-hidden="true"><Sparkles size={16}/></span>
      <div><h2 id="assistant-panel-title">TRISHUL ASSISTANT</h2><p>Menu · Catering · Planning</p></div>
      <button type="button" className="assistant-close" onClick={onClose} aria-label="Close Trishul assistant"><X size={18}/></button>
    </header>
    <div className="assistant-thread" aria-live="polite" aria-relevant="additions text">
      {messages.map(message => <div className="assistant-thread-entry" key={message.id}>
        <AssistantMessage message={message} onAddItems={onAddItems} selectedIds={selectedIds}/>
        {message.role === 'assistant' && <AssistantSuggestions actions={message.actions} onAction={runAction}/>}
      </div>)}
      {showOpeningActions && <AssistantSuggestions actions={openingActions} onAction={runAction} opening/>}
      {busy && <div className="assistant-typing" role="status" aria-label="Trishul assistant is responding"><i/><i/><i/></div>}
      <div ref={endRef}/>
    </div>
    <AssistantInput onSend={onSend} inputRef={inputRef} busy={busy}/>
    <p className="assistant-privacy-note">Chat stays in this session. Share personal details through the enquiry form only.</p>
  </section>;
}