/***********************************************************
 * content_iframe.js runs inside of each iframe and tracks and notifies content_origin.js of
 * payment pointer changes in the iframe via the `webBrowser.runtime` message channel. Each
 * content_iframe.js in each iframe is assigned a uuid from content_origin.js via postMessage so
 * that content_origin.js can know which iframe the script is associated with when the script sends
 * messages.
 ***********************************************************/

// window.isTopLevel is set to true in ./content_origin.js, which only runs in the top level page;
// so if window.isTopLevel is not set to true, then this script is running in an iframe. All code
// in content_iframe.js should be inside this if block.
if (!window.isTopLevel) {

    let topLevelOrigin = null;
    let monetizationPaymentEvents = [];

    document.addEventListener('akita_monetizationprogress', (event) => {
        const monetizationPaymentEvent = event.detail;

        // Payment events may be received by the iframe before the top level page communicates the
        // topLevelOrigin to the iframe. However, since payment events are stored under the
        // topLevelOrigin, the topLevelOrigin needs to be received before payment events are saved.
        // Until a topLevelOrigin is received, payment events are put into an array for later storage.
        if (topLevelOrigin === null) {
            monetizationPaymentEvents.push(monetizationPaymentEvent);
        } else {
            storeDataIntoAkitaFormat(monetizationPaymentEvent, AKITA_DATA_TYPE.PAYMENT, topLevelOrigin);
        }
    });


    // Listen for a message from the top level page (./content_origin.js).
    // The iframe expects to receive a uuid and origin from the top level page soon after the iframe
    // is created.
    window.addEventListener('message', (event) => {
        const data = event.data;

        if (data.uuid && data.topLevelOrigin) {
            // Set topLevelOrigin so that iframe monetization events can be stored under this origin
            // and store any payment events that occured before receiving the topLevelOrigin.
            topLevelOrigin = data.topLevelOrigin;
            for (const monetizationPaymentEvent of monetizationPaymentEvents) {
                storeDataIntoAkitaFormat(monetizationPaymentEvent, AKITA_DATA_TYPE.PAYMENT, topLevelOrigin);
            }
            monetizationPaymentEvents = [];

            const iframeUuid = data.uuid;
            // Let the top level page know that the iframe has receieved the uuid
            webBrowser.runtime.sendMessage({
                iframeReceivedUuid: {
                    iframeUuid: iframeUuid
                }
            });
            trackIframePaymentPointer(iframeUuid);
        }
    });


    /**
     * Regularly check for payment pointer changes in the iframe. If the payment pointer changes,
     * the top level page (./content_origin.js) is notified via ./background_script.js, which forwards
     * the `webBrowser.runtime.sendMessage` iframePaymentPointerChange message.
     *
     * @param {string} iframeUuid the uuid given to the iframe by top level page.
     */
    function trackIframePaymentPointer(iframeUuid) {
        let cachedPaymentPointer = null;

        setInterval(async () => {
            const paymentPointerInIframe = getPaymentPointerFromPage();

            // If the payment pointer in iframe changes, send new payment pointer to content_origin.js
            if (paymentPointerInIframe !== cachedPaymentPointer) {
                webBrowser.runtime.sendMessage({
                    iframePaymentPointerChange: {
                        iframeUuid: iframeUuid,
                        paymentPointer: paymentPointerInIframe
                    }
                });
                cachedPaymentPointer = paymentPointerInIframe;
            }
        }, NEW_PAYMENT_POINTER_CHECK_RATE_MS);
    }
}
