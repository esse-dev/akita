//test code
// browser.notifications.create('hello!');

const httpStatusOK = 200;
let siteIsMonetized = isMonetizationPresent();

console.log("siteIsMonetized: ", siteIsMonetized);

/**
 * Check for a monetization meta tag on the website and verify that
 * the payment point is valid (resolves).
 * 
 * TODO: use enum to indicate no meta tag, meta tag + valid endpoint,
 * meta tag + invalid endpoint.
 * 
 * @return If both monetization is present and the payment endpoint is valid.
 */
function isMonetizationPresent() {
	const monetizationMeta = document.querySelector('meta[name="monetization"]');
	let isMonetizationPresent = false;

	if (null === monetizationMeta) {
		/* No monetization meta tag provided */
	} else {
		let paymentPointer = monetizationMeta.content;

		if (isPaymentPointerValid(paymentPointer)) {
			isMonetizationPresent = true;
		}
	}

	return isMonetizationPresent;
}

/**
 * Check if a payment pointer is valid or not.
 * 
 * @param {string} paymentPointer The paymentPointer found in a meta tag.
 * @return Whether or not the specified payment pointer is valid.
 */
function isPaymentPointerValid(paymentPointer) {
	let isPaymentPointerValid = false;
	const resolvedPaymentPointer = resolvePaymentPointer(paymentPointer);

	if (resolvedPaymentPointer) {
		console.log("resolvedPaymentPointer: ", resolvedPaymentPointer);

		let response = httpGet(resolvedPaymentPointer, "Accept", "application/spsp4+json, application/spsp+json");

		if (response) {
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
 * Refer to https://paymentpointers.org/ for resolution details.
 * 
 * @param {string} paymentPointer The paymentPointer found in a meta tag.
 * @return The resolved payment pointer.
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

			// If no custom path is specified, append /.well-known/pay to the endpoint
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

			const httpsUrl = "https://";
			resolvedPaymentPointer = httpsUrl.concat(resolvedPaymentPointer);
		} else {
			resolvedPaymentPointer = null;
		}
	}
	
	return resolvedPaymentPointer;
}

/**
 * Send an http request to the provided endpoint with a header if specified.
 * 
 * TODO: add handling for multiple header values.
 * 
 * @param {string} endpoint The URL to make an http request against.
 * @param {string} headerName The name of the header.
 * @param {string} headerValue The value for the header.
 * @return The http request returned by the server.
 */
function httpGet(endpoint, headerName, headerValue) {
	let httpRequest = null;
	
	if (endpoint) {
		httpRequest = new XMLHttpRequest();

		/**
		 * TODO: make request asynchronous, add async handling
		 * [Deprecation] Synchronous XMLHttpRequest on the main thread is deprecated because
		 * of its detrimental effects to the end user's experience. 
		 * For more help, check https://xhr.spec.whatwg.org/.
		 */
		httpRequest.open("GET", endpoint, false); // false for synchronous request;
	
		if (headerName && headerValue) {
			httpRequest.setRequestHeader(headerName, headerValue);
		}
		
		httpRequest.send(null);
	}

    return httpRequest;
}
