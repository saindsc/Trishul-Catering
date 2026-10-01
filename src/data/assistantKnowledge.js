import { businessConfig, occasionData } from './config';
import { menuSections } from './menuData';
import { plannerOptions, plannerRules, normalizePlannerState, defaultPlannerState } from './plannerRules';
import { standardMenus } from './standardMenus';
import { readMenuSelection } from '../hooks/useMenuSelection';

export const assistantFaq = {
  minimumGuests: `Trishul Caterers currently plans catering from ${plannerRules.guests.min} guests.`,
  vegPricing: `The standard vegetarian planning rate is approximately ₹${standardMenus.veg.costPerPlate} per guest. Final pricing is confirmed directly by the Trishul Caterers team.`,
  nonVegPricing: `The standard non-vegetarian planning rate is approximately ₹${standardMenus.nonveg.costPerPlate} per guest. Final pricing is confirmed directly by the Trishul Caterers team.`,
  mixedPricing: 'There is no official standard mixed-food rate configured. Mixed pricing shown in the planner is demo-only.',
  customMenu: 'Yes. Browse the full Trishul menu, select dishes you like, and take them into the catering planner. Selected dishes are additions to the standard menu baseline.',
  standardMenuItems: 'The standard planning rate is available, but the final standard-menu item list is not configured yet. You can explore the complete menu and choose additions.',
  liveCounters: `The live counter ideas are: ${plannerOptions.liveCounters.join(', ')}. Choose the ideas you are interested in; availability and final selection are confirmed with the Trishul team. Pani Puri can be considered as part of the Chaat counter concept, while Biryani is part of the main catering menu rather than a live counter.`,
  estimates: 'The planner provides an approximate planning estimate using the selected event details. Demo planning values are illustrative, and final pricing and quantities are confirmed directly with the Trishul Caterers team.',
  exactQuote: 'The planner gives an approximate planning estimate. The exact quotation is confirmed directly with the Trishul Caterers team.',
};

const menuItems = menuSections.flatMap(section => section.items.map(item => ({ ...item, sectionId: section.id, sectionName: section.name })));
const menuById = new Map(menuItems.map(item => [item.id, item]));
const normalize = value => value.toLocaleLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim();

export function getMenuSummary() {
  return {
    itemCount: menuItems.length,
    sectionCount: menuSections.length,
    vegetarianCount: menuItems.filter(item => item.type === 'veg').length,
    nonVegetarianCount: menuItems.filter(item => item.type === 'nonveg').length,
    sectionNames: menuSections.map(section => section.name),
  };
}

export function findMenuCategories(query = '') {
  const term = normalize(query);
  if (!term) return menuSections;
  return menuSections.filter(section => normalize(`${section.name} ${section.description || ''}`).includes(term));
}

export function findItemsByType(type, { limit = 6, offset = 0 } = {}) {
  return menuItems.filter(item => item.type === type).slice(offset, offset + limit);
}

export function findItemsByKeyword(query, { type = 'all', limit = 6, offset = 0 } = {}) {
  const term = normalize(query);
  if (!term) return [];
  return menuItems.filter(item => (type === 'all' || item.type === type) && normalize(`${item.name} ${item.category} ${item.sectionName}`).includes(term)).slice(offset, offset + limit);
}

const stopWords = new Set(['a', 'an', 'and', 'are', 'do', 'does', 'for', 'have', 'i', 'in', 'is', 'me', 'my', 'of', 'please', 'show', 'some', 'the', 'there', 'to', 'want', 'what', 'with', 'you', 'your', 'dish', 'dishes', 'menu', 'options', 'option', 'catering', 'cater', 'veg', 'vegetarian', 'nonveg', 'non', 'vegetarian']);
const proteinAliases = {
  chicken: /chicken|naatu kodi|natu kodi/i,
  mutton: /mutton|lamb|keema|kheema|ghost|haleem|paya/i,
  fish: /fish|chepala|chepalu|koraminu|vanjram|palmfret|netthalu/i,
  prawns: /prawn|shrimp|royyalu|royyala/i,
  paneer: /paneer/i,
  crab: /crab|peethala|peethalu/i,
  egg: /egg|kodiguddu/i,
};
const categoryAliases = [
  { pattern: /starter|starters|snack|snacks/, section: /snack|hots|tiffin|chat/i },
  { pattern: /sweet|sweets|dessert|desserts/, section: /sweet|ice cream|pudding/i },
  { pattern: /chinese/, section: /chinese/i },
  { pattern: /biryani|biriyani|pulav|pulao/, section: /biryani|pulav|pulao|rice/i },
  { pattern: /curry|curries/, section: /curry|kurma|gravy/i },
];

export function searchMenu(query, { type = 'all', limit = 5, offset = 0 } = {}) {
  const normalized = normalize(query);
  const words = normalized.split(' ').filter(word => word.length > 1 && !stopWords.has(word));
  const requestedCategory = categoryAliases.find(alias => alias.pattern.test(normalized));
  const requestedProteins = Object.entries(proteinAliases).filter(([, pattern]) => pattern.test(normalized)).map(([name]) => name);
  const candidates = menuItems.filter(item => {
    if (type !== 'all' && item.type !== type) return false;
    const searchable = `${item.name} ${item.category} ${item.sectionName}`;
    if (requestedProteins.some(protein => !proteinAliases[protein].test(searchable))) return false;
    if (requestedCategory && !requestedCategory.section.test(item.sectionName)) return false;
    return true;
  }).map(item => {
    const name = normalize(item.name);
    const category = normalize(`${item.category} ${item.sectionName}`);
    const matchingWords = words.filter(word => name.includes(word) || category.includes(word)).length;
    const score = (name === normalized ? 100 : 0) + (name.includes(normalized) ? 50 : 0) + matchingWords * 8;
    return { item, score };
  }).filter(result => words.length === 0 || result.score > 0 || requestedCategory || requestedProteins.length > 0)
    .sort((left, right) => right.score - left.score || left.item.name.localeCompare(right.item.name));
  return {
    items: candidates.slice(offset, offset + limit).map(result => result.item),
    total: candidates.length,
    offset,
    query,
    type,
  };
}

export function findRequestedMenuItems(message) {
  const normalizedMessage = normalize(message);
  const chunks = normalizedMessage.split(/\band\b|,/).map(chunk => chunk.trim()).filter(Boolean);
  const matches = [];
  for (const item of menuItems) {
    const normalizedName = normalize(item.name);
    const isMentioned = chunks.some(chunk => {
      const words = chunk.split(' ').filter(word => word.length > 1 && !stopWords.has(word));
      const nonVegRequested = /non.?veg/.test(chunk);
      const vegRequested = !nonVegRequested && /\bveg\b|vegetarian/.test(chunk);
      const typeMatches = nonVegRequested ? item.type === 'nonveg' : vegRequested ? item.type === 'veg' : true;
      const terms = words.filter(word => !['veg', 'vegetarian', 'nonveg', 'non'].includes(word));
      const requiresVegInName = /\bveg\b/.test(chunk) && !nonVegRequested;
      return terms.length > 0 && typeMatches && terms.every(word => normalizedName.includes(word)) && (!requiresVegInName || normalizedName.includes('veg'));
    });
    if (isMentioned || normalizedMessage.includes(normalizedName)) matches.push(item);
  }
  return [...new Map(matches.map(item => [item.id, item])).values()];
}

export function readAssistantContext(pathname = typeof window === 'undefined' ? '/' : window.location.pathname) {
  let storedPlanner = {};
  try {
    storedPlanner = JSON.parse(globalThis.localStorage?.getItem('trishul-planner-state') || '{}');
  } catch {
    storedPlanner = {};
  }
  const selectedIds = readMenuSelection();
  const plannerState = normalizePlannerState({ ...defaultPlannerState, ...storedPlanner });
  return {
    pathname,
    plannerState,
    selectedIds,
    selectedItems: selectedIds.map(id => menuById.get(id)).filter(Boolean),
  };
}

export const assistantKnowledge = {
  business: businessConfig,
  occasions: occasionData,
  plannerOptions,
  plannerRules,
  standardMenus,
  menuSections,
  faq: assistantFaq,
};