import { assistantFaq, findRequestedMenuItems, getMenuSummary, searchMenu } from '../data/assistantKnowledge';
import { businessConfig, occasionData } from '../data/config';
import { plannerOptions, plannerRules } from '../data/plannerRules';
import { standardMenus } from '../data/standardMenus';

export const assistantWelcome = `Namaste! 👋\nI'm the Trishul Catering Assistant.\n\nI can help you explore the menu, understand our catering options, and start planning your event.`;

export const assistantOpeningActions = [
  { label: 'What do you cater for?', type: 'prompt', prompt: 'What do you cater for?' },
  { label: 'Show vegetarian options', type: 'prompt', prompt: 'Show vegetarian options' },
  { label: 'Show non-vegetarian options', type: 'prompt', prompt: 'Show non-vegetarian options' },
  { label: 'How much does catering cost?', type: 'prompt', prompt: 'How much does catering cost?' },
  { label: 'Plan for my event', type: 'prompt', prompt: 'I want to plan an event' },
  { label: 'Talk to Trishul', type: 'prompt', prompt: 'Talk to Trishul' },
];

const normalize = value => value.toLocaleLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim();
const action = (label, type, extra = {}) => ({ label, type, ...extra });
const response = (message, intent, actions = [], data = null) => ({ message, intent, actions, data });
const contactActions = (message = '') => [
  action('Ask Trishul on WhatsApp', 'whatsapp', { message }),
  action('Call Trishul', 'call'),
];

function foodTypeFromText(text) {
  if (/both|veg\s*(and|\+)\s*non.?vegetarian|veg\s*(and|\+)\s*non.?veg|non.?vegetarian\s*(and|\+)\s*veg|non.?veg\s*(and|\+)\s*veg/.test(text)) return 'both';
  if (/non.?vegetarian|non.?veg|chicken|mutton|fish|prawn|crab|egg\b/.test(text)) return 'nonveg';
  if (/vegetarian|\bveg\b/.test(text)) return 'veg';
  return null;
}

function eventFromText(text) {
  const entries = [
    [/pre.?wedding/, 'Pre-Wedding'], [/wedding|marriage/, 'Wedding'], [/birthday|birth day/, 'Birthday'],
    [/corporate|office event|company event/, 'Corporate Event'], [/political/, 'Political Event'],
    [/engagement/, 'Engagement'], [/religious|temple|function prayer/, 'Religious Function'],
    [/get.?together/, 'Get-Together'], [/house function|housewarming/, 'House Function'],
  ];
  return entries.find(([pattern]) => pattern.test(text))?.[1] || null;
}

function guestCountFromText(text) {
  const match = text.match(/\b(\d{1,5})\s*(?:guests?|people|persons?|pax)\b/) || text.match(/\bfor\s+(\d{1,5})\b/);
  return match ? Number(match[1]) : null;
}

function plannerAction(context, { guests, food, eventType } = {}) {
  const current = context.plannerState || {};
  return action(guests ? `Plan ${guests} Guests` : food ? `Start ${food === 'veg' ? 'Vegetarian' : food === 'nonveg' ? 'Non-Vegetarian' : 'Mixed'} Plan` : 'Plan My Catering', 'planner', {
    planner: { guests: guests || current.guests, food: food || current.food, eventType: eventType || current.eventType },
  });
}

function standardPricingMessage(food) {
  if (food === 'veg') return `${assistantFaq.vegPricing} The minimum catering requirement is ${plannerRules.guests.min} guests.`;
  if (food === 'nonveg') return `${assistantFaq.nonVegPricing} The minimum catering requirement is ${plannerRules.guests.min} guests.`;
  return `${assistantFaq.vegPricing}\n\n${assistantFaq.nonVegPricing}\n\n${assistantFaq.mixedPricing} The minimum catering requirement is ${plannerRules.guests.min} guests.`;
}

function menuResponse(message, context, { type = 'all', query = message, offset = 0, limit = 5 } = {}) {
  const result = searchMenu(query, { type, offset, limit });
  if (!result.total) return response('I could not find a matching dish in the configured menu. You can browse the complete menu or ask the Trishul team.', 'menu-search-empty', [action('View full menu', 'navigate', { href: '/menu' }), ...contactActions()]);
  const foodLabel = type === 'veg' ? 'vegetarian' : type === 'nonveg' ? 'non-vegetarian' : '';
  const lead = foodLabel ? `I found ${result.total} ${foodLabel} menu ${result.total === 1 ? 'option' : 'options'}` : `I found ${result.total} menu ${result.total === 1 ? 'match' : 'matches'}`;
  const actions = [action('Add these to my plan', 'add-menu-items', { ids: result.items.map(item => item.id) }), action('View full menu', 'navigate', { href: '/menu' })];
  if (offset + result.items.length < result.total) actions.push(action('Show more', 'show-more', { query, filterType: type, offset: offset + limit, limit }));
  return response(`${lead}. Here are a few from the Trishul menu:`, 'menu-search', actions, { items: result.items, total: result.total });
}

function contextualResponse(context) {
  const count = context.selectedItems?.length || 0;
  if (context.pathname === '/menu') return response(count ? `You currently have ${count} ${count === 1 ? 'dish' : 'dishes'} shortlisted. You can add more from the menu or continue to your plan.` : 'You are browsing the Trishul menu. Save dishes you like and I can help add them to your plan.', 'menu-context', [action('Open My Plan', 'navigate', { href: '/plan' }), action('Search the menu', 'prompt', { prompt: 'Show vegetarian options' })]);
  const plan = context.plannerState || {};
  const foodLabel = plannerOptions.food.find(option => option.id === plan.food)?.label || 'Both';
  const styleLabel = plannerOptions.styles.find(option => option.id === plan.style)?.label || 'Standard Menu';
  const standardMenu = standardMenus[plan.food] || standardMenus.both;
  const selectedSummary = count ? `Your selected dishes include ${context.selectedItems.slice(0, 3).map(item => item.name).join(', ')}${count > 3 ? ', and more' : ''}. ` : '';
  return response(`You are currently planning for ${plan.guests} guests with ${foodLabel.toLowerCase()} catering using the ${styleLabel} planning style. ${count ? `${count} ${count === 1 ? 'dish is' : 'dishes are'} selected. ` : ''}The menu basis is ${standardMenu.label}${standardMenu.demoOnly ? ' (demo mixed-food rate)' : ` at approximately ₹${standardMenu.costPerPlate} per guest`}. ${selectedSummary}`, 'planner-context', [action('Explore menu', 'navigate', { href: '/menu' }), action('Get exact quote', 'whatsapp')]);
}

export function getAssistantResponse(message, context = {}) {
  const text = normalize(message);
  if (!text) return response('Ask me about the Trishul menu, catering rates, your planner, or contacting the team.', 'empty', []);
  if (context.searchQuery) return menuResponse(message, context, { type: context.searchFilterType || 'all', query: context.searchQuery, offset: context.searchOffset || 0, limit: context.searchLimit || 5 });

  if (/what do you cater for|what occasions|which occasions|events do you cater/.test(text)) {
    const names = occasionData.map(occasion => occasion.name);
    return response(`Trishul Caterers plans food for ${names.slice(0, -1).join(', ')}, and ${names.at(-1)}. The team can help shape the menu around your event.`, 'occasions', [plannerAction(context), action('Explore menu', 'navigate', { href: '/menu' }), action('Talk to Trishul', 'whatsapp')], { occasions: names });
  }

  if (/what is in my plan|what have i selected|my current plan|current plan|how many dishes/.test(text)) return contextualResponse(context);
  if (/talk to trishul|contact (the )?team|speak to (someone|the team)|call trishul/.test(text)) return response('You can continue this enquiry with the Trishul team on WhatsApp or call the primary business number.', 'contact', contactActions());

  if (/exact|final price|guaranteed|quotation/.test(text) && /price|cost|quote|quotation|estimate/.test(text)) {
    return response(assistantFaq.exactQuote, 'exact-quote', [action('Get Exact Quote', 'whatsapp'), action('Call Trishul', 'call')]);
  }

  if (/standard menu|comes in the menu|included in the menu|what comes/.test(text)) return response(`${assistantFaq.standardMenuItems} The full ${getMenuSummary().itemCount}-item menu is available to browse.`, 'standard-menu-items', [action('Explore Menu', 'navigate', { href: '/menu' }), plannerAction(context)]);
  if (/choose my own|custom menu|customise|customize|add dishes|select dishes/.test(text)) return response(assistantFaq.customMenu, 'custom-menu', [action('Explore Menu', 'navigate', { href: '/menu' }), plannerAction(context)]);
  if (/(pani puri|pani poori)/.test(text) && /live counter|counter/.test(text)) return response('Pani Puri is not a separate live counter. It can be considered as part of the Chaat counter concept, subject to availability and final confirmation with the Trishul team.', 'live-counter-detail', [plannerAction(context), action('Ask Trishul on WhatsApp', 'whatsapp')]);
  if (/(biryani|biriyani)/.test(text) && /live counter|counter/.test(text)) return response('No. Biryani is part of the Trishul catering menu and main-course offering rather than a live counter.', 'live-counter-detail', [plannerAction(context), action('Ask Trishul on WhatsApp', 'whatsapp')]);
  if (/live counter|counter ideas|counters/.test(text)) return response(assistantFaq.liveCounters, 'live-counters', [plannerAction(context), action('Ask Trishul on WhatsApp', 'whatsapp')]);

  const mentionsNonVegRate = /non.?vegetarian|non.?veg/.test(text);
  const mentionsVegRate = !mentionsNonVegRate && /vegetarian|\bveg\b/.test(text);
  const mentionsBothRates = /both|mixed|veg\s+and\s+non.?vegetarian|veg\s+and\s+non.?veg|non.?vegetarian\s+and\s+veg|non.?veg\s+and\s+veg/.test(text);
  if (/price|cost|rate|how much|pricing/.test(text)) {
    const food = mentionsBothRates || (!mentionsVegRate && !mentionsNonVegRate) ? 'both' : mentionsNonVegRate ? 'nonveg' : 'veg';
    return response(standardPricingMessage(food), 'pricing', [plannerAction(context, { food }), action('Get Exact Quote', 'whatsapp')]);
  }

  const guestCount = guestCountFromText(text);
  const food = foodTypeFromText(text);
  const eventType = eventFromText(text);
  const hasPlanIntent = /\b(plan|planning|catering|event|people|guests)\b/.test(text);
  const asksForFoodPlan = Boolean(food && /\bwant\b/.test(text) && !/starter|snack|dish|menu|biryani|biriyani|pulav|pulao|sweet|dessert|option/.test(text));
  const asksToPlan = hasPlanIntent || asksForFoodPlan;
  if (guestCount !== null && guestCount < plannerRules.guests.min) {
    return response(`${assistantFaq.minimumGuests} Would you like to discuss a smaller gathering with the team?`, 'minimum-guests', contactActions(`I would like to discuss a smaller gathering of ${guestCount} people.`));
  }
  if (asksToPlan && (guestCount !== null || eventType || food)) {
    const eventLabels = { Wedding: 'a wedding', 'Pre-Wedding': 'a pre-wedding event', Birthday: 'a birthday', 'Corporate Event': 'a corporate event', 'Political Event': 'a political event', Engagement: 'an engagement', 'Religious Function': 'a religious function', 'Get-Together': 'a get-together', 'House Function': 'a house function' };
    const planDescription = eventType ? eventLabels[eventType] : guestCount ? 'a catering plan' : 'a catering plan';
    const guestText = guestCount ? ` for ${guestCount} guests` : '';
    const foodText = food ? ` with ${food === 'veg' ? 'vegetarian' : food === 'nonveg' ? 'non-vegetarian' : 'mixed'} catering` : '';
    const pricing = food
      ? ` ${food === 'both' ? assistantFaq.mixedPricing : `The standard baseline is approximately ₹${standardMenus[food].costPerPlate} per guest.`}`
      : ` Standard baselines are approximately ₹${standardMenus.veg.costPerPlate} per guest for Vegetarian and ₹${standardMenus.nonveg.costPerPlate} per guest for Non-Vegetarian; mixed-food pricing is demo-only.`;
    return response(`Absolutely. Let's set up ${planDescription}${guestText}${foodText}. I can open a plan with those details.${pricing} The minimum is ${plannerRules.guests.min} guests; final pricing is confirmed by the Trishul team.`, 'planner-handoff', [plannerAction(context, { guests: guestCount, food, eventType }), action('Ask Something Else', 'prompt', { prompt: 'What do you cater for?' }), action('Talk to Trishul', 'whatsapp')]);
  }

  if (/where|service area|location|gachibowli|kukAtpally|hyderabad|secunderabad|shamshabad/.test(text)) {
    const matchedLocation = plannerOptions.locations.find(location => text.includes(normalize(location)));
    if (matchedLocation) return response(`${matchedLocation} appears as a location option in the planner. I can’t confirm service availability from the configured information; please confirm it with the Trishul team.`, 'service-area', contactActions());
    if (text.includes(normalize(businessConfig.location))) return response(`The configured business location is ${businessConfig.location}. For service availability at your event location, please confirm with the Trishul team.`, 'business-location', contactActions());
  }

  if (/non.?vegetarian options|show non.?vegetarian|non.?vegetarian dishes|non.?veg options|show non.?veg|non.?veg dishes/.test(text)) return menuResponse(message, context, { type: 'nonveg', query: 'nonveg', limit: 5 });
  if (/vegetarian options|show veg|veg dishes/.test(text)) return menuResponse(message, context, { type: 'veg', query: 'veg', limit: 5 });

  const requestedItems = findRequestedMenuItems(message);
  if (requestedItems.length > 0 && /want|add|like|select|choose|plan|my menu/.test(text)) {
    const names = requestedItems.map(item => item.name).join(', ');
    return response(`I found these dishes in the Trishul menu: ${names}. I can add them to your saved menu selections; they’ll remain additions to the standard menu baseline.`, 'menu-add', [action('Add these to my plan', 'add-menu-items', { ids: requestedItems.map(item => item.id) }), action('View full menu', 'navigate', { href: '/menu' })], { items: requestedItems, total: requestedItems.length });
  }

  const itemQuestion = /menu|dish|dishes|have|show|find|starter|snack|sweet|dessert|biryani|biriyani|rice|paneer|chicken|mutton|fish|prawn|crab|egg|chinese|halwa|curry/.test(text);
  if (itemQuestion) {
    const requestedType = foodTypeFromText(text);
    const type = requestedType === 'veg' && !/non.?veg/.test(text) ? 'veg' : requestedType === 'nonveg' ? 'nonveg' : 'all';
    const results = menuResponse(message, context, { type, query: message });
    if (results.intent === 'menu-search' && /paneer|manchuria/.test(text) && results.data?.items.length) {
      const first = results.data.items[0];
      if (/is .* vegetarian|vegetarian\?/.test(text)) return response(`${first.name} is listed as ${first.type === 'veg' ? 'vegetarian' : 'non-vegetarian'} in the Trishul menu.`, 'dish-type', [action('View full menu', 'navigate', { href: '/menu' }), action('Explore menu', 'prompt', { prompt: `Show ${first.category}` })], { items: [first], total: 1 });
    }
    return results;
  }

  if (/plan|planner|estimate|guests|my event/.test(text)) return response(assistantFaq.estimates, 'planner-help', [plannerAction(context), action('Explore menu', 'navigate', { href: '/menu' }), action('Get Exact Quote', 'whatsapp')]);
  return response("I don't have that detail configured yet. Would you like to speak directly with Trishul?", 'fallback', contactActions());
}

export async function respondWithLocalAssistant(message, context) {
  return getAssistantResponse(message, context);
}