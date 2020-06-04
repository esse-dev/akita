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
	isMonetized = false;
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
		newOriginData.isMonetized = akitaOriginDataObject.isMonetized;

		for (const paymentPointer in akitaOriginDataObject.paymentPointerMap) {
			newOriginData.paymentPointerMap[paymentPointer] = AkitaPaymentPointerData.fromObject(
				akitaOriginDataObject.paymentPointerMap[paymentPointer]
			);
		}

		// Add deserialization for originVisitData
		const originVisitDataDeserialized = AkitaOriginVisitData.fromObject(akitaOriginDataObject.originVisitData);
		if (originVisitDataDeserialized !== null) {
			newOriginData.originVisitData = originVisitDataDeserialized;
		}

		return newOriginData;
	}

	/**
	 * @param {{
	 *	paymentPointer: String,
	 *	assetCode?: String,
	 *	assetScale?: Number,
	 *	amount?: Number
	 * }} paymentData
	 *	 This object may be created, or a Web Monetization event detail object can be used.
	 *	 Pass in an object with just a paymentPointer to register a payment pointer for
	 *	 the current website. Payment pointer should be validated first.
	 *	 Additionally pass in assetCode, assetScale, and amount together to add to the
	 *	 total amount sent to the current website.
	 *
	 *	 assetCode e.g. 'XRP', 'USD', 'CAD'
	 *	 assetScale and amount e.g.
	 *		 if assetCode is 'USD', amount is 235, assetScale is 3 then actual amount of
	 *		 currency is 235 * 10**(-3) = $0.235 USD or twenty-three and one-half cents.
	 *
	 *	 reference: https://webmonetization.org/docs/api#example-event-object-3
	 */
	updatePaymentData({
		paymentPointer,
		assetCode = null,
		assetScale = null,
		amount = null
	}) {
		if (paymentPointer) {
			this.isMonetized = true;
			if (!this.paymentPointerMap[paymentPointer]) {
				this.paymentPointerMap[paymentPointer] = new AkitaPaymentPointerData(paymentPointer);
			}
			if (assetCode !== null && amount !== null && assetScale !== null) {
				this.paymentPointerMap[paymentPointer].addAsset(assetCode, Number(amount), Number(assetScale));
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
	 * Update time spent at the origin.
	 * 
	 * @param {Number} recentTimeSpent The time spent at the origin in a session.
	 */
	addTimeSpent(recentTimeSpent = 0) {
		this.originVisitData.addTimeSpent(recentTimeSpent);
	}
}
