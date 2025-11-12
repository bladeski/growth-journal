# Growth Journal PWA

A Progressive Web App for daily growth journaling and reflection. Track your personal development journey with offline support and native app-like experience.

## Features

🌱 **Daily Journaling**: Record your thoughts, progress, and reflections  
📱 **Progressive Web App**: Install on any device with offline support  
🔄 **Background Sync**: Entries sync when you're back online  
📊 **Reflection Dashboard**: Review your growth over time  
🎨 **Responsive Design**: Works on desktop, tablet, and mobile  

## Getting Started

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# The app will be available at http://localhost:3000
```

### Building for Production

```bash
# Build the PWA
npm run build:pwa

# Serve the built app locally to test
npm run serve
```

### PWA Features

The app includes:

- **Service Worker** for offline functionality
- **Web App Manifest** for installation
- **Background Sync** for data synchronization
- **Install prompts** for mobile and desktop
- **Offline indicators** and status management

### Adding Icons

1. Create your app icons in various sizes (72x72 to 512x512)
2. Place them in the `src/icons/` directory
3. Update the `manifest.json` if needed

You can use tools like [PWA Builder](https://www.pwabuilder.com/) to generate icons from a single source.

### Installation

Users can install the app:

1. **Mobile**: Tap "Add to Home Screen" in browser menu
2. **Desktop**: Click the install button in the address bar
3. **Manual**: Click the "Install App" button in the app header

## Architecture

```
src/
├── index.pug              # Main HTML template
├── index.ts               # App initialization
├── manifest.json          # PWA manifest
├── sw.ts                  # Service worker
├── utils/
│   └── pwa.ts            # PWA management utilities
├── types/
│   └── pwa.d.ts          # PWA type definitions
├── components/           # Reusable UI components
├── styles/              # CSS styling
└── icons/              # PWA icons
```

## Development Roadmap

- [ ] Journal entry component
- [ ] Local storage for offline entries
- [ ] Calendar view for entries
- [ ] Reflection prompts
- [ ] Progress tracking
- [ ] Export functionality
- [ ] Search and filtering
- [ ] Growth metrics dashboard

## Contributing

This is a personal project, but suggestions and improvements are welcome!

## License

MIT