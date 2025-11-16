// service-worker.js: The background script. 
// It handles communication between the popup/content script and performs the heavy-lifting (API call).

// Import Lingo SDK
importScripts('dist/lingo-sdk.js');

/**
 * Translates batches using Lingo SDK object translation with progress tracking
 */
async function translateWithLingoSDK(batchedContent, targetLang, tabId) {
    try {
        if (!self.translateObject) {
            throw new Error('Lingo SDK not available in service worker');
        }
        
        console.log('Translating with Lingo SDK object translation...');
        
        const { batches } = batchedContent;
        const allResults = {};
        
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = batches[batchIndex];
            
            // Create object for batch translation
            const batchObject = {};
            batch.forEach(item => {
                batchObject[item.id] = item.text;
            });
            
            // Progress callback for this batch
            const onProgress = (progress) => {
                const overallProgress = (((batchIndex + 1) * progress) / batches.length).toFixed(0);
                
                chrome.tabs.sendMessage(tabId, {
                    command: 'TRANSLATION_PROGRESS',
                    status: `Translating... ${overallProgress}% complete`
                }).catch(() => {});
                
                chrome.runtime.sendMessage({
                    command: 'TRANSLATION_STATE_UPDATE',
                    completed: false,
                    status: `Translating... ${overallProgress}% complete`
                }).catch(() => {});
            };
            
            // Translate entire batch as object
            const batchResults = await self.translateObject(batchObject, null, targetLang, onProgress);
            
            // Merge results
            Object.assign(allResults, batchResults);
        }
        
        return allResults;
    } catch (error) {
        console.error('Lingo SDK translation failed:', error);
        throw error;
    }
}


// Listener for messages from the popup or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    
    // 2. Initial command from the popup to start the process
    if (message.command === 'TRANSLATE_PAGE') {
        const { tabId, targetLang } = message;
        
        chrome.tabs.sendMessage(tabId, { command: 'SCRAPE_TEXT', targetLang: targetLang })
            .then(() => console.log('SCRAPE_TEXT command sent successfully'))
            .catch(err => console.error("Error sending SCRAPE_TEXT command:", err));

        sendResponse({ success: true });
        return false;
    }

    // 3. Response from the content script with the scraped text
    if (message.command === 'TEXT_SCRAPED') {
        const { targetLang, batchedContent } = message;
        const tabId = sender.tab?.id;
        
        if (!tabId) {
            console.error('No tab ID available');
            sendResponse({ error: 'No tab ID' });
            return false;
        }
        
        // Use a self-executing async function to handle the asynchronous translation process
        (async () => {
            try {
                if (!batchedContent.batches || batchedContent.batches.length === 0) {
                    console.warn("No text found to translate.");
                    chrome.tabs.sendMessage(tabId, { command: 'TRANSLATION_COMPLETE', status: 'No text found.' });
                    return;
                }
                
                // Send progress update for multiple batches
                if (batchedContent.batches.length > 1) {
                    const progressStatus = `Processing ${batchedContent.batches.length} batches...`;
                    chrome.tabs.sendMessage(tabId, { 
                        command: 'TRANSLATION_PROGRESS', 
                        status: progressStatus
                    });
                    
                    // Update popup state
                    chrome.runtime.sendMessage({
                        command: 'TRANSLATION_STATE_UPDATE',
                        completed: false,
                        status: "Processing Translation"
                    }).catch(() => {});
                }
                
                // Translate using Lingo SDK object translation with progress
                const translatedContentMap = await translateWithLingoSDK(batchedContent, targetLang, tabId);
                
                // Send translated content to content script
                chrome.tabs.sendMessage(tabId, {
                    command: 'UPDATE_TEXT',
                    translatedContentMap: translatedContentMap
                });
                
                // Send completion message
                const successStatus = 'Page successfully translated!';
                chrome.tabs.sendMessage(tabId, {
                    command: 'TRANSLATION_COMPLETE',
                    status: successStatus
                });
                
                // Update popup state
                chrome.runtime.sendMessage({
                    command: 'TRANSLATION_STATE_UPDATE',
                    completed: true,
                    status: successStatus
                }).catch(() => {});
                
                sendResponse({ success: true });

            } catch (error) {
                console.error("Full translation process failed:", error);
                const errorStatus = 'Error during translation. Check console.';
                chrome.tabs.sendMessage(tabId, { command: 'TRANSLATION_COMPLETE', status: errorStatus });
                
                // Update popup state - translation failed
                chrome.runtime.sendMessage({
                    command: 'TRANSLATION_STATE_UPDATE',
                    completed: true,
                    status: errorStatus
                }).catch(() => {});
                
                sendResponse({ success: false });
            }
        })();
        
        return true;
    }
});

// Basic setup for the icon
chrome.runtime.onInstalled.addListener(() => {
    chrome.action.setIcon({ path: "icon16.png" });
});