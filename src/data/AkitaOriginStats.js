/**
 * Holds calculated origin stats based on data stored in Akita.
 *
 * Refer to originStats in example_data.json for an example.
 *
 * Origin stats include:
 *   - total time spent at all origins since using Akita (in milliseconds)
 *   - total time spent at all monetized origins since using Akita (in milliseconds)
 *   - total number of visits to all origins recorded in Akita
 *   - total number of visits to monetized origins recorded in Akita
 *   - map of totalSentAssets, with an entry for each currency
 */
class AkitaOriginStats {
	constructor(totalTimeSpentNumber = 0, totalMonetizedTimeSpentNumber = 0, totalVisitsNumber = 0) {
		this.totalTimeSpent = totalTimeSpentNumber;
		this.totalMonetizedTimeSpent = totalMonetizedTimeSpentNumber;
		this.totalVisits = totalVisitsNumber;

		// The type of each entry in totalSentAssetsMap is: WebMonetizationAsset
		this.totalSentAssetsMap = {};
	}

	/**
	 * This function takes an object with the same properties as AkitaOriginStats,
	 * i.e. an AkitaOriginStats instance which has been stored and loaded from browser storage,
	 * and copies the object's properties over to an AkitaOriginStats instance.
	 *
	 * @param {Object} akitaOriginStats an object with the same properties as an AkitaOriginStats object.
	 * @return {AkitaOriginStats} the input object as an instance of the AkitaOriginStats class.
	 */
	static fromObject(akitaOriginStats) {
		const newAkitaOriginStats = new AkitaOriginStats(
			akitaOriginStats.totalTimeSpent,
			akitaOriginStats.totalMonetizedTimeSpent,
			akitaOriginStats.totalVisits
		);

		for (const assetCode in akitaOriginStats.totalSentAssetsMap) {
			newAkitaOriginStats.totalSentAssetsMap[assetCode] = WebMonetizationAsset.fromObject(
				akitaOriginStats.totalSentAssetsMap[assetCode]
			);
		}

		return newAkitaOriginStats;
	}

	/***********************************************************
	 * Update Time Spent
	 ***********************************************************/

	/**
	 * Update the total monetized time spent if the time was monetized; update
	 * the total time spent regardless.
	 *
	 * @param {Number} recentTimeSpent The new amount of time spent at the origin.
	 * @param {Boolean} isMonetizedTime Whether the time spent is monetized or not.
	 */
	updateTimeSpent(recentTimeSpent, isMonetizedTime) {
		this.updateTotalTimeSpent(recentTimeSpent);

		if (isMonetizedTime) {
			this.updateTotalMonetizedTimeSpent(recentTimeSpent);
		}
	}

	/**
	 * Update the total time spent at all origins.
	 *
	 * @param {Number} recentTimeSpent The new amount of time spent at the origin.
	 */
	updateTotalTimeSpent(recentTimeSpent) {
		this.totalTimeSpent += recentTimeSpent;
	}

	/**
	 * Update the total time spent at monetized origins.
	 *
	 * @param {Number} recentTimeSpent The new amount of monetized time spent.
	 */
	updateTotalMonetizedTimeSpent(recentTimeSpent) {
		this.totalMonetizedTimeSpent += recentTimeSpent;
	}

	/***********************************************************
	 * Update Visits
	 ***********************************************************/

	/**
	 * Increment the total visits to origins.
	 */
	incrementTotalVisits() {
		this.totalVisits += 1;
	}

	/***********************************************************
	 * Total Sent Assets Map
	 ***********************************************************/

	/**
	 * Update the total sent assets map by adding the amount to an existing
	 * asset (currency) or create a new asset in the total sent assets map.
	 *
	 * @param {{
	 *	paymentPointer: String,
	 *	amount?: Number,
	 *	assetScale?: Number,
	 *	assetCode?: String
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
	updateAssetsMapWithAsset({
		paymentPointer,
		amount = null,
		assetScale = null,
		assetCode = null
	}) {
		if (!isNaN(amount) && !isNaN(assetScale) && assetCode) {
			if (!this.totalSentAssetsMap[assetCode]) {
				this.totalSentAssetsMap[assetCode] = new WebMonetizationAsset(assetCode);
			}
			this.totalSentAssetsMap[assetCode].addAmount(amount, assetScale);
		}
	}

	/**
	 * Calculate the total sent assets across all origins for each currency sent to the payment
	 * pointers seen and return the data as a map.
	 *
	 * @return {Map<String, Number>} A map containing the sent asset amounts, with the currency
	 * as the key (String) and the sent amount as the value (Number).
	 */
	getTotalSentAssets() {
		if (this.totalSentAssetsMap) {
			let sentAssetsMap = new Map();

			for (const sentAssetData of Object.values(this.totalSentAssetsMap)) {
				const currency = sentAssetData.assetCode;
				sentAssetsMap.set(currency, sentAssetData.toAmount());
			}

			if (sentAssetsMap.size > 0) {
				return sentAssetsMap;
			}
		}

		return null;
	}
}
