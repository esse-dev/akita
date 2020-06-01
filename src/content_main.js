
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
	if (document.monetization) {
		document.monetization.addEventListener('monetizationstart', (event) => {
			document.dispatchEvent(new CustomEvent('akita_monetizationstart', { detail: event.detail }));
		});
	
		document.monetization.addEventListener('monetizationprogress', (event) => {
			document.dispatchEvent(new CustomEvent('akita_monetizationprogress', { detail: event.detail }));
		});
	}
`;
document.body.appendChild(scriptEl);


main();

/**
 * Main function to initiate the application.
 */
async function main() {
	const {
		isValid,
		paymentPointer
	} = await getAndValidatePaymentPointer();
	console.log("isPaymentPointerValid: ", isValid);

	// For TESTING purposes: output all stored data to the console (not including current site)
	loadAllData().then(result => console.log(JSON.stringify(result)));

	storePaymentDataIntoAkitaFormat({ paymentPointer: paymentPointer });

	document.addEventListener('akita_monetizationstart', (event) => {
		storePaymentDataIntoAkitaFormat({ paymentPointer: paymentPointer });
	});
	document.addEventListener('akita_monetizationprogress', (event) => {
		storePaymentDataIntoAkitaFormat(event.detail);
	});
}

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
