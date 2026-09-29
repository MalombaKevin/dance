# Pamoja Bets — prototype

Peer-to-peer betting front end: 1v1, 1 v Many, Many v 1 and team bets, escrow, KES 1M per-person cap,
1% commission, worldwide Discover (map / countries / feed) with category, budget, format and region filters, and friends.

## Run
Open `index.html` in a browser, or serve the folder (`npx serve .`). Needs internet for Google Fonts, d3 and topojson (cdnjs).

## Files
- `index.html` – markup
- `css/styles.css` – styles, light/dark theme tokens
- `js/app.js` – all logic and sample data
- `js/world-data.js` – world map shapes

## Key settings (top of js/app.js)
- `MAX_STAKE` – max KES one person puts into a bet (1,000,000)
- `MAX_OPPONENTS` – max people one person bets against (40)
- `FEE_RATE` / `FEE_BASIS` – commission (1% of the pot by default; `'profit'` = 1% of losing side only)
- `CATEGORIES`, `REGION`, `BUDGET_PRESETS` – filter options

## Note
State lives in memory and resets on reload. Balances, M-Pesa, escrow and settlement are simulated.
Production needs a backend (auth, database, M-Pesa Daraja, KYC/18+ checks) and a GRA licence in Kenya.
