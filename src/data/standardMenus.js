export const standardMenus = {
  veg: {
    label: 'Standard Vegetarian Menu',
    items: [],
    costPerPlate: 380,
    demoOnly: false,
    demo: {
      dishCountByStyle: { light: 8, standard: 12, large: 18 },
      quantities: { vegetables: true, rice: true, paneer: true, proteins: [] },
    },
  },
  nonveg: {
    label: 'Standard Non-Vegetarian Menu',
    items: [],
    costPerPlate: 480,
    demoOnly: false,
    demo: {
      dishCountByStyle: { light: 8, standard: 12, large: 18 },
      quantities: { vegetables: true, rice: true, paneer: false, proteins: ['chicken'] },
    },
  },
  both: {
    label: 'Standard Mixed Menu',
    items: [],
    costPerPlate: 320,
    demoOnly: true,
    demo: {
      dishCountByStyle: { light: 8, standard: 12, large: 18 },
      quantities: { vegetables: true, rice: true, paneer: true, proteins: ['chicken'] },
    },
  },
};