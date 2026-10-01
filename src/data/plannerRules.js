import { standardMenus } from './standardMenus';

export const plannerOptions = {
  events: ['Wedding', 'Pre-Wedding', 'Birthday', 'Corporate Event', 'Political Event', 'Engagement', 'Religious Function', 'Get-Together', 'House Function', 'Custom Event'],
  guestPresets: [50, 100, 150, 250, 300, 500, 750, 1000, 1500, 2000],
  food: [{ id: 'veg', label: 'Vegetarian' }, { id: 'nonveg', label: 'Non-Vegetarian' }, { id: 'both', label: 'Both' }],
  styles: [{ id: 'light', label: 'Light Menu' }, { id: 'standard', label: 'Standard Menu' }, { id: 'large', label: 'Large Celebration Menu' }],
  locations: ['Hyderabad', 'Shamshabad', 'Secunderabad', 'Rangareddy', 'Gachibowli', 'Kukatpally', 'LB Nagar', 'Shadnagar', 'Other Hyderabad / Surrounding Area'],
  distances: ['0–10 km', '10–25 km', '25–50 km', '50–100 km', '100+ km'],
  durations: ['2 hours', '4 hours', '6 hours', '8 hours', 'Full day'],
  servingTimes: ['Lunch', 'Dinner', 'Breakfast', 'Evening', 'Custom'],
  liveCounters: ['Dosa', 'Chaat', 'Tandoor', 'Dessert', 'Ice Cream', 'Beverage / Mocktail', 'Chinese', 'Custom'],
  budgets: [50000, 100000, 150000, 200000, 300000],
};

export const defaultPlannerState = {
  eventType: 'Wedding',
  guests: 250,
  food: 'both',
  style: 'standard',
  location: 'Kukatpally',
  customLocation: '',
  distance: '0–10 km',
  duration: '4 hours',
  servingTime: 'Lunch',
  staffMode: 'automatic',
  staffing: { cooking: 3, serving: 4, support: 2 },
  buffet: true,
  counters: 0,
  counterTypes: [],
  budgetEnabled: false,
  budget: 100000,
};

export const plannerRules = {
  demoOnly: true,
  guests: { min: 50, max: 10000, step: 25 },
  customMenuPricing: {
    dishAllowance: { light: 10, standard: 14, large: 18 },
    perExtraDishPerPlate: 5,
    specialItemPerPlate: {},
  },
  additionalServiceCharges: { perGuest: 0 },
  styles: {
    light: { multiplier: 0.9, quantityMultiplier: 0.85, defaultDishes: 8, dishAllowance: 10 },
    standard: { multiplier: 1, quantityMultiplier: 1, defaultDishes: 12, dishAllowance: 14 },
    large: { multiplier: 1.18, quantityMultiplier: 1.15, defaultDishes: 18, dishAllowance: 18 },
  },
  eventMultiplier: { Wedding: 1.12, 'Pre-Wedding': 1.06, Birthday: 0.98, 'Corporate Event': 1.04, 'Political Event': 1.1, Engagement: 1.05, 'Religious Function': 1.02, 'Get-Together': 0.96, 'House Function': 0.98, 'Custom Event': 1 },
  durationMultiplier: { '2 hours': 1, '4 hours': 1.12, '6 hours': 1.22, '8 hours': 1.35, 'Full day': 1.55 },
  distance: {
    '0–10 km': { travel: 0, representativeKm: 5 },
    '10–25 km': { travel: 1800, representativeKm: 18 },
    '25–50 km': { travel: 4000, representativeKm: 38 },
    '50–100 km': { travel: 7500, representativeKm: 75 },
    '100+ km': { travel: 12000, representativeKm: 110 },
  },
  costs: { servicePerGuest: 18, cookingStaff: 2600, servingStaff: 1700, supportStaff: 1900, buffetSetup: 4500, liveCounter: 5500 },
  staffing: { cookingGuests: 145, servingGuests: 70, supportGuests: 180, counterCookingLoad: 0.65 },
  quantitiesKgPerGuest: { vegetables: 0.15, rice: 0.08, paneer: 0.075, chicken: 0.17, mutton: 0.15, fish: 0.16, prawns: 0.12, crab: 0.16, eggs: 0.1 },
  preparation: { baseHours: 2, guestsPerHour: 240, dishesPerHour: 12, nonVegHours: 1, counterHours: 0.65, windowHours: 2 },
  fuel: { unitsPerGuest: 0.07, unitsPerDish: 0.5, unitsPerCounter: 3 },
  estimateRange: { low: 0.9, high: 1.12, rounding: 500 },
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const roundUp = value => Math.ceil(value);
const proteinPatterns = {
  chicken: [/chicken|naatu kodi|natu kodi/],
  mutton: [/mutton|lamb|ghost|keema|kheema|paya|haleem/],
  fish: [/fish|chepala|chepalu|koraminu|vanjram|palmfret|roop chand|netthalu|sorapittu/],
  prawns: [/prawn|shrimp|royyalu|royyala/],
  crab: [/crab|peethala|peethalu/],
  eggs: [/(^|\W)egg|kodiguddu/],
};
const textForDish = dish => typeof dish === 'string' ? dish : `${dish.category || ''} ${dish.name || ''}`;
const isNonVegDish = dish => {
  if (typeof dish !== 'string' && dish.type) return dish.type === 'nonveg';
  const text = textForDish(dish).toLowerCase();
  return Object.values(proteinPatterns).flat().some(pattern => pattern.test(text));
};
const isVegDish = dish => typeof dish !== 'string' && dish.type ? dish.type === 'veg' : !isNonVegDish(dish);

export function normalizePlannerState(value = {}) {
  const guests = Number(value.guests);
  return {
    ...defaultPlannerState,
    ...value,
    guests: Number.isFinite(guests) ? clamp(Math.round(guests), plannerRules.guests.min, plannerRules.guests.max) : defaultPlannerState.guests,
    staffing: { ...defaultPlannerState.staffing, ...(value.staffing || {}) },
    counterTypes: Array.isArray(value.counterTypes) ? value.counterTypes.filter(type => plannerOptions.liveCounters.includes(type)) : [],
    counters: clamp(Number(value.counters) || 0, 0, 4),
    budget: Math.max(0, Number(value.budget) || defaultPlannerState.budget),
  };
}

export function calculatePlan(plan, dishes = []) {
  if (Number(plan?.guests) < plannerRules.guests.min) return { available: false, minimumGuests: plannerRules.guests.min };
  const state = normalizePlannerState(plan);
  const hasCustomMenu = dishes.length > 0;
  const standardMenu = standardMenus[state.food] || standardMenus.both;
  const menuItems = hasCustomMenu ? dishes : standardMenu.items;
  const selectedCount = dishes.length;
  const style = plannerRules.styles[state.style] || plannerRules.styles.standard;
  const eventMultiplier = plannerRules.eventMultiplier[state.eventType] || 1;
  const durationMultiplier = plannerRules.durationMultiplier[state.duration] || 1;
  const effectiveDishes = hasCustomMenu ? selectedCount : (standardMenu.items.length || standardMenu.demo.dishCountByStyle[state.style] || style.defaultDishes);
  const customDishTypes = dishes.reduce((counts, dish) => {
    if (isVegDish(dish)) counts.veg += 1;
    if (isNonVegDish(dish)) counts.nonveg += 1;
    return counts;
  }, { veg: 0, nonveg: 0 });
  const basePlateRate = standardMenu.costPerPlate;
  const dishAllowance = hasCustomMenu ? plannerRules.customMenuPricing.dishAllowance[state.style] : style.dishAllowance;
  const extraDishRate = Math.max(0, effectiveDishes - dishAllowance) * (hasCustomMenu ? plannerRules.customMenuPricing.perExtraDishPerPlate : 5);
  const specialItemRate = hasCustomMenu ? dishes.reduce((sum, dish) => sum + (plannerRules.customMenuPricing.specialItemPerPlate[dish.id] || 0), 0) : 0;
  const customAdjustmentPerGuest = hasCustomMenu ? extraDishRate + specialItemRate : 0;
  const food = Math.round(state.guests * (basePlateRate + customAdjustmentPerGuest));
  const complexity = 1 + Math.max(0, effectiveDishes - dishAllowance) * 0.018 + (hasCustomMenu ? customDishTypes.nonveg > 0 : state.food !== 'veg') * 0.12 + state.counters * 0.055;
  const service = Math.round(state.guests * (plannerRules.costs.servicePerGuest + plannerRules.additionalServiceCharges.perGuest) * durationMultiplier * eventMultiplier);
  const cookingStaff = state.staffMode === 'manual' ? Math.max(0, Number(state.staffing.cooking) || 0) : Math.max(2, roundUp(state.guests / plannerRules.staffing.cookingGuests * complexity + state.counters * plannerRules.staffing.counterCookingLoad));
  const servingStaff = state.staffMode === 'manual' ? Math.max(0, Number(state.staffing.serving) || 0) : Math.max(2, roundUp(state.guests / plannerRules.staffing.servingGuests * durationMultiplier));
  const supportStaff = state.staffMode === 'manual' ? Math.max(0, Number(state.staffing.support) || 0) : Math.max(1, roundUp(state.guests / plannerRules.staffing.supportGuests + state.counters * 0.5));
  const staff = Math.round((cookingStaff * plannerRules.costs.cookingStaff + servingStaff * plannerRules.costs.servingStaff + supportStaff * plannerRules.costs.supportStaff) * durationMultiplier);
  const setup = state.buffet ? plannerRules.costs.buffetSetup : 0;
  const travel = plannerRules.distance[state.distance]?.travel || 0;
  const liveCounters = state.counters * plannerRules.costs.liveCounter;
  const total = food + service + staff + setup + travel + liveCounters;
  const dishText = menuItems.map(dish => typeof dish === 'string' ? dish : `${dish.category || ''} ${dish.name || ''}`).join(' ').toLowerCase();
  const contains = patterns => patterns.some(pattern => pattern.test(dishText));
  const hasActualStandardItems = !hasCustomMenu && standardMenu.items.length > 0;
  const demoQuantities = standardMenu.demo.quantities;
  const proteinKinds = hasCustomMenu || hasActualStandardItems
    ? Object.keys(proteinPatterns).filter(kind => contains(proteinPatterns[kind]))
    : demoQuantities.proteins;
  const hasVegetables = hasCustomMenu || hasActualStandardItems
    ? menuItems.some(dish => isVegDish(dish) && !/sweet|dessert|ice cream|juice|fruit|mocktail|milk shake/i.test(textForDish(dish)))
    : demoQuantities.vegetables;
  const hasGrains = hasCustomMenu || hasActualStandardItems
    ? contains([/rice|biriyani|biryani|pulav|pulao|bagara/])
    : demoQuantities.rice;
  const hasPaneer = hasCustomMenu || hasActualStandardItems
    ? contains([/paneer/])
    : demoQuantities.paneer;
  const includesVeg = hasCustomMenu || hasActualStandardItems
    ? menuItems.some(isVegDish)
    : state.food !== 'nonveg';
  const includesNonVeg = hasCustomMenu ? menuItems.some(isNonVegDish) : state.food !== 'veg';
  const quantity = (kind, enabled) => enabled ? Math.round(state.guests * plannerRules.quantitiesKgPerGuest[kind] * style.quantityMultiplier) : null;
  const prepHours = Math.max(3, roundUp(plannerRules.preparation.baseHours + state.guests / plannerRules.preparation.guestsPerHour + effectiveDishes / plannerRules.preparation.dishesPerHour + (includesNonVeg ? plannerRules.preparation.nonVegHours : 0) + state.counters * plannerRules.preparation.counterHours));
  const quantities = [
    ...(hasVegetables ? [{ label: 'Vegetables', value: quantity('vegetables', true) }] : []),
    ...(hasGrains ? [{ label: 'Rice / biryani', value: quantity('rice', true) }] : []),
    ...(hasPaneer ? [{ label: 'Paneer', value: quantity('paneer', true) }] : []),
    ...proteinKinds.map(kind => ({ label: kind[0].toUpperCase() + kind.slice(1), value: quantity(kind, true) })),
  ];
  const meatSeafoodKg = proteinKinds.reduce((sum, kind) => sum + (quantity(kind, true) || 0), 0);
  const menuLabel = standardMenu.label;
  const menuDishCount = hasCustomMenu ? selectedCount : 0;
  const menuDemoOnly = standardMenu.demoOnly || hasCustomMenu;
  const range = plannerRules.estimateRange;
  const roundTo = value => Math.round(value / range.rounding) * range.rounding;
  const budgetStatus = !state.budgetEnabled ? 'not-set' : roundTo(total * range.high) <= state.budget ? 'within' : roundTo(total * range.low) > state.budget ? 'above' : 'near';
  return {
    total, low: roundTo(total * range.low), high: roundTo(total * range.high), food, service, staff, setup, travel, liveCounters,
    cookingStaff, servingStaff, supportStaff,
    quantities, menuMode: hasCustomMenu ? 'custom' : 'standard', menuLabel, menuItems, menuDishCount, menuDemoOnly,
    costPerGuest: basePlateRate, customAdjustmentPerGuest, standardRateDemoOnly: standardMenu.demoOnly,
    includesVeg, includesNonVeg, meatSeafoodKg, prepLow: prepHours, prepHigh: prepHours + plannerRules.preparation.windowHours,
    fuel: Math.round(state.guests * plannerRules.fuel.unitsPerGuest + effectiveDishes * plannerRules.fuel.unitsPerDish + state.counters * plannerRules.fuel.unitsPerCounter),
    complexity, effectiveDishes, budgetStatus, distanceKm: plannerRules.distance[state.distance]?.representativeKm || 0,
  };
}

export function getPlannerSuggestions(state, dishes) {
  const suggestions = [];
  const mainDishes = dishes.filter(dish => /curry|biryani|biriyani|pulav|pulao|rice/i.test(`${dish.category} ${dish.name}`));
  const desserts = dishes.filter(dish => /sweet|dessert|ice cream/i.test(dish.category));
  if (!dishes.length) suggestions.push('Your standard menu estimate is ready. Customize it whenever you like.');
  if (state.guests >= 300 && mainDishes.length > 0 && mainDishes.length < 3) suggestions.push(`You selected ${mainDishes.length} main ${mainDishes.length === 1 ? 'dish' : 'dishes'} for ${state.guests} guests. Another main may add variety.`);
  if (desserts.length > 2) suggestions.push(`You selected ${desserts.length} desserts. Keeping two can help balance the menu.`);
  return suggestions.slice(0, 2);
}
