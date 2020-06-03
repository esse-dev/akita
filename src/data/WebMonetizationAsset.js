/**
 * An asset is just an amount of some currency. For example an asset could be $2.35USD.
 * $2.35USD as a WebMonetizationAsset looks like:
 *	 amount: 235
 *	 assetScale: 2
 *	 assetCode: 'USD'
 *
 * In order to convert from amount to the actual currency amount, use:
 *	 amount multiplied by 10 to the power of negative assetScale.
 * So, in the case of the above example:
 *	 235 * 10**(-2) = 2.35
 */
class WebMonetizationAsset {
	amount = 0;
	assetScale = 0;
	assetCode = null;

	constructor(amount, assetScale, assetCode) {
		this.amount = amount;
		this.assetScale = assetScale;
		this.assetCode = assetCode;
	}

	/**
	 * This function takes an object with the same properties as WebMonetizationAsset,
	 * i.e. an WebMonetizationAsset instance which has been stored and loaded from browser storage,
	 * and copies the object's properties over to an WebMonetizationAsset instance.
	 *
	 * @param {Object} webMonetizationAsset an object with the same properties as an WebMonetizationAsset object.
	 * @return {WebMonetizationAsset} the input object as an instance of the WebMonetizationAsset class.
	 */
	static fromObject(webMonetizationAsset) {
		const newWebMonetizationAsset =
			new WebMonetizationAsset(
				webMonetizationAsset.amount,
				webMonetizationAsset.assetScale,
				webMonetizationAsset.assetCode
			);

		return newWebMonetizationAsset;
	}

	/**
	 * assetScale and amount e.g.
	 *		 if assetCode is 'USD', amount is 235, and assetScale is 3 then actual amount of
	 *		 currency is 235 * 10**(-3) = $0.235 USD or twenty-three and one-half cents.
	 *
	 * @param {Number} amount the total amount of the currency, before scaling by assetScale.
	 * @param {Number} assetScale multiply amount by 10 to the power of negative assetScale to
	 * convert to actual currency value.
	 */
	addAmount(amount, assetScale) {
		// Always convert to a smaller asset scale to avoid a fractional amount.
		if (this.assetScale < assetScale) {
			this.convertAmountToNewAssetScale(assetScale);
		}
		this.amount += amount;
	}

	convertAmountToNewAssetScale(newScale) {
		const scaleDifference = newScale - this.assetScale;

		this.amount * 10**scaleDifference;
		this.assetScale = newScale;
	}
}
