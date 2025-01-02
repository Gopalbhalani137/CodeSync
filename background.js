// background.js

// Initialize extension
// background.js

const initializeExtension = () => {
    console.log("Initializing background script...");

    // Remove all existing context menu items
    chrome.contextMenus.removeAll(() => {
        // Create "Change Settings" context menu
        chrome.contextMenus.create({
            id: 'changeSettings',
            title: 'Change Settings',
            contexts: ['action'],
        });
    });

    console.log("Background script initialization complete.");
};
// Handle extension icon click
chrome.action.onClicked.addListener(async () => {
    console.log("Extension icon clicked - checking state...");

    try {
        const data = await new Promise((resolve) => {
            chrome.storage.sync.get(['githubToken', 'isSetupComplete', 'repoLink', 'codeforcesUsername'], resolve);
        });

        console.log("Current extension state:", data);

        const showLogin = new URLSearchParams(window.location.search).get('showLogin') === '1';

        if (!showLogin && data.githubToken && data.isSetupComplete && data.repoLink && data.codeforcesUsername) {
            chrome.action.setPopup({ popup: 'popup.html' });
        } else {
            chrome.action.setPopup({ popup: 'popup.html?showLogin=1' });
        }
        chrome.action.openPopup();
    } catch (error) {
        console.error("Error in icon click handler:", error);
    }
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info) => {
    if (info.menuItemId === 'changeSettings') {
        console.log("Change Settings clicked - showing login section...");
        chrome.action.setPopup({ popup: 'popup.html?showLogin=1' });
        chrome.action.openPopup();
    }
});

// Handle messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Message received:", message);
    if (message.action === "fetchAndPushSubmissions") {
        console.log("Starting fetch and push process...");
        // Perform fetch and push logic
        alert(`Last submission ${message.filename} pushed into GitHub repo`);
    } else if (message.action === "showLoginSection" || message.action === "loggedOut") {
        console.log("Triggering login section display...");
        chrome.action.setPopup({ popup: 'popup.html' });
        chrome.action.openPopup();
    } else if (message.action === "authenticate") {
        console.log("Starting authentication flow...");
        chrome.identity.launchWebAuthFlow(
            {
                url: message.url,
                interactive: true
            },
            (redirectUrl) => {
                if (chrome.runtime.lastError) {
                    console.error("Auth flow error:", chrome.runtime.lastError);
                    sendResponse({ error: chrome.runtime.lastError.message });
                    return;
                }
                
                console.log("Redirect URL received:", redirectUrl);
                
                try {
                    const urlParams = new URLSearchParams(new URL(redirectUrl).search);
                    const code = urlParams.get("code");
                    if (code) {
                        console.log("Auth code received:", code);
                        sendResponse({ code });
                    } else {
                        console.error("No code in redirect URL");
                        sendResponse({ error: "No code found in redirect URL" });
                    }
                } catch (error) {
                    console.error("Error parsing redirect URL:", error);
                    sendResponse({ error: error.message });
                }
            }
        );
        return true; // Keep message channel open for async response
    }
});

// Handle install/update
chrome.runtime.onInstalled.addListener((details) => {
    console.log("Extension installed/updated:", details.reason);
    initializeExtension();
});

// Initialize on startup
initializeExtension();

console.log("Background script loaded.");