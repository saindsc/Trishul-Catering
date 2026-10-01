# Trishul Caterers

A lightweight React/Vite catering website for Trishul Caterers in Hyderabad. It includes the approved homepage, local menu browser, catering planner, enquiry flow, conversion actions, and local Trishul Assistant.

## Stack

- React
- Vite
- Lucide React
- CSS
- Local menu and planner data

## Local development

```bash
npm install
npm run dev
```

## Build and preview

```bash
npm run build
npm run preview
```

The production build is written to `dist/`.

## Routes

- `/` homepage
- `/menu` menu browser
- `/plan` catering planner

`vercel.json` provides the SPA rewrite needed for direct navigation and refreshes on these routes.

## Business rules

- Minimum planning count: 50 guests
- Standard vegetarian baseline: Rs 380 per guest
- Standard non-vegetarian baseline: Rs 480 per guest
- Mixed-food planning is demo-only
- Estimates are approximate; final pricing and quantities are confirmed directly with the Trishul Caterers team
- Contact numbers, WhatsApp destination, location, and live-counter ideas are centralized in the local data layer

## Assistant and data

The Trishul Assistant is local and provider-ready. It does not call an external AI provider. Menu search, planner calculations, and assistant lookup use local data; no backend or database is required.

## Vercel deployment

1. Import the project into Vercel.
2. Keep the framework preset as Vite.
3. Use `npm run build` as the build command.
4. Use `dist` as the output directory.
5. Deploy and verify `/`, `/menu`, and `/plan` directly and after refresh.

The site uses approved remote photography for the current visual system. Replace temporary image references with final Trishul photography when available without changing the data contracts.
