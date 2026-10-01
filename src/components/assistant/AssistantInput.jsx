import { ArrowUp, LoaderCircle } from 'lucide-react';
import { useState } from 'react';

export function AssistantInput({ onSend, inputRef, busy = false }) {
  const [value, setValue] = useState('');
  const submit = event => {
    event.preventDefault();
    if (busy || !value.trim()) return;
    onSend(value.trim());
    setValue('');
  };
  const onKeyDown = event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };
  return <form className="assistant-input" onSubmit={submit}>
    <label className="assistant-sr-only" htmlFor="assistant-question">Ask Trishul about menus, catering or your event</label>
    <textarea id="assistant-question" ref={inputRef} rows="1" value={value} onChange={event => setValue(event.target.value)} onKeyDown={onKeyDown} placeholder="Ask about menus, catering or your event..." maxLength={500}/>
    <button type="submit" disabled={busy || !value.trim()} aria-label="Send message">{busy ? <LoaderCircle size={17} className="assistant-spinner"/> : <ArrowUp size={18}/>}</button>
  </form>;
}