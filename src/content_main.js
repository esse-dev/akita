
/**
 * Content scripts can only see a "clean version" of the DOM, i.e. a version of the DOM without
 * properties which are added by JavaScript, such as document.monetization!
 * reference: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts#Content_script_environment
 *            https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Sharing_objects_with_page_scripts
 * So we must inject some code into the JavaScript context of the current tab in order to
 * access the document.monetization object. We inject code using a script element:
 */
const scriptEl = document.createElement('script');
scriptEl.text = `
	if (null === document.monetization) {
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
	// TODO: check payment pointer periodically for existence and validity
	const {
		isValid,
		paymentPointer
	} = await getAndValidatePaymentPointer();
	//TODO: call setExtensionIconMonetizationState whenever the page regains visibility so that the icon changes between tabs:
	setExtensionIconMonetizationState(isValid);

	// paymentPointer will be null if it doesn't exist or is invalid
	await storeDataIntoAkitaFormat({ paymentPointer: paymentPointer }, AKITA_DATA_TYPE.PAYMENT);

	document.addEventListener('akita_monetizationprogress', (event) => {
		storeDataIntoAkitaFormat(event.detail, AKITA_DATA_TYPE.PAYMENT);
	});
	document.addEventListener('akita_monetizationstop', (event) => {
		storeDataIntoAkitaFormat(null, AKITA_DATA_TYPE.PAYMENT);
	});

	await trackTimeOnSite();
	await trackVisitToSite();

	// For TESTING purposes: output all stored data to the console (not including current site)
	loadAllData().then(result => console.log(JSON.stringify(result, null, 2)));
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
	const webBrowser = chrome ? chrome : browser;
	webBrowser.runtime.sendMessage({ isCurrentlyMonetized });
}

/***********************************************************
 * Track Visits and Time Spent on Website
 ***********************************************************/

/**
 * Track the current visit to the site (origin).
 * No data needs to be passed in, since it is handled in AkitaOriginVisitData.
 */
async function trackVisitToSite() {
	await storeDataIntoAkitaFormat(null, AKITA_DATA_TYPE.ORIGIN_VISIT_DATA);
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

	document.addEventListener('visibilitychange', (event) => {
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
 * Validate Payment Pointer
 ***********************************************************/

/**
 * Check for a monetization meta tag on the website and verify that
 * the payment pointer is valid (resolves to a valid SPSP endpoint).
 * 
 * TODO: use enum to indicate no meta tag, meta tag + valid endpoint,
 * meta tag + invalid endpoint.
 * 
 * @return {Promise<{ isPaymentPointerValid: boolean, paymentPointer:string}>} 
 * isPaymentPointerValid is true if both monetization is present and the payment endpoint is valid.
 * paymentPointer is the paymentPointer if it is found in the monetization meta tag, otherwise null.
 */
async function getAndValidatePaymentPointer() {
	const monetizationMeta = document.querySelector('meta[name="monetization"]');
	let paymentPointer = (monetizationMeta) ? monetizationMeta.content : null;
	let isValid = false;

	if (null === monetizationMeta) {
		/* No monetization meta tag provided */
	} else {
		if (await isPaymentPointerValid(paymentPointer)) {
			isValid = true;
		}
	}

	return {
		isValid,
		paymentPointer
	};
}

/**
 * Check if a payment pointer is valid or not.
 * 
 * @param {string} paymentPointer The paymentPointer found in a meta tag.
 * @return {Promise<boolean>} Whether or not the specified payment pointer is valid.
 */
async function isPaymentPointerValid(paymentPointer) {
	let isPaymentPointerValid = false;
	const resolvedPaymentPointer = resolvePaymentPointer(paymentPointer);

	if (resolvedPaymentPointer) {
		console.log("resolvedPaymentPointer: ", resolvedPaymentPointer);

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
		console.log("raw paymentPointer: ", paymentPointer);

		resolvedPaymentPointer = paymentPointer.trim();

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
			const httpsURL = "https://";
			resolvedPaymentPointer = httpsURL.concat(resolvedPaymentPointer);
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
