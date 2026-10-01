import { useEffect, useRef, useState } from 'react';
import { businessConfig } from '../../data/config';
import { readAssistantContext } from '../../data/assistantKnowledge';
import { useMenuSelection } from '../../hooks/useMenuSelection';
import { normalizePlannerState } from '../../data/plannerRules';
import { assistantOpeningActions, assistantWelcome, getAssistantResponse, respondWithLocalAssistant } from '../../utils/assistantEngine';
import { handleCallClick, handleWhatsAppClick, trackAssistantEvent } from '../../utils/conversionHandlers';
import { AssistantButton } from './AssistantButton';
import { AssistantPanel } from './AssistantPanel';

const newMessage = (role, text, extra = {}) => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, role, text, ...extra });

function createWhatsAppMessage(context, enquiry = '') {
  const planner = context.plannerState;
  const food = { veg: 'Vegetarian', nonveg: 'Non-Vegetarian', both: 'Both (demo mixed-food planning)' }[planner.food] || 'Not selected';
  const basis = { veg: 'Standard Vegetarian Menu', nonveg: 'Standard Non-Vegetarian Menu', both: 'Standard Mixed Menu (demo)' }[planner.food] || 'Standard Menu';
  return [
    `Hello ${businessConfig.name},`, '', enquiry || 'I would like to enquire about catering.',
    `Event: ${planner.eventType}`, `Guests: ${planner.guests}`, `Food preference: ${food}`,
    `Menu basis: ${basis}`,
    ...(context.selectedItems.length ? ['Selected dishes:', ...context.selectedItems.map(item => `• ${item.name}`)] : []),
    `Location: ${planner.location === 'Other Hyderabad / Surrounding Area' ? planner.customLocation || planner.location : planner.location}`,
    `Service duration: ${planner.duration} (${planner.servingTime})`,
  ].join('\n');
}

export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState(() => [newMessage('assistant', assistantWelcome)]);
  const [showOpeningActions, setShowOpeningActions] = useState(true);
  const { selectedIds, setSelectedIds } = useMenuSelection();
  const buttonRef = useRef(null);
  const didAddContext = useRef(false);
  const pathname = window.location.pathname;
  const plannerPage = pathname === '/plan';
  useEffect(() => {
    if (!open || didAddContext.current) return;
    if (pathname === '/menu' || pathname === '/plan') {
      const result = getAssistantResponse('what is in my current plan?', readAssistantContext(pathname));
      setMessages(current => [...current, newMessage('assistant', result.message, { actions: result.actions, intent: result.intent, data: result.data })]);
    }
    didAddContext.current = true;
  }, [open, pathname]);

  const sendMessage = async (text, overrides = {}) => {
    if (!text.trim()) return;
    setShowOpeningActions(false);
    trackAssistantEvent('message', { characterCount: text.length });
    setMessages(current => [...current, newMessage('user', text)]);
    setBusy(true);
    try {
      const context = { ...readAssistantContext(pathname), ...overrides };
      const result = await respondWithLocalAssistant(text, context);
      setMessages(current => [...current, newMessage('assistant', result.message, { actions: result.actions, intent: result.intent, data: result.data })]);
    } catch {
      setMessages(current => [...current, newMessage('assistant', "I don't have that detail configured yet. Would you like to speak directly with Trishul?", { actions: [{ label: 'WhatsApp', type: 'whatsapp' }, { label: 'Call Trishul', type: 'call' }] })]);
    } finally {
      setBusy(false);
    }
  };

  const addMenuItems = ids => {
    const storedIds = readAssistantContext(pathname).selectedIds;
    const additions = ids.filter(id => !storedIds.includes(id));
    const nextIds = [...new Set([...storedIds, ...ids])];
    setSelectedIds(() => nextIds);
    trackAssistantEvent('menu_add', { itemCount: additions.length });
    if (!additions.length) return;
    const result = getAssistantResponse('what is in my current plan?', { ...readAssistantContext(pathname), selectedIds: nextIds });
    setMessages(current => [...current, newMessage('assistant', `Added ${additions.length} ${additions.length === 1 ? 'dish' : 'dishes'} to your saved menu selections. They’re ready in your plan.`, { actions: [{ label: 'Open My Plan', type: 'planner', planner: readAssistantContext(pathname).plannerState }, { label: 'Add more dishes', type: 'navigate', href: '/menu' }], data: result.data })]);
  };

  const handleAction = item => {
    trackAssistantEvent('action', { actionType: item.type, label: item.label });
    if (item.type === 'prompt') { sendMessage(item.prompt); return; }
    if (item.type === 'show-more') { sendMessage('Show more results', { searchQuery: item.query, searchFilterType: item.filterType, searchOffset: item.offset, searchLimit: item.limit }); return; }
    if (item.type === 'add-menu-items') { addMenuItems(item.ids || []); return; }
    if (item.type === 'navigate') { window.location.href = item.href; return; }
    if (item.type === 'planner') {
      try {
        const previous = readAssistantContext(pathname).plannerState;
        const next = normalizePlannerState({ ...previous, ...item.planner });
        localStorage.setItem('trishul-planner-state', JSON.stringify(next));
      } catch {}
      trackAssistantEvent('planner_start', { guests: item.planner?.guests, food: item.planner?.food, eventType: item.planner?.eventType });
      window.location.href = '/plan';
      return;
    }
    const context = readAssistantContext(pathname);
    if (item.type === 'whatsapp') {
      trackAssistantEvent('whatsapp');
      handleWhatsAppClick();
      const text = item.message || createWhatsAppMessage(context);
      window.open(`${businessConfig.whatsappUrl}${businessConfig.whatsappUrl.includes('?') ? '&' : '?'}text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
    }
    if (item.type === 'call') {
      trackAssistantEvent('call');
      handleCallClick();
      window.location.href = `tel:${businessConfig.phoneNumbers[0]}`;
    }
  };

  const openPanel = () => {
    setOpen(true);
    trackAssistantEvent('open');
    window.setTimeout(() => document.getElementById('assistant-question')?.focus({ preventScroll: true }), 0);
  };
  const closePanel = () => {
    setOpen(false);
    requestAnimationFrame(() => buttonRef.current?.focus());
  };

  return <div className="assistant-widget">
    <AssistantButton buttonRef={buttonRef} open={open} onClick={open ? closePanel : openPanel} plannerPage={plannerPage}/>
    <AssistantPanel open={open} plannerPage={plannerPage} messages={messages} openingActions={assistantOpeningActions} showOpeningActions={showOpeningActions} onSend={sendMessage} onAction={handleAction} onAddItems={addMenuItems} selectedIds={selectedIds} onClose={closePanel} busy={busy}/>
  </div>;
}