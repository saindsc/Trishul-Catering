import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, Check, ChefHat, Clock3, MapPin, Minus, Phone, Plus, RotateCcw, Sparkles, Utensils, X } from 'lucide-react';
import { businessConfig } from '../../data/config';
import { calculatePlan, defaultPlannerState, getPlannerSuggestions, normalizePlannerState, plannerOptions, plannerRules } from '../../data/plannerRules';
import { standardMenus } from '../../data/standardMenus';
import { menuSections } from '../../data/menuData';
import { useMenuSelection } from '../../hooks/useMenuSelection';
import { handleCallClick, handleEnquiryStart, handleEnquirySubmit, handleWhatsAppClick } from '../../utils/conversionHandlers';
import { Eyebrow } from '../ui';

const plannerStorageKey = 'trishul-planner-state';
const steps = [
  ['event', 'Event'], ['guests', 'Guests'], ['food', 'Food'], ['menu', 'Menu'], ['style', 'Style'],
  ['location', 'Location'], ['service', 'Service'], ['staff', 'Staff'], ['counters', 'Counters'], ['budget', 'Budget'],
];
const menuById = new Map(menuSections.flatMap(section => section.items.map(item => [item.id, { ...item, category: section.name }])));

function readPlannerState() {
  try {
    return normalizePlannerState(JSON.parse(localStorage.getItem(plannerStorageKey) || '{}'));
  } catch {
    return defaultPlannerState;
  }
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}

function formatKg(value) {
  return value == null ? 'Not selected' : `${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(value)} kg`;
}

function whatsappHref(message) {
  return `${businessConfig.whatsappUrl}${businessConfig.whatsappUrl.includes('?') ? '&' : '?'}text=${encodeURIComponent(message)}`;
}

function plannerMessage(plan, estimate, dishes) {
  const foodLabel = plannerOptions.food.find(option => option.id === plan.food)?.label || 'Both';
  const styleLabel = plannerOptions.styles.find(style => style.id === plan.style)?.label || 'Standard Menu';
  const location = plan.location === 'Other Hyderabad / Surrounding Area' ? plan.customLocation || plan.location : plan.location;
  const counterSummary = plan.counters ? `${plan.counters}${plan.counters === 4 ? '+' : ''}${plan.counterTypes.length ? ` - ${plan.counterTypes.join(', ')}` : ''}` : 'None selected';
  const customSelections = dishes.length ? ['Custom selections:', ...dishes.map(dish => `• ${dish.name}`)] : [];
  return [
    'Hello Trishul Caterers,', '', 'I would like to enquire about catering.',
    `Event: ${plan.eventType}`, `Guests: ${plan.guests}`, `Food preference: ${foodLabel}`,
    `Standard menu rate: ${formatCurrency(estimate.costPerGuest)} per guest${estimate.standardRateDemoOnly ? ' (DEMO)' : ''}`,
    `Menu basis: ${estimate.menuLabel}`, ...customSelections,
    `Approximate cost per guest: ${formatCurrency(estimate.costPerGuest)}${dishes.length > 0 || estimate.customAdjustmentPerGuest > 0 ? '+' : ''}`,
    `Planning style: ${styleLabel}`,
    `Location: ${location}`, `Service duration: ${plan.duration} (${plan.servingTime})`,
    `Live counters: ${counterSummary}`, `Approximate budget: ${plan.budgetEnabled ? formatCurrency(plan.budget) : 'Not set'}`,
    `Estimated total: ${formatCurrency(estimate.low)} – ${formatCurrency(estimate.high)}`,
    '', 'Please contact me with the exact quotation.',
  ].join('\n');
}

function minimumGuestMessage(plan, rawGuests) {
  return [
    'Hello Trishul Caterers,', '', 'I would like to discuss catering for a smaller gathering.',
    `Guests: ${rawGuests || plan.guests}`, `Event: ${plan.eventType}`,
    'Minimum catering requirement is 50 guests.',
    'Please contact our team if you would like to discuss a smaller gathering.',
  ].join('\n');
}

function StepHeading({ number, title, description }) {
  return <div className="planner-step-heading"><span>{String(number).padStart(2, '0')}</span><div><h2>{title}</h2>{description && <p>{description}</p>}</div></div>;
}

function ChoiceButton({ active, children, className = '', ...props }) {
  return <button type="button" className={`planner-choice ${active ? 'is-active' : ''} ${className}`} aria-pressed={active} {...props}>{children}</button>;
}

function PlannerSummary({ plan, estimate, selectedItems, isBelowMinimum, minimumMessage, estimateMessage, breakdownOpen, setBreakdownOpen }) {
  if (isBelowMinimum) return <div className="planner-summary-content planner-minimum-summary">
    <div className="planner-summary-kicker"><span className="planner-pulse"/>MINIMUM REQUIREMENT</div>
    <p className="planner-summary-label">Minimum guest count not reached</p>
    <h2>50 guests minimum</h2>
    <p>Trishul Caterers currently plans catering from 50 guests.</p>
    <p>Please contact our team if you would like to discuss a smaller gathering.</p>
    <a className="planner-whatsapp-button" href={whatsappHref(minimumMessage)} target="_blank" rel="noreferrer" onClick={handleWhatsAppClick}><span>Talk to Trishul on WhatsApp</span><ArrowRight size={17}/></a>
    <a className="planner-call-link" href={`tel:${businessConfig.phoneNumbers[0]}`} onClick={handleCallClick}><Phone size={15}/>Call Trishul Caterers</a>
  </div>;
  const styleName = plannerOptions.styles.find(style => style.id === plan.style)?.label || 'Standard Menu';
  const foodName = plannerOptions.food.find(option => option.id === plan.food)?.label || 'Both';
  const breakdown = [
    ['Food', estimate.food], ['Service', estimate.service], ['Staff', estimate.staff],
    ['Buffet setup', estimate.setup], ['Travel', estimate.travel], ['Live counters', estimate.liveCounters],
  ];
  const budgetCopy = { within: 'Within demo range', near: 'Near your selected budget', above: 'Above your selected budget', 'not-set': 'No budget set' }[estimate.budgetStatus];
  return <div className="planner-summary-content">
    <div className="planner-summary-kicker"><span className="planner-pulse"/>LIVE DEMO ESTIMATE</div>
    <p className="planner-summary-label">Approximate planning estimate</p>
    <div className="planner-summary-menu-basis"><b>{estimate.menuLabel}</b><span>{estimate.standardRateDemoOnly ? 'Mixed menu rate · DEMO' : 'Standard menu baseline'}</span>{selectedItems.length > 0 && <strong>Custom selections · {selectedItems.length} {selectedItems.length === 1 ? 'dish' : 'dishes'}</strong>}</div>
    <div className="planner-cost-per-plate"><span>{estimate.standardRateDemoOnly ? 'Approximate demo cost per guest' : 'Approximate cost per guest'}</span><b>{formatCurrency(estimate.costPerGuest)} <small>/ guest{estimate.standardRateDemoOnly ? ' · DEMO' : ''}</small></b></div>
    {estimate.customAdjustmentPerGuest > 0 && <p className="planner-custom-adjustment">Demo customization adjustment: +{formatCurrency(estimate.customAdjustmentPerGuest)} / guest</p>}
    <div className="planner-total" aria-live="polite"><span key={estimate.low}>{formatCurrency(estimate.low)}</span><i>to</i><span key={estimate.high}>{formatCurrency(estimate.high)}</span></div>
    <p className="planner-total-caption">ESTIMATED TOTAL · {plan.guests.toLocaleString('en-IN')} guests</p>
    <p className="planner-summary-disclaimer">Final pricing and quantities are confirmed directly with the Trishul Caterers team.</p>
    <p className="planner-demo-note">Demo planning values are illustrative and not an official quotation.</p>
    {selectedItems.length > 0 && <div className="planner-summary-selections"><h3>Custom selections <small>{selectedItems.length} {selectedItems.length === 1 ? 'dish' : 'dishes'}</small></h3><ul>{selectedItems.map(dish => <li key={dish.id}>{dish.name}</li>)}</ul></div>}
    <div className={`planner-budget-status planner-budget-status--${estimate.budgetStatus}`}><span>{budgetCopy}</span>{plan.budgetEnabled && <b>{formatCurrency(plan.budget)}</b>}</div>
    <div className="planner-summary-stats">
      <div><span>Guests</span><b key={plan.guests}>{plan.guests.toLocaleString('en-IN')}</b></div>
      <div><span>Menu basis</span><b>{estimate.menuLabel}</b></div>
      <div><span>Food preference</span><b>{foodName}</b></div>
      <div><span>Planning style</span><b>{styleName}</b></div>
    </div>
    <div className="planner-summary-group">
      <h3>Kitchen estimate <small>DEMO</small></h3>
      <dl>
        {estimate.quantities.map(item => <div key={item.label}><dt>{item.label}</dt><dd key={item.value}>{formatKg(item.value)}</dd></div>)}
        <div><dt>Cooking time</dt><dd key={estimate.prepLow}>{estimate.prepLow}–{estimate.prepHigh} hrs</dd></div>
        <div><dt>Estimated cooking fuel</dt><dd key={estimate.fuel}>{estimate.fuel} kg-equivalent</dd></div>
      </dl>
    </div>
    <div className="planner-summary-group">
      <h3>Service &amp; team <small>DEMO</small></h3>
      <dl>
        <div><dt>Cooking staff</dt><dd key={estimate.cookingStaff}>{estimate.cookingStaff}</dd></div>
        <div><dt>Serving staff</dt><dd key={estimate.servingStaff}>{estimate.servingStaff}</dd></div>
        <div><dt>Support staff</dt><dd key={estimate.supportStaff}>{estimate.supportStaff}</dd></div>
        <div><dt>Buffet setup</dt><dd>{plan.buffet ? 'Included · additional demo cost' : 'Not selected'}</dd></div>
        <div><dt>Live counters</dt><dd>{plan.counters ? `${plan.counters}${plan.counters === 4 ? '+' : ''} planned` : 'None planned'}</dd></div>
        {plan.counterTypes.length > 0 && <div><dt>Counter ideas</dt><dd>{plan.counterTypes.join(', ')}</dd></div>}
        <div><dt>Service distance</dt><dd>~{estimate.distanceKm} km · {plan.distance}</dd></div>
      </dl>
    </div>
    <button className="planner-breakdown-toggle" type="button" aria-expanded={breakdownOpen} onClick={() => setBreakdownOpen(!breakdownOpen)}>
      View breakdown <span>{breakdownOpen ? '−' : '+'}</span>
    </button>
    {breakdownOpen && <div className="planner-breakdown">{breakdown.map(([label, amount]) => <div key={label}><span>{label}</span><b>{formatCurrency(amount)}</b></div>)}<p>Illustrative planning amounts only. Final pricing is confirmed with the Trishul Caterers team.</p></div>}
    <a className="planner-whatsapp-button" href={whatsappHref(estimateMessage)} target="_blank" rel="noreferrer" onClick={handleWhatsAppClick}><span>Get Exact Quote on WhatsApp</span><ArrowRight size={17}/></a>
    <a className="planner-call-link" href={`tel:${businessConfig.phoneNumbers[0]}`} onClick={handleCallClick}><Phone size={15}/>Call Trishul Caterers</a>
    <a className="planner-enquiry-link" href="#planner-enquiry" onClick={handleEnquiryStart}>Send Enquiry</a>
  </div>;
}

export function PlannerPage() {
  const [plan, setPlan] = useState(readPlannerState);
  const { selectedIds, setSelectedIds } = useMenuSelection();
  const [guestDraft, setGuestDraft] = useState(String(plan.guests));
  const [activeStep, setActiveStep] = useState(0);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState('');
  const [enquirySent, setEnquirySent] = useState(false);
  const [enquiryError, setEnquiryError] = useState('');
  const { selectedItems, selectedVeg, selectedNonVeg } = useMemo(() => {
    const items = selectedIds.map(id => menuById.get(id)).filter(Boolean);
    return { selectedItems: items, selectedVeg: items.filter(item => item.type === 'veg').length, selectedNonVeg: items.filter(item => item.type === 'nonveg').length };
  }, [selectedIds]);
  const guestDraftNumber = Number(guestDraft);
  const isBelowMinimum = guestDraft.trim() === '' || !Number.isFinite(guestDraftNumber) || guestDraftNumber < plannerRules.guests.min;
  const standardMenu = standardMenus[plan.food] || standardMenus.both;
  const calculatedEstimate = useMemo(() => isBelowMinimum ? null : calculatePlan(plan, selectedItems), [isBelowMinimum, plan, selectedItems]);
  const estimate = calculatedEstimate || { menuLabel: standardMenu.label, menuItems: standardMenu.items, menuDishCount: selectedItems.length, budgetStatus: 'not-set' };
  const suggestions = useMemo(() => isBelowMinimum ? [] : getPlannerSuggestions(plan, selectedItems), [isBelowMinimum, plan, selectedItems]);
  const estimateMessage = useMemo(() => calculatedEstimate ? plannerMessage(plan, calculatedEstimate, selectedItems) : minimumGuestMessage(plan, guestDraft), [calculatedEstimate, plan, selectedItems, guestDraft]);
  const [enquiry, setEnquiry] = useState(() => ({ name: '', phone: '', eventDate: '', message: '', budget: 'not-set' }));

  useEffect(() => {
    try { localStorage.setItem(plannerStorageKey, JSON.stringify(plan)); } catch { /* Storage may be unavailable. */ }
  }, [plan]);

  useEffect(() => {
    setGuestDraft(String(plan.guests));
    setEnquiry(current => ({ ...current, eventType: plan.eventType, location: plan.location === 'Other Hyderabad / Surrounding Area' ? plan.customLocation : plan.location, guests: String(plan.guests), food: plan.food, budget: plan.budgetEnabled ? String(plan.budget) : 'not-set' }));
  }, [plan.eventType, plan.location, plan.customLocation, plan.guests, plan.food, plan.budgetEnabled, plan.budget]);

  useEffect(() => {
    const sections = steps.map(([id]) => document.getElementById(`planner-${id}`)).filter(Boolean);
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible.length) setActiveStep(Number(visible[0].target.dataset.step));
    }, { rootMargin: '-22% 0px -62% 0px' });
    sections.forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const update = (key, value) => setPlan(current => normalizePlannerState({ ...current, [key]: value }));
  const setGuests = value => {
    const draft = String(value);
    setGuestDraft(draft);
    setEnquirySent(false);
    setEnquiryError('');
    const guests = Number(draft);
    if (Number.isInteger(guests) && guests >= plannerRules.guests.min) update('guests', guests);
  };
  const scrollToStep = id => document.getElementById(`planner-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const toggleCounterType = type => setPlan(current => {
    const counterTypes = current.counterTypes.includes(type) ? current.counterTypes.filter(item => item !== type) : [...current.counterTypes, type];
    return normalizePlannerState({ ...current, counterTypes });
  });
  const changeCounters = count => setPlan(current => normalizePlannerState({ ...current, counters: count }));
  const setStaff = (key, value) => setPlan(current => normalizePlannerState({ ...current, staffing: { ...current.staffing, [key]: Number(value) } }));
  const resetPlan = () => { setPlan(defaultPlannerState); setGuestDraft(String(defaultPlannerState.guests)); setConfirmAction(''); setBreakdownOpen(false); };
  const clearMenu = () => { setSelectedIds([]); setConfirmAction(''); };
  const updateEnquiry = (key, value) => { setEnquiry(current => ({ ...current, [key]: value })); setEnquirySent(false); setEnquiryError(''); };
  const submitEnquiry = event => {
    event.preventDefault();
    if (isBelowMinimum) { setEnquiryError('Minimum catering requirement is 50 guests. Please contact our team to discuss a smaller gathering.'); return; }
    if (!enquiry.name.trim()) { setEnquiryError('Enter your name.'); return; }
    if (enquiry.phone.replace(/\D/g, '').length < 10) { setEnquiryError('Enter a phone number with at least 10 digits.'); return; }
    if (!plan.eventType || !enquiry.eventDate || !(enquiry.location || locationLabel).trim() || !plan.guests || !plan.food) { setEnquiryError('Complete the event type, date, location, guest count, and food preference.'); return; }
    setEnquiryError('');
    handleEnquirySubmit(event);
    setEnquirySent(true);
  };
  const enquiryBudget = enquiry.budget === 'custom' ? formatCurrency(Number(enquiry.customBudget) || plan.budget) : enquiry.budget === 'not-set' ? 'Not set' : formatCurrency(Number(enquiry.budget));
  const enquiryMessage = calculatedEstimate ? [
    'Hello Trishul Caterers,', '', 'I would like to enquire about catering.',
    `Name: ${enquiry.name}`, `Phone: ${enquiry.phone}`, `Event: ${plan.eventType}`,
    `Event date: ${enquiry.eventDate}`, `Location: ${enquiry.location || 'Not provided'}`,
    `Guests: ${plan.guests}`, `Food preference: ${plannerOptions.food.find(option => option.id === plan.food)?.label}`,
    `Menu basis: ${standardMenu.label}`,
    ...(selectedItems.length ? ['Custom selections:', ...selectedItems.map(dish => `• ${dish.name}`)] : []),
    `Standard menu rate: ${formatCurrency(estimate.costPerGuest)} per guest${estimate.standardRateDemoOnly ? ' (DEMO)' : ''}`,
    `Approximate cost per guest: ${formatCurrency(estimate.costPerGuest)}${selectedItems.length ? '+' : ''}`,
    `Service duration: ${plan.duration}`, `Serving time: ${plan.servingTime}`,
    `Live counters: ${plan.counters || 'None'}${plan.counterTypes.length ? ` · ${plan.counterTypes.join(', ')}` : ''}`,
    `Approximate budget: ${enquiryBudget}`,
    `Message: ${enquiry.message || 'Please contact me to discuss the details.'}`,
    `Estimated total: ${formatCurrency(estimate.low)} – ${formatCurrency(estimate.high)}`,
    '', 'Please contact me with the exact quotation.',
  ].join('\n') : minimumGuestMessage(plan, guestDraft);
  const conflictingCount = plan.food === 'veg' ? selectedNonVeg : plan.food === 'nonveg' ? selectedVeg : 0;
  const conflictLabel = plan.food === 'veg' ? 'non-vegetarian' : 'vegetarian';
  const locationLabel = plan.location === 'Other Hyderabad / Surrounding Area' ? plan.customLocation || plan.location : plan.location;

  return <main className={`planner-page ${isBelowMinimum ? 'is-below-minimum' : ''}`}>
    <section className="planner-hero">
      <div className="planner-hero-art" aria-hidden="true"/>
      <div className="planner-hero-content"><Eyebrow light>Trishul Caterers · Hyderabad</Eyebrow><h1>Let’s plan<br/><em>your gathering.</em></h1><p>A first sketch of the day, the menu and the details that help you host with ease.</p></div>
      <div className="planner-hero-index"><span>01 — 10</span><b>YOUR EVENT, THOUGHTFULLY PLANNED</b></div>
    </section>

    <section className="planner-notice" aria-label="Estimate disclaimer"><div className="planner-notice-mark"><Sparkles size={19}/></div><div><Eyebrow>Planning tool · Demo values</Eyebrow><h2>Approximate planning estimate</h2><p>Final pricing and quantities are confirmed directly with the Trishul Caterers team. Every figure here is illustrative, not an official quotation.</p></div><span>NOT A QUOTE</span></section>

    <div className="planner-progress-wrap"><div className="planner-progress-line"><span style={{ width: `${((activeStep + 1) / steps.length) * 100}%` }}/></div><div className="planner-step-nav" aria-label="Planner steps">{steps.map(([id, label], index) => <button type="button" key={id} className={activeStep === index ? 'is-active' : index < activeStep ? 'is-complete' : ''} onClick={() => scrollToStep(id)} aria-current={activeStep === index ? 'step' : undefined}><i>{index < activeStep ? <Check size={12}/> : String(index + 1).padStart(2, '0')}</i><span>{label}</span></button>)}</div></div>

    <div className="planner-layout">
      <div className="planner-configuration">
        <section className="planner-step" id="planner-event" data-step="0"><StepHeading number={1} title="What are you celebrating?" description="Start with the occasion. You can refine the details as you go."/><div className="planner-event-grid" role="group" aria-label="Event type">{plannerOptions.events.map((event, index) => <ChoiceButton key={event} active={plan.eventType === event} className="planner-event-choice" onClick={() => update('eventType', event)}><span className="planner-event-no">{String(index + 1).padStart(2, '0')}</span><CalendarDays size={18}/><b>{event}</b>{plan.eventType === event && <Check className="planner-choice-check" size={15}/>}</ChoiceButton>)}</div></section>

        <section className="planner-step" id="planner-guests" data-step="1">
          <StepHeading number={2} title="How many guests?" description="Trishul Caterers plans events from 50 guests. Choose a preset or enter your count."/>
          <div className="planner-guests-control">
            <button type="button" className="planner-round-control" aria-label="Remove 25 guests" onClick={() => setGuests(Math.max(plannerRules.guests.min, plan.guests - 25))}><Minus size={17}/></button>
            <label className="planner-guest-number"><span>GUEST COUNT</span><input type="number" min={plannerRules.guests.min} max={plannerRules.guests.max} step="1" value={guestDraft} aria-label="Number of guests" onChange={event => setGuests(event.target.value)} onBlur={() => { if (guestDraft && Number(guestDraft) >= plannerRules.guests.min) setGuests(guestDraft); }} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }}/></label>
            <button type="button" className="planner-round-control" aria-label="Add 25 guests" onClick={() => setGuests(plan.guests + 25)}><Plus size={17}/></button>
          </div>
          <label className="planner-slider-label" htmlFor="planner-guest-slider"><span>50</span><output>{isBelowMinimum ? `${guestDraft || '50'} guests` : `${plan.guests.toLocaleString('en-IN')} guests`}</output><span>2,000+</span></label>
          <input id="planner-guest-slider" className="planner-range" type="range" min={plannerRules.guests.min} max="2000" step="25" value={Math.min(plan.guests, 2000)} onChange={event => setGuests(event.target.value)} aria-label="Adjust guest count" aria-valuetext={`${plan.guests} guests`}/>
          <div className="planner-preset-row" role="group" aria-label="Guest presets">{plannerOptions.guestPresets.map(count => <ChoiceButton key={count} active={plan.guests === count && !isBelowMinimum} onClick={() => setGuests(count)}>{count === 2000 ? '2,000+' : count}</ChoiceButton>)}</div>
          <p className="planner-field-note">The slider tops out at 2,000; enter a larger custom count above if needed.</p>
          {Number.isFinite(guestDraftNumber) && guestDraftNumber < plannerRules.guests.min && <div className="planner-minimum-inline" role="status"><p><b>Minimum catering requirement is 50 guests.</b><span>Please contact our team if you would like to discuss a smaller gathering.</span></p><div><a href={`tel:${businessConfig.phoneNumbers[0]}`}><Phone size={14}/>Call Trishul</a><a href={whatsappHref(minimumGuestMessage(plan, guestDraft))} target="_blank" rel="noreferrer">WhatsApp Trishul <ArrowRight size={14}/></a></div></div>}
          {guestDraft === '' && <p className="planner-form-error" role="status">Enter at least 50 guests to see an estimate.</p>}
        </section>

        <section className="planner-step" id="planner-food" data-step="2"><StepHeading number={3} title="What will be on the table?" description="Your preference guides a starting estimate. Saved dishes are never removed automatically."/><div className="planner-segmented planner-food-segmented" role="group" aria-label="Food preference">{plannerOptions.food.map(option => <ChoiceButton key={option.id} active={plan.food === option.id} onClick={() => update('food', option.id)}><span className={`planner-food-dot planner-food-dot--${option.id}`}/>{option.label}</ChoiceButton>)}</div>{conflictingCount > 0 && <p className="planner-conflict" role="status"><span>i</span>You have {conflictingCount} {conflictLabel} {conflictingCount === 1 ? 'dish' : 'dishes'} selected while planning a {plannerOptions.food.find(option => option.id === plan.food)?.label} menu. Your selections are kept; remove them only if you choose.</p>}</section>

        <section className="planner-step" id="planner-menu" data-step="3">
          <StepHeading number={4} title="Shape your menu" description="Your standard menu remains the price baseline. Saved dishes add demo adjustments."/>
          <div className="planner-selected-menu-top">
            <div><Utensils size={17}/><b>{standardMenu.label}</b><span>{isBelowMinimum ? '50 guests minimum' : `Base ${formatCurrency(standardMenu.costPerPlate)} / guest${standardMenu.demoOnly ? ' · DEMO' : ''}`}</span></div>
            <a href="/menu">{selectedItems.length ? 'Add more dishes' : 'Customize your menu'} <ArrowRight size={15}/></a>
          </div>
          {selectedItems.length ? <>
            <div className="planner-custom-selection-heading"><b>Custom selections · {selectedItems.length} {selectedItems.length === 1 ? 'dish' : 'dishes'}</b><span>Added to the standard menu basis</span></div>
            <div className="planner-selected-groups">{[...new Set(selectedItems.map(item => item.category))].map(category => <div className="planner-selected-group" key={category}><h3>{category}</h3><ul>{selectedItems.filter(item => item.category === category).map(item => <li key={item.id}><span className={`planner-type-mark planner-type-mark--${item.type}`} aria-label={item.type === 'veg' ? 'Vegetarian' : 'Non-vegetarian'}>{item.type === 'veg' ? '●' : '◆'}</span><span>{item.name}</span><button type="button" aria-label={`Remove ${item.name} from selected menu`} onClick={() => setSelectedIds(current => current.filter(id => id !== item.id))}><X size={15}/></button></li>)}</ul></div>)}</div>
            <div className="planner-menu-total"><span>{selectedItems.length} custom {selectedItems.length === 1 ? 'selection' : 'selections'}</span><button type="button" onClick={() => setConfirmAction('menu')}>Clear selections</button><a href="/menu">Return to menu <ArrowRight size={14}/></a></div>
          </> : <div className="planner-menu-empty"><span className="planner-menu-empty-mark"><Utensils size={20}/></span><div><h3>{standardMenu.label}</h3><p>{isBelowMinimum ? 'Estimates are available from 50 guests.' : `Base rate ${formatCurrency(standardMenu.costPerPlate)} / guest${standardMenu.demoOnly ? ' · demo mixed-food rate' : ''}. Browse the complete menu to customize your selections.`}</p></div><a href="/menu">Customize your menu <ArrowRight size={15}/></a></div>}
        </section>

        <section className="planner-step" id="planner-style" data-step="4"><StepHeading number={5} title="Set the menu balance" description="Planning style is a demo selector for variety and estimate calculations, not an official package."/><p className="planner-overline">PLANNING STYLE · DEMO</p><div className="planner-style-grid" role="group" aria-label="Planning style">{plannerOptions.styles.map((style, index) => <ChoiceButton key={style.id} active={plan.style === style.id} className="planner-style-choice" onClick={() => update('style', style.id)}><span className="planner-style-mark">0{index + 1}</span><b>{style.label}</b><small>{['Fewer selections, a lighter starting point.', 'A balanced spread to build from.', 'More variety for a larger celebration.'][index]}</small><span className="planner-style-selected">{plan.style === style.id ? <Check size={14}/> : 'Select'}</span></ChoiceButton>)}</div></section>

        <section className="planner-step" id="planner-location" data-step="5"><StepHeading number={6} title="Where will you gather?" description="Choose an area and a demo service-distance band. Neither one represents a confirmed service limit."/><label className="planner-input-label" htmlFor="planner-location">Event location</label><div className="planner-select-wrap"><MapPin size={17}/><select id="planner-location" value={plan.location} onChange={event => update('location', event.target.value)}>{plannerOptions.locations.map(location => <option key={location}>{location}</option>)}</select></div>{plan.location === 'Other Hyderabad / Surrounding Area' && <label className="planner-input-label planner-custom-location">Area or locality<input value={plan.customLocation} onChange={event => update('customLocation', event.target.value)} placeholder="Enter your area"/></label>}<p className="planner-overline">APPROXIMATE SERVICE DISTANCE · DEMO</p><div className="planner-distance-grid" role="group" aria-label="Approximate service distance">{plannerOptions.distances.map(distance => <ChoiceButton key={distance} active={plan.distance === distance} onClick={() => update('distance', distance)}>{distance}</ChoiceButton>)}</div><p className="planner-field-note">Actual availability and service radius are confirmed directly with the team.</p></section>

        <section className="planner-step" id="planner-service" data-step="6"><StepHeading number={7} title="Set the service rhythm" description="A rough service window helps shape the demo staffing and estimate."/><p className="planner-overline">HOW LONG WILL CATERING SERVICE BE NEEDED?</p><div className="planner-duration-grid" role="group" aria-label="Service duration">{plannerOptions.durations.map(duration => <ChoiceButton key={duration} active={plan.duration === duration} onClick={() => update('duration', duration)}><Clock3 size={16}/>{duration}</ChoiceButton>)}</div><p className="planner-input-label">Serving time</p><div className="planner-serving-grid" role="group" aria-label="Serving time">{plannerOptions.servingTimes.map(time => <ChoiceButton key={time} active={plan.servingTime === time} onClick={() => update('servingTime', time)}>{time}</ChoiceButton>)}</div>{plan.servingTime === 'Custom' && <label className="planner-input-label planner-custom-location">Preferred serving time<input type="time" value={plan.customServingTime || ''} onChange={event => update('customServingTime', event.target.value)}/></label>}</section>

        <section className="planner-step" id="planner-staff" data-step="7"><StepHeading number={8} title="Plan the team" description="Staff figures are illustrative planning estimates, not confirmed requirements."/><div className="planner-segmented planner-staff-mode" role="group" aria-label="Staffing calculation mode"><ChoiceButton active={plan.staffMode === 'automatic'} onClick={() => update('staffMode', 'automatic')}>Automatic calculation</ChoiceButton><ChoiceButton active={plan.staffMode === 'manual'} onClick={() => update('staffMode', 'manual')}>Manual adjustment</ChoiceButton></div><div className="planner-staff-grid">{[['cooking', 'Cooking staff'], ['serving', 'Serving staff'], ['support', 'Support staff']].map(([key, label]) => <div className="planner-staff-control" key={key}><span><ChefHat size={16}/>{label}</span>{plan.staffMode === 'automatic' ? <output>{estimate[`${key}Staff`]}</output> : <div><button type="button" aria-label={`Reduce ${label}`} onClick={() => setStaff(key, Math.max(0, Number(plan.staffing[key]) - 1))}><Minus size={15}/></button><output>{plan.staffing[key]}</output><button type="button" aria-label={`Add ${label}`} onClick={() => setStaff(key, Number(plan.staffing[key]) + 1)}><Plus size={15}/></button></div>}</div>)}</div><p className="planner-field-note">Manual numbers update the demonstration staffing cost only.</p></section>

        <section className="planner-step" id="planner-counters" data-step="8"><StepHeading number={9} title="Buffet &amp; live counters" description="These are planning options only; ask the team which counters are available for your event."/><div className="planner-buffet-row"><div><b>Buffet setup</b><span>Demo setup amount is shown in the estimate breakdown.</span></div><div className="planner-segmented" role="group" aria-label="Buffet setup"><ChoiceButton active={plan.buffet} onClick={() => update('buffet', true)}>Yes</ChoiceButton><ChoiceButton active={!plan.buffet} onClick={() => update('buffet', false)}>No</ChoiceButton></div></div><p className="planner-overline">NUMBER OF LIVE COUNTERS</p><div className="planner-counter-count" role="group" aria-label="Number of live counters">{[0, 1, 2, 3, 4].map(count => <ChoiceButton key={count} active={plan.counters === count} onClick={() => changeCounters(count)}>{count === 4 ? '4+' : count}</ChoiceButton>)}</div><p className="planner-overline">COUNTER IDEAS · AVAILABILITY TO BE CONFIRMED</p><div className="planner-counter-types" role="group" aria-label="Live counter ideas">{plannerOptions.liveCounters.map(type => <ChoiceButton key={type} active={plan.counterTypes.includes(type)} onClick={() => toggleCounterType(type)}>{plan.counterTypes.includes(type) && <Check size={13}/>} {type}</ChoiceButton>)}</div><p className="planner-field-note">Choose any ideas you’re interested in. {plan.counterTypes.length ? `${plan.counterTypes.length} ${plan.counterTypes.length === 1 ? 'idea' : 'ideas'} shortlisted for ${plan.counters || 'no'} planned ${plan.counters === 1 ? 'counter' : 'counters'}.` : 'Availability and final selection will be confirmed with the team.'}</p></section>

        <section className="planner-step" id="planner-budget" data-step="9"><StepHeading number={10} title="Set a budget guide" description="This comparison is a planning signal only, never a guaranteed quotation."/><div className="planner-budget-intro"><span>Have a budget in mind?</span><div className="planner-segmented" role="group" aria-label="Set an approximate budget"><ChoiceButton active={plan.budgetEnabled} onClick={() => update('budgetEnabled', true)}>Yes, set one</ChoiceButton><ChoiceButton active={!plan.budgetEnabled} onClick={() => update('budgetEnabled', false)}>Not yet</ChoiceButton></div></div>{plan.budgetEnabled && <><p className="planner-overline">APPROXIMATE BUDGET · DEMO</p><div className="planner-budget-grid" role="group" aria-label="Budget presets">{plannerOptions.budgets.map(budget => <ChoiceButton key={budget} active={plan.budgetOption !== 'custom' && plan.budget === budget} onClick={() => setPlan(current => normalizePlannerState({ ...current, budget, budgetOption: String(budget) }))}>{budget === 300000 ? '₹3,00,000+' : formatCurrency(budget)}</ChoiceButton>)}<ChoiceButton active={plan.budgetOption === 'custom'} onClick={() => setPlan(current => normalizePlannerState({ ...current, budgetOption: 'custom', budget: current.budgetOption === 'custom' ? current.budget : 300000 }))}>Custom</ChoiceButton></div>{plan.budgetOption === 'custom' && <label className="planner-input-label">Your approximate budget<input type="number" min="1" step="5000" value={plan.budget} onChange={event => update('budget', event.target.value)} /></label>}<p className={`planner-budget-result planner-budget-result--${estimate.budgetStatus}`} role="status">{estimate.budgetStatus === 'within' ? 'This setup appears within the demo budget range.' : estimate.budgetStatus === 'above' ? 'This setup appears above the selected demo budget.' : 'This setup is near the selected demo budget.'}</p></>}</section>

        <section className="planner-suggestions" aria-live="polite"><div className="planner-suggestions-title"><Sparkles size={18}/><div><span>A little menu guidance</span><small>PLANNING SUGGESTIONS</small></div></div>{suggestions.length ? <ul>{suggestions.map(suggestion => <li key={suggestion}>{suggestion}</li>)}</ul> : <p>Your current shortlist is taking shape. The Trishul team can help tune it to your gathering.</p>}</section>

        <section className="planner-enquiry" id="planner-enquiry"><div className="planner-enquiry-heading"><Eyebrow>Take the next step</Eyebrow><h2>Let’s talk about<br/><em>your occasion.</em></h2><p>Share the details that are ready. Your enquiry stays on this device until you choose to send it through WhatsApp.</p></div>{enquirySent ? <div className="planner-enquiry-success" role="status"><span><Check size={19}/></span><div><h3>Your enquiry is ready.</h3><p>Review the details and continue to WhatsApp.</p><a href={whatsappHref(enquiryMessage)} target="_blank" rel="noreferrer" onClick={handleWhatsAppClick}>Continue to WhatsApp <ArrowRight size={15}/></a><a href={`tel:${businessConfig.phoneNumbers[0]}`} onClick={handleCallClick}>Call Trishul Caterers <Phone size={14}/></a></div><button type="button" onClick={() => setEnquirySent(false)} aria-label="Edit enquiry"><X size={16}/></button></div> : <form className="planner-enquiry-form" noValidate onSubmit={submitEnquiry}>
          <label>Name<input required autoComplete="name" value={enquiry.name || ''} onChange={event => updateEnquiry('name', event.target.value)} placeholder="Your name"/></label>
          <label>Phone<input required type="tel" autoComplete="tel" inputMode="tel" value={enquiry.phone || ''} onChange={event => updateEnquiry('phone', event.target.value)} placeholder="Your phone number"/></label>
          <label>Event type<select required value={plan.eventType} onChange={event => update('eventType', event.target.value)}>{plannerOptions.events.map(event => <option key={event}>{event}</option>)}</select></label>
          <label>Event date<input type="date" required value={enquiry.eventDate || ''} onChange={event => updateEnquiry('eventDate', event.target.value)}/></label>
          <label>Location<input required value={enquiry.location || locationLabel} onChange={event => updateEnquiry('location', event.target.value)} placeholder="Event area"/></label>
          <label>Number of guests<input required type="number" min={plannerRules.guests.min} max={plannerRules.guests.max} value={guestDraft} onChange={event => setGuests(event.target.value)}/></label>
          <label>Food preference<select required value={plan.food} onChange={event => update('food', event.target.value)}>{plannerOptions.food.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
          <label>Approximate budget<select value={enquiry.budget || 'not-set'} onChange={event => updateEnquiry('budget', event.target.value)}><option value="not-set">No set budget</option>{plannerOptions.budgets.map(budget => <option key={budget} value={budget}>{formatCurrency(budget)}{budget === 300000 ? '+' : ''}</option>)}</select></label>
          <label className="planner-enquiry-message">Message<textarea rows="4" value={enquiry.message || ''} onChange={event => updateEnquiry('message', event.target.value)} placeholder="Anything else you would like us to know?"/></label>
          {enquiryError && <p className="planner-form-error" role="alert">{enquiryError}</p>}
          <div className="planner-form-submit"><p>Your details are not submitted to a server. The next step opens WhatsApp for you to review.</p><button className="planner-submit-button" type="submit">Prepare enquiry <ArrowRight size={16}/></button></div>
        </form>}</section>

        <div className="planner-end-actions"><button type="button" onClick={() => setConfirmAction('reset')}><RotateCcw size={15}/>Start over</button><a href="/menu">Return to menu <ArrowRight size={15}/></a></div>
      </div>

      <aside className="planner-summary-sticky" aria-label={isBelowMinimum ? 'Minimum guest requirement' : 'Live planning estimate'}><PlannerSummary plan={plan} estimate={estimate} selectedItems={selectedItems} isBelowMinimum={isBelowMinimum} minimumMessage={estimateMessage} estimateMessage={estimateMessage} breakdownOpen={breakdownOpen} setBreakdownOpen={setBreakdownOpen}/></aside>
    </div>

    <div className={`planner-mobile-summary ${mobileSummaryOpen ? 'is-open' : ''}`}>
      {mobileSummaryOpen && <div className="planner-mobile-drawer"><PlannerSummary plan={plan} estimate={estimate} selectedItems={selectedItems} isBelowMinimum={isBelowMinimum} minimumMessage={estimateMessage} estimateMessage={estimateMessage} breakdownOpen={breakdownOpen} setBreakdownOpen={setBreakdownOpen}/></div>}
      <button className="planner-mobile-total" type="button" aria-expanded={mobileSummaryOpen} onClick={() => setMobileSummaryOpen(!mobileSummaryOpen)}><span><small>{isBelowMinimum ? 'MINIMUM REQUIREMENT' : 'ESTIMATED TOTAL'}</small><b>{isBelowMinimum ? '50 guests minimum' : `${formatCurrency(estimate.low)} – ${formatCurrency(estimate.high)}`}</b><small className="planner-mobile-per-plate">{isBelowMinimum ? 'Minimum guest count not reached' : `${formatCurrency(estimate.costPerGuest)} / guest · ${estimate.menuLabel}`}</small></span><span>{mobileSummaryOpen ? 'Close' : 'Details'}</span></button>
      <a className="planner-mobile-whatsapp" href={whatsappHref(estimateMessage)} target="_blank" rel="noreferrer" aria-label="Get exact quote on WhatsApp" onClick={handleWhatsAppClick}><ArrowRight size={19}/></a>
    </div>

    {confirmAction && <div className="planner-modal-backdrop"><div className="planner-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="planner-confirm-title" aria-describedby="planner-confirm-copy"><span className="planner-modal-icon"><RotateCcw size={18}/></span><h2 id="planner-confirm-title">{confirmAction === 'reset' ? 'Start a fresh plan?' : 'Clear saved dishes?'}</h2><p id="planner-confirm-copy">{confirmAction === 'reset' ? 'Your planner settings will reset. Your saved menu selections will stay.' : 'This removes every dish from your saved menu. You can add them again from the menu page.'}</p><div><button type="button" onClick={() => setConfirmAction('')}>Keep editing</button><button type="button" onClick={confirmAction === 'reset' ? resetPlan : clearMenu}>{confirmAction === 'reset' ? 'Reset planner' : 'Clear saved menu'}</button></div></div></div>}
  </main>;
}