import { MessageCircle, X } from 'lucide-react';

export function AssistantButton({ open, onClick, plannerPage, buttonRef }) {
  return <button ref={buttonRef} className={`assistant-launcher ${plannerPage ? 'assistant-launcher--planner' : ''} ${open ? 'is-open' : ''}`} type="button" onClick={onClick} aria-expanded={open} aria-controls="trishul-assistant-panel" aria-label={open ? 'Close Trishul assistant' : 'Ask Trishul'}>
    {open ? <X size={19}/> : <MessageCircle size={19}/>}<span>{open ? 'Close' : 'Ask Trishul'}</span>
  </button>;
}