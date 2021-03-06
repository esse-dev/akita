/**
 * Holds the data associated with a website in the Akita format. Websites are uniquely identified by origin.
 * The Web Monetization documentation recommends that payments are broken down by origin
 * of websites paid. Source: https://webmonetization.org/docs/explainer#auditing--dashboard
 *
 * Website origin reference: https://developer.mozilla.org/en-US/docs/Web/API/Location/origin
 * Website origin e.g. 'https://github.com', 'https://google.com', 'https://dev.to'
 *
 * See ./example_data.json to see example instances of AkitaOriginData.
 */
class AkitaOriginData {
	origin = null;
	faviconSource = null;

	// The type of each entry in paymentPointerMap is: AkitaPaymentPointerData
	paymentPointerMap = {};

	// The type of originVisitData is: AkitaOriginVisitData
	originVisitData = null;

	constructor(origin) {
		this.origin = origin;
		this.originVisitData = new AkitaOriginVisitData();
	}

	/**
	 * This function takes an object with the same properties as AkitaOriginData,
	 * i.e. an AkitaOriginData instance which has been stored and loaded from browser storage,
	 * and copies the object's properties over to an AkitaOriginData instance.
	 *
	 * @param {Object} akitaOriginDataObject an object with the same properties as an AkitaOriginData object.
	 * @return {AkitaOriginData} the input object as an instance of the AkitaOriginData class.
	 */
	static fromObject(akitaOriginDataObject) {
		const newOriginData = new AkitaOriginData(akitaOriginDataObject.origin);
		newOriginData.faviconSource = akitaOriginDataObject.faviconSource;

		for (const paymentPointer in akitaOriginDataObject.paymentPointerMap) {
			newOriginData.paymentPointerMap[paymentPointer] = AkitaPaymentPointerData.fromObject(
				akitaOriginDataObject.paymentPointerMap[paymentPointer]
			);
		}

		// Add deserialization for originVisitData
		const originVisitDataDeserialized = AkitaOriginVisitData.fromObject(akitaOriginDataObject.originVisitData);
		if (originVisitDataDeserialized) {
			newOriginData.originVisitData = originVisitDataDeserialized;
		}

		return newOriginData;
	}

	/**
	 * @param {{
	 *	paymentPointer: String,
	 *	validationTimestamp: Number,
	 *	amount?: Number,
	 *	assetScale?: Number,
	 *	assetCode?: String
	 * }} paymentData
	 *	 This object may be created, or a Web Monetization event detail object can be used.
	 *	 Pass in an object with just a paymentPointer to register a payment pointer for
	 *	 the current website. Payment pointer should be validated first.
	 *	 Optionally pass in validationTimestamp to set when the payment pointer was most
	 *	 recently validated.
	 *	 Optionally pass in assetCode, assetScale, and amount together to add to the
	 *	 total amount sent to the current website.
	 *
	 *	 assetCode e.g. 'XRP', 'USD', 'CAD'
	 *	 assetScale and amount e.g.
	 *		 if assetCode is 'USD', amount is 235, assetScale is 3 then actual amount of
	 *		 currency is 235 * 10**(-3) = $0.235 USD or twenty-three and one-half cents.
	 *
	 *	 reference: https://webmonetization.org/docs/api#example-event-object-3
	 */
	updatePaymentData(paymentData) {
		if (paymentData) {
			const paymentPointer = paymentData.paymentPointer;

			if (paymentPointer) {
				if (!this.paymentPointerMap[paymentPointer]) {
					this.paymentPointerMap[paymentPointer] = new AkitaPaymentPointerData(paymentPointer);
				}

				// Handling for optional argument: validationTimestamp
				const validationTimestamp = paymentData.validationTimestamp;

				if (validationTimestamp) {
					this.paymentPointerMap[paymentPointer].setValidationTimestamp(validationTimestamp);
				}

				// Handling for the 3 optional arguments: amount, assetScale, and assetCode
				const amount = paymentData.amount;
				const assetScale = paymentData.assetScale;
				const assetCode = paymentData.assetCode;

				if (!isNaN(amount) && !isNaN(assetScale) && assetCode) {
					this.paymentPointerMap[paymentPointer].addAsset(amount, assetScale, assetCode);
				}
			}
		}
	}

	/**
	 * Update visit data for the origin.
	 */
	updateVisitData() {
		this.originVisitData.updateVisitData();
	}

	/**
	 * Update monetized time spent at the origin.
	 *
	 * @param {Number} recentMonetizedTimeSpent The recent monetized time spent at the origin.
	 */
	addMonetizedTimeSpent(recentMonetizedTimeSpent = 0) {
		this.originVisitData.addMonetizedTimeSpent(recentMonetizedTimeSpent);
	}

	/**
	 * Store the favicon source.
	 *
	 * @param {String} faviconPath The url of the origin's favicon.
	 */
	storeOriginFavicon(faviconPath) {
		this.faviconSource = faviconPath;
	}

	/**
	 * Calculate the total sent assets at the origin for each currency sent to the payment
	 * pointers seen at the origin and return the data as a map.
	 *
	 * @return {Map<String, Number>} A map containing the sent asset amounts, with the currency
	 * as the key (String) and the sent amount as the value (Number).
	 */
	getTotalSentAssets() {
		if (this.paymentPointerMap) {
			let sentAssetsMap = new Map();

			for (const paymentPointerData of Object.values(this.paymentPointerMap)) {
				for (const sentAssetData of Object.values(paymentPointerData.sentAssetsMap)) {
					const currency = sentAssetData.assetCode;
					let amount = sentAssetData.toAmount();
					const existingAmountForCurrency = sentAssetsMap.get(currency);

					// If the currency for sent assets already exists in the map (for a
					// different payment pointer), then add to the existing amount
					if (existingAmountForCurrency) {
						amount = existingAmountForCurrency + amount;
					}

					sentAssetsMap.set(currency, amount);
				}
			}

			if (sentAssetsMap.size > 0) {
				return sentAssetsMap;
			}
		}

		return null;
	}
}
