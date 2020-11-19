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


setExtensionIconMonetizationState(false);
main();

/**
 * Main function to initiate the application.
 */
async function main() {
	// Test storing assets
	// await storeDataIntoAkitaFormat({
	// 	paymentPointer: paymentPointer,
	// 	assetCode: "USD",
	// 	assetScale: 9,
	// 	amount: 123456
	// }, AKITA_DATA_TYPE.PAYMENT);

	document.addEventListener('akita_monetizationprogress', (event) => {
		storeDataIntoAkitaFormat(event.detail, AKITA_DATA_TYPE.PAYMENT);
	});
	//document.addEventListener('akita_monetizationstop', (event) => {
	//	storeDataIntoAkitaFormat(null, AKITA_DATA_TYPE.PAYMENT);
	//});

	trackPaymentPointer();
	handleUpdatingExtensionIconOnTabVisibilityChange();
	await trackTimeOnSite();
	await trackVisitToSite();

	// For TESTING purposes: output all stored data to the console (not including current site)
	// loadAllData().then(result => console.log(JSON.stringify(result, null, 2)));
}

/***********************************************************
 * Extension Icon
 ***********************************************************/

/**
 * Sends a message to background_script.js which changes the extension icon.
 * Only background scripts have access to the extension icon API.
 *
 * @param {boolean} isCurrentlyMonetized Changes the browser icon to indicate whether the site is monetized or not.
 *   If true, a pink $ badge is displayed. If false, just the dog face without the tongue is used as the icon.
 */
function setExtensionIconMonetizationState(isCurrentlyMonetized) {
	const tabIsVisible = !document.hidden;

	if (tabIsVisible) {
		const webBrowser = chrome ? chrome : browser;
		webBrowser.runtime.sendMessage({ isCurrentlyMonetized });
	}
}

/***********************************************************
 * Track Visits and Time Spent on Website
 ***********************************************************/

/**
 * Track the current visit to the site (origin) and store the favicon to the site.
 * No data needs to be passed in, since it is handled in AkitaOriginVisitData.
 */
async function trackVisitToSite() {
	await storeDataIntoAkitaFormat(null, AKITA_DATA_TYPE.ORIGIN_VISIT_DATA);
	await storeFaviconPath();
}

/**
 * Calculate and store the time the user spends on the site.
 * Call this function once at the beginning of website logic.
 * 
 * Use the Page Visibility API to check if the current webpage is visible or not.
 * https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API
 * https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilityState
 */
async function trackTimeOnSite() {
	let previousStoreTime = getCurrentTime();
	let docHiddenTime = -1;
	let docVisibleTime = -1;

	document.addEventListener('visibilitychange', async (event) => {
		if (document.hidden) {
			// The page is no longer visible
			docHiddenTime = getCurrentTime();
		} else {
			// The page is now visible
			docVisibleTime = getCurrentTime();
		}
	});

	/**
	 * NOTE: setInterval may not be called while the document is hidden (while visibility lost)
	 * https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/setTimeout#Reasons_for_delays_longer_than_specified
	 * 
	 * Store the recent time spent every 2 seconds to ensure time spent on site is recorded
	 * even if the user closes the site.
	 */
	setInterval(async () => {
		const now = getCurrentTime();
		
		if (document.visibilityState === 'visible') {
			if (docHiddenTime > previousStoreTime) {
				// Adding time after visibility lost (document becomes hidden) and then gained (document is visible again)
				// i.e. If the user navigates away from the site and then comes back
				const timeFromPreviousStoreToDocHidden = docHiddenTime - previousStoreTime;
				const timeSinceDocVisible = now - docVisibleTime;	
				await storeRecentTimeSpent(timeFromPreviousStoreToDocHidden + timeSinceDocVisible);
			} else {
				// Adding time during regular interval (document visible)
				await storeRecentTimeSpent(now - previousStoreTime);
			}

			previousStoreTime = now;
		}
	}, 2000); // 2 second interval
}

/**
 * Get the current time based on the user's timezone.
 */
function getCurrentTime() {
	return performance.now();
}

/**
 * Store the recent time spent in the webpage session into AkitaFormat.
 * 
 * @param {Number} recentTimeSpent The recent time spent on the webpage. This number is
 * a Double, since performance.now() is used to construct this number.
 */
async function storeRecentTimeSpent(recentTimeSpent) {
	// Round the number up so that it is a whole number.
	const recentTimeSpentRounded = Math.ceil(recentTimeSpent);

	await storeDataIntoAkitaFormat(recentTimeSpentRounded, AKITA_DATA_TYPE.ORIGIN_TIME_SPENT);
}

/***********************************************************
 * Track and Validate Payment Pointer
 ***********************************************************/

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

/**
 * Checks every NEW_PAYMENT_POINTER_CHECK_RATE_MS milliseconds to see if a new payment pointer is
 * added to the page. Calls `handleValidationAndSetExtensionIcon` to set the extension icon.
 */
function trackPaymentPointer() {
	let cachedPaymentPointer = null;

	setInterval(async () => {
		const paymentPointerOnPage = getPaymentPointerFromPage();

		const isNewPaymentPointer =
			(paymentPointerOnPage !== null) &&
			(paymentPointerOnPage !== cachedPaymentPointer);

		if (isNewPaymentPointer) {
			// Note that paymentPointerOnPage may be newly added to the current page and tab,
			// but it is possible that this payment pointer was recently validated in another tab.
			// Therefore it is necessary to use handleValidationAndSetExtensionIcon which checks the
			// browser storage to see if the payment pointer has been recently validated.
			handleValidationAndSetExtensionIcon(paymentPointerOnPage);
			cachedPaymentPointer = paymentPointerOnPage;
		}
	}, NEW_PAYMENT_POINTER_CHECK_RATE_MS);
}

/**
 * Ensures that the extension icon is updated to the correct state when switching between tabs.
 */
function handleUpdatingExtensionIconOnTabVisibilityChange() {
	document.addEventListener('visibilitychange', (event) => {
		const tabIsVisible = !document.hidden;

		if (tabIsVisible) {
			const paymentPointerOnPage = getPaymentPointerFromPage();
			if (paymentPointerOnPage === null) {
				setExtensionIconMonetizationState(false);
			} else {
				handleValidationAndSetExtensionIcon(paymentPointerOnPage);
			}
		}
	});
}

/**
 * Given a payment pointer, if it is valid, this function sets the extension icon to its monetized
 * state and stores the payment pointer in browser storage, otherwise the extension icon is set to
 * its unmonetized state.
 *
 * @param {string} paymentPointer The payment pointer to validate.
 * @returns {Promise<>} A promise that resolves when validation is finished.
 */
async function handleValidationAndSetExtensionIcon(paymentPointer) {
	if (await isPaymentPointerRecentlyValidated(paymentPointer)) {
		setExtensionIconMonetizationState(true);
	} else {
		// Validate if not validated recently
		if (await isPaymentPointerValid(paymentPointer)) {
			// Store the payment pointer and the UTC timestamp for the time it was validated (now)
			await storeDataIntoAkitaFormat({
				paymentPointer: paymentPointer,
				validationTimestamp: Date.now()
			}, AKITA_DATA_TYPE.PAYMENT);
			setExtensionIconMonetizationState(true);
		} else {
			setExtensionIconMonetizationState(false);
		}
	}
}

/**
 * Checks the browser storage to see if Akita has validated the given payment pointer and stored a
 * validation timestamp for it recently.
 *
 * @param {string} paymentPointer The payment pointer to check.
 * @returns {Promise<boolean>} Resolves to true if there is a timestamp retrieved from storage and
 * the timestamp is recent (less than PAYMENT_POINTER_VALIDATION_RATE_MS from present time).
 * Resolves false otherwise.
 */
async function isPaymentPointerRecentlyValidated(paymentPointer) {
	const originData = await loadOriginData(window.location.origin);
	let validationTimestamp = null;
	if (originData && originData.paymentPointerMap[paymentPointer]) {
		// Get validationTimestamp from originData under the given payment pointer
		validationTimestamp =
			originData.paymentPointerMap[paymentPointer].validationTimestamp;
	}
	if (validationTimestamp === null) {
		return false;
	}

	// Check if validationTimestamp is recent
	const timeSinceLastValidated = Date.now() - validationTimestamp;
	if (timeSinceLastValidated < PAYMENT_POINTER_VALIDATION_RATE_MS) {
		return true;
	} else {
		return false;
	}
}

/**
 * Check if a payment pointer is valid (resolves to a valid SPSP endpoint).
 *
 * For more information on payment pointer resolution and validation see:
 *	- https://paymentpointers.org/syntax-resolution/#requirements
 *	- https://interledger.org/rfcs/0009-simple-payment-setup-protocol
 *
 * @param {string} paymentPointer The paymentPointer found in a meta tag.
 * @return {Promise<boolean>} Whether or not the specified payment pointer is valid.
 */
async function isPaymentPointerValid(paymentPointer) {
	let isPaymentPointerValid = false;
	const resolvedPaymentPointer = resolvePaymentPointer(paymentPointer);

	if (resolvedPaymentPointer) {

		let response = await httpGet(resolvedPaymentPointer, "Accept", "application/spsp4+json, application/spsp+json");

		if (response) {
			const httpStatusOK = 200;

			if (httpStatusOK === response.status) {
				isPaymentPointerValid = true;
			}
		}
	}

	return isPaymentPointerValid;
}

/**
 * Resolve a payment pointer into an SPSP endpoint.
 * 
 * Payment pointer format: "$" host path-abempty
 * Resolution format: "https://" host path-abempty
 * 
 * SPSP Endpoint Specification: https://interledger.org/rfcs/0009-simple-payment-setup-protocol/#specification
 * Payment pointer syntax resolution examples: https://paymentpointers.org/syntax-resolution/#examples
 * Refer to https://paymentpointers.org/ for resolution details.
 * 
 * @param {string} paymentPointer The paymentPointer found in a meta tag.
 * @return {string} The resolved payment pointer.
 */
function resolvePaymentPointer(paymentPointer) {
	let resolvedPaymentPointer = null;

	if (paymentPointer) {
		resolvedPaymentPointer = paymentPointer.trim();

		const httpsURL = "https://";
		// The first character of the payment pointer should be '$'
		if ('$' === resolvedPaymentPointer.charAt(0)) {
			// Remove '$' from the resolved payment pointer
			resolvedPaymentPointer = resolvedPaymentPointer.substr(1);

			const wellKnownPath = ".well-known/pay";
			const pathabemptyIndex = resolvedPaymentPointer.indexOf('/');

			// If no custom path is specified, append /.well-known/pay to the endpoint, otherwise keep the path as is
			if (-1 == pathabemptyIndex) {
				// There is no path specified for the payment pointer; eg. $pointer.exampleILPwalletprovider.com
				resolvedPaymentPointer.concat("/" + wellKnownPath);
			} else if ((resolvedPaymentPointer.length - 1) == pathabemptyIndex) {
				// There is no path specified for the payment pointer, but it ends in a forward slash; eg. $pointer.exampleILPwalletprovider.com/
				resolvedPaymentPointer.concat(wellKnownPath);
			} else {
				// Path is specified for the payment pointer - keep the path as is;
				// eg. $pointer.exampleILPwalletprovider.com/customPath or $pointer.exampleILPwalletprovider.com/customPath/
			}

			// Payment pointers must resolve to an https URL, as per: https://tools.ietf.org/html/rfc7230#section-2.7.2
			resolvedPaymentPointer = httpsURL.concat(resolvedPaymentPointer);
		} else if (resolvedPaymentPointer.startsWith(httpsURL)) {
			// An https:// payment pointer was provided, so it is "already resolved"
		} else {
			resolvedPaymentPointer = null;
		}
	}

	return resolvedPaymentPointer;
}

/**
 * Send an asynchronous http request to the provided endpoint with a header if specified.
 * 
 * TODO: add handling for multiple header values.
 * 
 * @param {string} endpoint The URL to make an http request against.
 * @param {string} headerName The name of the header.
 * @param {string} headerValue The value for the header.
 * @return {Promise<Response>} The http response returned by the server.
 */
async function httpGet(endpoint, headerName, headerValue) {
	let response = null;

	if (endpoint) {
		let requestHeaders = new Headers();

		if (headerName && headerValue) {
			requestHeaders.append(headerName, headerValue);
		}

		response = await fetch(endpoint, {
			method: 'GET',
			headers: requestHeaders
		});
	}

	return response;
}

/***********************************************************
 * Get Website Favicon
 ***********************************************************/

/**
 * Store the favicon path into storage.
 */
async function storeFaviconPath() {
	// TODO: only update favicon source if the path to the favicon has not changed
	await storeDataIntoAkitaFormat(getFaviconPath(), AKITA_DATA_TYPE.ORIGIN_FAVICON);
}

/**
 * Retrieve the favicon path.
 * 
 * @return {String} The absolute or relative path from the site origin to the favicon.
 */
function getFaviconPath() {
	// Default favicon path is at the root of the origin
	let faviconPath = null;
	let linkElementsList = document.getElementsByTagName("link");
	let relIconFoundIndex = -1;
	
	// Check for a link with rel "icon" or "shortcut icon"
	for (let i = 0; i < linkElementsList.length; i++) {
		const linkElementRel = linkElementsList[i].getAttribute("rel");

		if (linkElementRel === "shortcut icon") {
			// Specifically check for "shortcut icon" since the href tends to be a direct link
			faviconPath = linkElementsList[i].getAttribute("href");
			break;
		} else if (linkElementRel === "icon") {
			relIconFoundIndex = i;
		}
	}

	if (faviconPath) {
		// "shortcut icon" was found, faviconPath already set
	} else if (relIconFoundIndex !== -1) {
		// The "icon" link was found, set path to specified href
		faviconPath = linkElementsList[relIconFoundIndex].getAttribute("href");
	} else {
		// An icon link was not found, set path to default
		faviconPath = "favicon.ico";
	}
	
	return faviconPath;		
}
