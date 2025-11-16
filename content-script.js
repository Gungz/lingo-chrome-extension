// content-script.js: Runs on every webpage to handle DOM manipulation.

// Global map to hold references to text nodes for later replacement
const textNodeMap = new Map();
let currentTextId = 0;

// Utility function to determine if a node should be considered for translation
function isTranslatableNode(node) {
    if (node.nodeType !== Node.TEXT_NODE || !node.textContent.trim()) {
        return false;
    }

    const parent = node.parentElement;
    if (!parent) return false;

    const tag = parent.tagName.toLowerCase();
    // Exclude scripts, styles, inputs, textareas, and preformatted code blocks
    if (['script', 'style', 'textarea', 'input', 'code', 'pre'].includes(tag)) {
        return false;
    }
    
    // Simple check to exclude elements that may be hidden or irrelevant
    const style = window.getComputedStyle(parent);
    if (style.visibility === 'hidden' || style.display === 'none') {
        return false;
    }

    return true;
}

/**
 * Traverses the DOM to collect all translatable text content in optimized batches.
 * @returns {object} Batched content with mapping for efficient translation.
 */
function scrapePageText() {
    textNodeMap.clear();
    currentTextId = 0;
    const textNodes = [];
    const walker = document.createTreeWalker(
        document.body, 
        NodeFilter.SHOW_TEXT, 
        null, 
        false
    );

    let node;
    while (node = walker.nextNode()) {
        if (isTranslatableNode(node)) {
            const text = node.textContent.trim();
            if (text.length > 0) {
                textNodes.push({ node, text });
            }
        }
    }
    
    return createTextBatches(textNodes);
}

/**
 * Creates optimized batches of text for translation.
 * @param {Array} textNodes - Array of {node, text} objects.
 * @returns {object} Batched content map.
 */
function createTextBatches(textNodes) {
    const batches = [];
    const BATCH_SIZE = 5000; // Characters per batch
    let currentBatch = [];
    let currentSize = 0;
    
    for (const {node, text} of textNodes) {
        const textId = `id-${currentTextId++}`;
        textNodeMap.set(textId, node);
        
        // Add to current batch if it fits
        if (currentSize + text.length <= BATCH_SIZE) {
            currentBatch.push({ id: textId, text });
            currentSize += text.length;
        } else {
            // Start new batch
            if (currentBatch.length > 0) {
                batches.push(currentBatch);
            }
            currentBatch = [{ id: textId, text }];
            currentSize = text.length;
        }
    }
    
    if (currentBatch.length > 0) {
        batches.push(currentBatch);
    }
    
    console.log(`Created ${batches.length} batches from ${textNodes.length} text nodes.`);
    return { batches, totalNodes: textNodes.length };
}

/**
 * Replaces the original text nodes with the translated content.
 * @param {object} translatedContentMap - Map of text IDs to translated strings.
 */
function updatePageText(translatedContentMap) {
    let replacedCount = 0;
    
    for (const [textId, translatedText] of Object.entries(translatedContentMap)) {
        const node = textNodeMap.get(textId);
        if (node && translatedText) {
            // Check if the node is still attached to the DOM
            if (document.body.contains(node)) {
                // Keep leading/trailing whitespace intact from the original node
                const originalText = node.textContent;
                const leadingWhitespace = originalText.match(/^\s*/)?.[0] || '';
                const trailingWhitespace = originalText.match(/\s*$/)?.[0] || '';
                
                // Update the node's content
                node.textContent = leadingWhitespace + translatedText + trailingWhitespace;
                replacedCount++;
            } else {
                console.log(`Node for ID ${textId} not found or detached.`);
            }
        }
    }
    console.log(`Replaced text in ${replacedCount} nodes.`);
    textNodeMap.clear();
    
    // Show a temporary visual indicator of success
    showTranslationStatus('Translation complete!', 'success');
}

/**
 * Displays a non-intrusive status message on the webpage.
 * @param {string} message - The message to display.
 * @param {string} type - 'info' or 'success'.
 */
function showTranslationStatus(message, type) {
    let statusDiv = document.getElementById('extension-translator-status');
    if (!statusDiv) {
        statusDiv = document.createElement('div');
        statusDiv.id = 'extension-translator-status';
        statusDiv.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 999999;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            font-size: 14px;
            font-weight: 600;
            color: white;
            transition: opacity 0.5s ease-in-out;
            max-width: 300px;
            word-wrap: break-word;
        `;
        document.body.appendChild(statusDiv);
    }

    statusDiv.textContent = message;
    statusDiv.style.backgroundColor = type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#007bff';
    statusDiv.style.opacity = '1';

    // Hide the message after a few seconds
    setTimeout(() => {
        statusDiv.style.opacity = '0';
        setTimeout(() => statusDiv.remove(), 500); // Remove after transition
    }, 5000);
}


// Listener for messages from the Service Worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    
    if (message.command === 'SCRAPE_TEXT') {
        showTranslationStatus('Scraping page content...', 'info');
        
        const contentMap = scrapePageText();
        console.log("Message:", message);

        // Send the batched content back to the service worker for translation
        chrome.runtime.sendMessage({ 
            command: 'TEXT_SCRAPED', 
            targetLang: message.targetLang,
            batchedContent: contentMap 
        }).catch(err => console.error("Error sending TEXT_SCRAPED:", err));

        sendResponse({ success: true });
        return false;
    }
    
    if (message.command === 'UPDATE_TEXT') {
        // Received the translated text map from the service worker
        updatePageText(message.translatedContentMap);
    }
    
    if (message.command === 'TRANSLATION_PROGRESS') {
        // Show progress updates during batch translation
        console.log("Translation progress:", message.status);
        showTranslationStatus(message.status, 'info');
    }
    
    if (message.command === 'TRANSLATION_COMPLETE') {
        // Final message from the service worker to confirm completion or error
        const isError = message.status.includes('Error') || message.status.includes('failed');
        showTranslationStatus(message.status, isError ? 'error' : 'success');
    }
});


// Initial check to ensure the status div is removed on page navigation
window.addEventListener('beforeunload', () => {
    let statusDiv = document.getElementById('extension-translator-status');
    if (statusDiv) statusDiv.remove();
});