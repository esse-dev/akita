//test code
// browser.notifications.create('hello!');

main();

/**
 * Main function to initiate the application.
 */
async function main() {
	const siteIsMonetized = await isMonetizationPresent();
	console.log("siteIsMonetized: ", siteIsMonetized);
}

/**
 * Check for a monetization meta tag on the website and verify that
 * the payment pointer is valid (resolves to a valid SPSP endpoint).
 * 
 * TODO: use enum to indicate no meta tag, meta tag + valid endpoint,
 * meta tag + invalid endpoint.
 * 
 * @return If both monetization is present and the payment endpoint is valid.
 */
async function isMonetizationPresent() {
	const monetizationMeta = document.querySelector('meta[name="monetization"]');
	let isMonetizationPresent = false;

	if (null === monetizationMeta) {
		/* No monetization meta tag provided */
	} else {
		let paymentPointer = monetizationMeta.content;

		if (await isPaymentPointerValid(paymentPointer)) {
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
 * @return The http response returned by the server.
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
