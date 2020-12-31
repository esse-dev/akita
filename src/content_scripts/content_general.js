/***********************************************************
 * content_general.js runs both at the top level page (alongside content_origin.js), and
 * in iframes (alongside content_iframe.js); it handles forwarding web monetization events into
 * akita events.
 ***********************************************************/

const NEW_PAYMENT_POINTER_CHECK_RATE_MS = 1000; // 1 second
const PAYMENT_POINTER_VALIDATION_RATE_MS = 1000 * 60 * 60; // 1 hour

/**
 * Content scripts can only see a "clean version" of the DOM, i.e. a version of the DOM without
 * properties which are added by JavaScript, such as document.monetization!
 * reference: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts#Content_script_environment
 *			  https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Sharing_objects_with_page_scripts
 * So we must inject some code into the JavaScript context of the current tab in order to
 * access the document.monetization object. We inject code using a script element with
 * `chrome.extension.getURL` as recommended by google chrome developers:
 * https://developer.chrome.com/docs/extensions/mv3/mv3-migration-checklist/
 */
const scriptEl = document.createElement('script');
scriptEl.src = chrome.extension.getURL('src/page_inject_script.js');
(document.head||document.documentElement).appendChild(scriptEl);
scriptEl.onload = () => scriptEl.parentNode.removeChild(scriptEl);
document.body.appendChild(scriptEl);

/**
 * Gets the payment pointer as a string from the monetization meta tag on the current page.
 * If there is no monetization meta tag on the page, null is returned.
 *
 * For more info on the monetization meta tag:
 *	- https://webmonetization.org/docs/getting-started
 *	- https://webmonetization.org/specification.html#meta-tags-set
 *
 * @return {string|null} The payment pointer on the current page, or null if no meta tag is present.
 */
function getPaymentPointerFromPage() {
	const monetizationMetaTag = document.querySelector('meta[name="monetization"]');

	if (monetizationMetaTag) {
		return monetizationMetaTag.content;
	} else {
		return null;
	}
}
