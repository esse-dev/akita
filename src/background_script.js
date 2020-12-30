
const webBrowser = chrome ? chrome : browser;
const MONETIZED_ICON_PATH = '../assets/icon_64x64.png';
const UNMONETIZED_ICON_PATH = '../assets/icon_unmonetized.png';

// Listen to messages sent from Content Scripts via webBrowser.runtime.sendMessage
webBrowser.runtime.onMessage.addListener(
	(request, sender, sendResponse) => {
		// Set browser badge and icon based on requests sent from content_origin.js
		if (request.isCurrentlyMonetized) {
			const isCurrentlyMonetized = request.isCurrentlyMonetized.value;
			if (isCurrentlyMonetized) {
				webBrowser.browserAction.setBadgeBackgroundColor({ color: '#EF5E92' });
				webBrowser.browserAction.setBadgeText({ text: '$' });
				webBrowser.browserAction.setIcon({
					path: MONETIZED_ICON_PATH,
					tabId: sender.tab.id
				});
			} else {
				webBrowser.browserAction.setBadgeText({ text: '' }); // Hide the badge
				webBrowser.browserAction.setIcon({
				path: UNMONETIZED_ICON_PATH,
				tabId: sender.tab.id
				});
			}
			return;
		}
		// Forward messages from content_iframe.js scripts to content_origin.js
		if (request.iframePaymentPointerChange || request.iframeReceivedUuid) {
			chrome.tabs.sendMessage(sender.tab.id, request);
			return;
		}
	}
);

//TODO: will be incorrect if user opens a tab in the background.
webBrowser.tabs.onActivated.addListener(() => {
	webBrowser.browserAction.setBadgeText({ text: '' }); // Hide the badge
});
