# Lingo Chrome Extension

A Chrome extension that translates entire web pages using the [Lingo.dev](https://lingo.dev) translation API. Features automatic language detection, batch translation with progress tracking, and support for 32+ languages.

## Features

- 🌍 **Automatic Language Detection** - Detects source language from page content
- ⚡ **Fast Batch Translation** - Uses Lingo's object translation for optimal performance
- 📊 **Real-time Progress Tracking** - Visual progress bar and percentage completion
- 🎯 **Smart Text Selection** - Only translates visible, meaningful content
- 💾 **State Persistence** - Remembers translation status even after popup closes
- 🚀 **32+ Supported Languages** - All Lingo.dev supported languages available

## Supported Languages

Arabic, Bulgarian, Catalan, Chinese, Czech, Danish, Dutch, English, Estonian, Finnish, French, German, Greek, Hungarian, Indonesian, Italian, Japanese, Korean, Latvian, Lithuanian, Norwegian, Polish, Portuguese, Romanian, Russian, Slovak, Slovenian, Spanish, Swedish, Turkish, Ukrainian

## Prerequisites

- Node.js (v20 or higher)
- npm or yarn
- Chrome browser
- [Lingo.dev API key](https://lingo.dev)

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/lingo-chrome-extension.git
   cd lingo-chrome-extension
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up your Lingo API key**
   
   Create a `.env` file in the root directory:
   ```bash
   LINGO_API_KEY=your_actual_lingo_api_key_here
   ```
   
   Or directly edit `src/content.js` and replace `'your-lingo-api-key-here'` with your actual API key.

4. **Build the extension**
   ```bash
   npm run build
   ```
   
   This generates the `dist/lingo-sdk.js` file needed by the service worker.

5. **Load the extension in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (top right toggle)
   - Click "Load unpacked" (feel free to remove `node_modules` for smaller size before loading the extension)
   - Select the project directory

## Development

### Project Structure

```
lingo-chrome-extension/
├── src/
│   └── content.js          # Lingo SDK initialization
├── dist/                   # Generated webpack bundle
│   └── lingo-sdk.js       # Built SDK for service worker
├── content-script.js       # DOM manipulation and UI
├── service-worker.js       # Background translation logic
├── popup.html             # Extension popup UI
├── popup.js               # Popup interaction logic
├── manifest.json          # Chrome extension manifest
├── webpack.config.js      # Webpack configuration
└── package.json           # Dependencies and scripts
```

### Build Process

The extension uses webpack to bundle the Lingo SDK for use in the service worker:

```bash
# Development build
npm run build

# Production build (if configured)
npm run build:prod
```

**Important**: The `dist/lingo-sdk.js` file must be generated before loading the extension, as the service worker imports it via `importScripts()`.

### Webpack Configuration

The webpack config is optimized for Chrome extension service workers:

- **Target**: `webworker` (for service worker compatibility)
- **Global Object**: `self` (instead of `window`)
- **Node.js Polyfills**: Disabled non-browser modules
- **Process Polyfill**: Included for Lingo SDK compatibility

### Scripts

```bash
# Build the extension
npm run build

# Install dependencies
npm install

# Development (watch mode, if configured)
npm run dev
```

## Usage

1. **Open any webpage** you want to translate
2. **Click the extension icon** in the Chrome toolbar
3. **Wait for language detection** - The source language will be automatically detected
4. **Select target language** from the dropdown
5. **Click "Translate Page"** - Watch the progress bar for real-time updates
6. **View translated content** - The page content will be replaced with translations

### Translation Features

- **Batch Processing**: Translates content in optimized batches for speed
- **Progress Tracking**: Shows percentage completion and estimated time
- **Smart Filtering**: Excludes scripts, styles, and hidden elements
- **Whitespace Preservation**: Maintains original formatting and spacing
- **Error Handling**: Graceful fallbacks and user-friendly error messages

## API Integration

This extension uses the [Lingo.dev JavaScript SDK](https://lingo.dev/en/sdk/javascript) with the following key features:

### Object Translation
```javascript
await lingoDotDev.localizeObject(textObject, {
  sourceLocale: null,
  targetLocale: 'es'
}, onProgress);
```

### Language Detection
```javascript
const detectedLanguage = await lingoDotDev.recognizeLocale(sampleText);
```

### Progress Tracking
```javascript
const onProgress = (progress) => {
  console.log(`Translation ${(progress.progress * 100).toFixed(0)}% complete`);
};
```

## Configuration

### Batch Size
Adjust translation batch size in `content-script.js`:
```javascript
const BATCH_SIZE = 5000; // Characters per batch
```

### Supported Languages
Update language options in `popup.html` and `popup.js` to add/remove languages.

### API Endpoints
The extension requires these permissions in `manifest.json`:
```json
"host_permissions": [
  "https://engine.lingo.dev/*"
]
```

## Troubleshooting

### Common Issues

1. **"Lingo SDK not available"**
   - Ensure `npm run build` was executed
   - Check that `dist/lingo-sdk.js` exists
   - Verify API key is correctly set

2. **CORS Errors**
   - Translation happens in service worker to avoid CORS
   - Ensure `host_permissions` includes Lingo.dev domains

3. **Translation Fails**
   - Check API key validity
   - Verify internet connection
   - Check browser console for detailed errors

4. **No Language Detection**
   - Use auto-detect capability of lingo.dev during translation
   
### Debug Mode

Enable detailed logging by opening Chrome DevTools:
- **Service Worker**: `chrome://extensions/` → Extension details → Service worker → Inspect
- **Content Script**: Right-click page → Inspect → Console
- **Popup**: Right-click extension icon → Inspect popup

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Build and test: `npm run build`
5. Commit changes: `git commit -am 'Add feature'`
6. Push to branch: `git push origin feature-name`
7. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

- [Lingo.dev Documentation](https://lingo.dev/en/sdk/javascript)
- [Chrome Extension Development](https://developer.chrome.com/docs/extensions/)
- [Issue Tracker](https://github.com/yourusername/lingo-chrome-extension/issues)