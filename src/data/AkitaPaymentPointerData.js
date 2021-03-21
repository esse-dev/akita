/**
 * Contains a payment pointer and all the assets (WebMonetizationAsset)
 * sent to that payment pointer. An asset is some amount of a currencies like USD, CAD or XRP.
 */
class AkitaPaymentPointerData {
	constructor(paymentPointerString, validationTimestampNumber = null) {
		this.paymentPointer = paymentPointerString;

		// The most recent time (UTC timestamp) when Akita validated the payment pointer
		// For more info on payment pointer validation: see ../content_origin.js, function isPaymentPointerValid
		// This is a Number, but is initialized to null to signify that the payment pointer has not yet been validated
		this.validationTimestamp = validationTimestampNumber;

		// The type of each entry in sentAssetsMap is: WebMonetizationAsset
		this.sentAssetsMap = {};
	}

	/**
	 * This function takes an object with the same properties as AkitaPaymentPointerData,
	 * i.e. an AkitaPaymentPointerData instance which has been stored and loaded from browser storage,
	 * and copies the object's properties over to an AkitaPaymentPointerData instance.
	 *
	 * @param {Object} akitaPaymentPointerDataObject an object with the same properties as an AkitaPaymentPointerData object.
	 * @return {AkitaPaymentPointerData} the input object as an instance of the AkitaPaymentPointerData class.
	 */
	static fromObject(akitaPaymentPointerDataObject) {
		const newPaymentPointerData = new AkitaPaymentPointerData(
			akitaPaymentPointerDataObject.paymentPointer,
			akitaPaymentPointerDataObject.validationTimestamp
		);

		for (const assetCode in akitaPaymentPointerDataObject.sentAssetsMap) {
			newPaymentPointerData.sentAssetsMap[assetCode] = WebMonetizationAsset.fromObject(
				akitaPaymentPointerDataObject.sentAssetsMap[assetCode]
			);
		}

		return newPaymentPointerData;
	}

	/**
	 * When Akita validates a payment pointer, the time it was validated should be set using this
	 * function. It is expected that payment pointers are validated by Akita often. In order to make
	 * sure that validation occurs often, we keep track of the last time the payment pointer was
	 * validated using validationTimestamp.
	 *
	 * For more info on payment pointer validation: see ./main.js, function isPaymentPointerValid
	 *
	 * @param {Number} validationTimestamp UTC Timestamp of last time payment pointer was validated.
	 */
	setValidationTimestamp(validationTimestamp) {
		this.validationTimestamp = validationTimestamp;
	}

	/**
	 * assetScale and amount e.g.
	 *		if assetCode is 'USD', amount is 235, and assetScale is 3 then actual amount of
	 *		currency is 235 * 10**(-3) = $0.235 USD or twenty-three and one-half cents.
	 *
	 * @param {Number} amount the total amount of the currency, before scaling by assetScale.
	 * @param {Number} assetScale multiply amount by 10 to the power of negative assetScale to
	 * convert to actual currency value.
	 * @param {String} assetCode the currency of the asset, such as 'USD', 'CAD', or 'XRP'.
	 * 
	 */
	addAsset(amount, assetScale, assetCode) {
		if (assetCode && !isNaN(amount) && !isNaN(assetScale)) {
			if (!this.sentAssetsMap[assetCode]) {
				this.sentAssetsMap[assetCode] = new WebMonetizationAsset(assetCode);
			}
			this.sentAssetsMap[assetCode].addAmount(amount, assetScale);
		}
	}
}
