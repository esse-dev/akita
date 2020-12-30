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
 * access the document.monetization object. We inject code using a script element:
 */
const scriptEl = document.createElement('script');
scriptEl.text = `
	if (document.monetization) {
		document.monetization.addEventListener('monetizationstart', (event) => {
			document.dispatchEvent(new CustomEvent('akita_monetizationstart', { detail: event.detail }));
		});

		document.monetization.addEventListener('monetizationprogress', (event) => {
			document.dispatchEvent(new CustomEvent('akita_monetizationprogress', { detail: event.detail }));
		});

		document.monetization.addEventListener('monetizationstop', (event) => {
			document.dispatchEvent(new CustomEvent('akita_monetizationstop', { detail: event.detail }));
		});
	}
`;
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
