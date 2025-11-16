// popup.js: Handles the UI interaction and sends commands to the service worker.

document.addEventListener('DOMContentLoaded', () => {
    const translateButton = document.getElementById('translateButton');
    const targetLanguageSelect = document.getElementById('targetLanguage');
    const statusDiv = document.getElementById('status');
    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');

    // Check for ongoing translation and load saved preferences
    chrome.storage.local.get(['targetLang', 'translationInProgress', 'translationStatus'], (result) => {
        if (result.targetLang) {
            targetLanguageSelect.value = result.targetLang;
        }
        
        if (result.translationInProgress) {
            translateButton.disabled = true;
            translateButton.textContent = 'Translating...';
            statusDiv.textContent = result.translationStatus || 'Translation in progress...';
            statusDiv.className = 'translating';
        }
    });
    
    
    // Get language display name
    function getLanguageName(code) {
        const names = {
            'ar': 'Arabic', 'bg': 'Bulgarian', 'ca': 'Catalan', 'zh': 'Chinese',
            'cs': 'Czech', 'da': 'Danish', 'nl': 'Dutch', 'en': 'English',
            'et': 'Estonian', 'fi': 'Finnish', 'fr': 'French', 'de': 'German',
            'el': 'Greek', 'hu': 'Hungarian', 'id': 'Indonesian', 'it': 'Italian',
            'ja': 'Japanese', 'ko': 'Korean', 'lv': 'Latvian', 'lt': 'Lithuanian',
            'nb': 'Norwegian', 'pl': 'Polish', 'pt': 'Portuguese', 'ro': 'Romanian',
            'ru': 'Russian', 'sk': 'Slovak', 'sl': 'Slovenian', 'es': 'Spanish',
            'sv': 'Swedish', 'tr': 'Turkish', 'uk': 'Ukrainian'
        };
        return names[code] || code;
    }

    translateButton.addEventListener('click', async () => {
        const targetLang = targetLanguageSelect.value;
        
        // Set translation state
        translateButton.disabled = true;
        translateButton.textContent = 'Translating...';
        statusDiv.textContent = `Translating to ${getLanguageName(targetLang)}...`;
        statusDiv.className = 'translating';
        progressBar.style.display = 'block';
        progressFill.style.width = '0%';

        // Save state and language preferences
        chrome.storage.local.set({ 
            targetLang: targetLang,
            translationInProgress: true,
            translationStatus: `Translating to ${getLanguageName(targetLang)}...`
        });

        try {
            // Get the active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (tab && tab.id) {
                // Send the command to the service worker
                await chrome.runtime.sendMessage({
                    command: 'TRANSLATE_PAGE',
                    tabId: tab.id,
                    targetLang: targetLang
                });
                statusDiv.textContent = `Translation requested: to ${getLanguageName(targetLang)}`;
            }
        } catch (error) {
            statusDiv.textContent = 'Error: Could not start translation.';
            statusDiv.className = '';
            console.error('Error in popup.js:', error);
            
            // Reset state on error
            chrome.storage.local.set({ 
                translationInProgress: false,
                translationStatus: 'Error: Could not start translation.'
            });
            translateButton.disabled = false;
            translateButton.textContent = 'Translate Page';
        }
    });
    
    // Listen for messages
    chrome.runtime.onMessage.addListener((message) => {
        if (message.command === 'TRANSLATION_STATE_UPDATE') {
            if (message.completed) {
                console.log("Translation completed:", message.completed);
                translateButton.disabled = false;
                translateButton.textContent = 'Translate Page';
                statusDiv.textContent = message.status || 'Translation completed!';
                statusDiv.className = '';
                progressBar.style.display = 'none';
                progressFill.style.width = '0%';

                chrome.storage.local.set({ 
                    translationInProgress: false,
                    translationStatus: message.status
                });
            } else {
                statusDiv.textContent = message.status || 'Translation in progress...';
                
                // Update progress bar if percentage is in status
                const progressMatch = message.status.match(/(\d+)% complete/);
                if (progressMatch) {
                    progressFill.style.width = progressMatch[1] + '%';
                }
                
                chrome.storage.local.set({ 
                    translationStatus: message.status
                });
            }
        }
    });
});