function dispatchConversion(action, event, metadata = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('trishul:conversion', {
    detail: { action, destination: event?.currentTarget?.href || '', ...metadata },
  }));
}

export function trackAssistantEvent(eventName, metadata = {}) {
  dispatchConversion(`assistant_${eventName}`, undefined, metadata);
}

export function handleWhatsAppClick(event) {
  dispatchConversion('whatsapp_click', event);
}

export function handleCallClick(event) {
  dispatchConversion('call_click', event);
}

export function handlePlannerStart(event) {
  dispatchConversion('planner_start', event);
}

export function handleEnquiryStart(event) {
  dispatchConversion('enquiry_start', event);
}

export function handleEnquirySubmit(event) {
  dispatchConversion('enquiry_submit', event);
}