import { LingoDotDevEngine } from 'lingo.dev/sdk';

// Initialize the SDK
const lingoDotDev = new LingoDotDevEngine({
  apiKey: process.env.LINGO_API_KEY || 'your-lingo-api-key-here'
});

// Make it globally available for service worker
self.lingoDotDev = lingoDotDev;

// Object translation function for service worker
async function translateObject(textObject, sourceLocale, targetLocale, onProgress) {
  return await lingoDotDev.localizeObject(textObject, {
    sourceLocale: sourceLocale,
    targetLocale: targetLocale,
  }, onProgress);
}

// Language detection function
async function detectLanguage(text) {
  return await lingoDotDev.recognizeLocale(text);
}

self.translateObject = translateObject;
self.detectLanguage = detectLanguage;