# CS:GO Skins Mobile App

**SE1720 - Vo Viet Thang - SE180202**

A React Native mobile app for browsing CS:GO weapon skins with offline support, favorites, and live price tracking.

## What It Does

- Fetches CS:GO skin data from a public API
- Works offline by caching everything in local storage
- Lets you favorite skins for quick access
- Tracks real-time skin prices (updates every 30 minutes)
- Shows price history with charts
- Filters by category, rarity, wear condition, and StatTrak

## Tech Stack

- **React Native** with Expo
- **AsyncStorage** for local database
- **Supabase** for cloud price history
- **React Navigation** for screens
- **CSGOFloat API** for skin data and prices

## Project Structure

```
src/
├── screens/          # Main app screens
│   ├── ListScreen.js      # Home screen with all skins
│   ├── DetailScreen.js    # Individual skin details
│   └── FavoritesScreen.js # Your saved favorites
├── components/       # Reusable UI components
├── services/         # API calls and data handling
├── context/          # Global state management
└── database/         # Local storage functions
```

## Running the App

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

## Features

### List Screen

- Search bar for finding skins
- Auto-generated category filters (extracted from data, not hardcoded)
- Pull-to-refresh
- Loading and error states
- Works offline from cached data

### Detail Screen

- Full skin information
- Favorite toggle button (star icon)
- Price information with live updates
- Price history charts (7d/14d/30d)
- Pattern seed explorer
- Wear condition selector

### Favorites Screen

- Database-only (no API calls)
- Updates in real-time when you favorite/unfavorite
- Same search and filter options as main list
- Empty state message when no favorites

## Offline-First Approach

The app fetches from the API first, then saves everything to AsyncStorage. If you lose internet:

- All previously loaded skins remain accessible
- Favorites still work (they're always local)
- Price data shows last known values
- Everything syncs back up when you reconnect

## Price Tracking

Prices update every 30 minutes while the app is active:

- Local storage (instant access)
- Supabase cloud (synced across devices)
- Automatic cleanup to manage storage limits

## Known Limitations

- 3D skin viewer uses CSGOStash embed (real 3D requires Steam inspect links)
- Background price updates need special setup (React Native limitation)
- Supabase free tier: 500 MB storage
- Price updates pause when app is closed

## API Credits

- **CS:GO Skins Data**: [CSGOStash API](https://csgostash.com)
- **Price Data**: [CSGOFloat API](https://csfloat.com)
- **Images**: Various CS:GO community sources (byMykel)

## Notes

This was built for a mobile development course assignment. The app works well for browsing skins and learning about prices, but it's not a replacement for actual marketplace apps. Just a student project that turned out pretty decent.

## License

Educational project - MIT License
