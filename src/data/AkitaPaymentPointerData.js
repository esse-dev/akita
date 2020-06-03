/**
 * Contains a payment pointer and all the assets (WebMonetizationAsset)
 * sent to that payment pointer. An asset is some amount of a currencies like USD, CAD or XRP.
 */
class AkitaPaymentPointerData {
	paymentPointer = null;
	// The type of each entry in sentAssetsMap is: WebMonetizationAsset
	sentAssetsMap = {};

	constructor(paymentPointer) {
		this.paymentPointer = paymentPointer;
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
		const newPaymentPointerData = new AkitaPaymentPointerData(akitaPaymentPointerDataObject.paymentPointer);

		for (const assetCode in akitaPaymentPointerDataObject.sentAssetsMap) {
			newPaymentPointerData.sentAssetsMap[assetCode] = WebMonetizationAsset.fromObject(
				akitaPaymentPointerDataObject.sentAssetsMap[assetCode]
			);
		}
		return newPaymentPointerData;
	}

	/**
	 * assetScale and amount e.g.
	 *		if assetCode is 'USD', amount is 235, and assetScale is 3 then actual amount of
	 *		currency is 235 * 10**(-3) = $0.235 USD or twenty-three and one-half cents.
	 *
	 * @param {String} assetCode the currency of the asset, such as 'USD', 'CAD', or 'XRP'.
	 * @param {Number} amount the total amount of the currency, before scaling by assetScale.
	 * @param {Number} assetScale multiply amount by 10 to the power of negative assetScale to
	 * convert to actual currency value.
	 */
	addAsset(assetCode, amount, assetScale) {
		if (!this.sentAssetsMap[assetCode]) {
			this.sentAssetsMap[assetCode] = new WebMonetizationAsset(assetCode);
		}
		this.sentAssetsMap[assetCode].addAmount(amount, assetScale);
	}
}
