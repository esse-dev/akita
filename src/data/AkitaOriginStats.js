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
 *   - list of top 5 origins by visit time (ordered by amount of time spent)
 *   - list of top 5 origins by "needing some love" ()
 *   - map of totalSentAssets, with an entry for each currency
 */

class AkitaOriginStats {
	totalTimeSpent = 0;
	totalMonetizedTimeSpent = 0;
	totalVisits = 0;
	totalMonetizedVisits = 0;

	// Each entry is an origin (String)
	topOriginsList = [];

	// Each entry is an origin (String)
	needsSomeLoveList = [];

	// The type of each entry in sentAssetsMap is: WebMonetizationAsset
	totalSentAssetsMap = {};

	/**
	 * This function takes an object with the same properties as AkitaOriginStats,
	 * i.e. an AkitaOriginStats instance which has been stored and loaded from browser storage,
	 * and copies the object's properties over to an AkitaOriginStats instance.
	 *
	 * @param {Object} akitaOriginStats an object with the same properties as an AkitaOriginStats object.
	 * @return {AkitaOriginStats} the input object as an instance of the AkitaOriginStats class.
	 */
	static fromObject(akitaOriginStats) {
		const newAkitaOriginStats = new AkitaOriginStats();

		newAkitaOriginStats.totalTimeSpent = akitaOriginStats.totalTimeSpent;
		newAkitaOriginStats.totalMonetizedTimeSpent = akitaOriginStats.totalMonetizedTimeSpent;
		newAkitaOriginStats.totalVisits = akitaOriginStats.totalVisits;
		newAkitaOriginStats.totalMonetizedVisits = akitaOriginStats.totalMonetizedVisits;
		newAkitaOriginStats.topOriginsList = akitaOriginStats.topOriginsList;
		newAkitaOriginStats.needsSomeLoveList = akitaOriginStats.needsSomeLoveList;
		
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
	 * Update the total monetized time spent if the origin is monetized, and update
	 * the total time spent regardless.
	 * 
	 * @param {Number} recentTimeSpent The new amount of time spent at the origin.
	 * @param {Boolean} originisCurrentlyMonetized Whether the origin is monetized or not.
	 */
	updateTimeSpent(recentTimeSpent, originisCurrentlyMonetized) {
		if (originisCurrentlyMonetized) {
			this.updateTotalMonetizedTimeSpent(recentTimeSpent);
		}
		this.updateTotalTimeSpent(recentTimeSpent);	
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
	 * @param {Number} recentTimeSpent The new amount of time spent at the origin.
	 */
	updateTotalMonetizedTimeSpent(recentTimeSpent) {
		this.totalMonetizedTimeSpent += recentTimeSpent;
	}

	/***********************************************************
	 * Update Visits
	 ***********************************************************/

	/**
	 * Update the total visits to monetized origins if the origin is monetized,
	 * and update the total visits to origins regardless.
	 * 
	 * @param {Boolean} originisCurrentlyMonetized Whether the origin is monetized or not.
	 */
	incrementVisits(originisCurrentlyMonetized) {
		if (originisCurrentlyMonetized) {
			this.incrementTotalMonetizedVisits();
		}
		this.incrementTotalVisits();
	}

	/**
	 * Increment the total visits to origins.
	 */
	incrementTotalVisits() {
		this.totalVisits += 1;
	}

	/**
	 * Increment the total visits to monetized origins.
	 */
	incrementTotalMonetizedVisits() {
		this.totalMonetizedVisits += 1;
	}

	/***********************************************************
	 * Update Lists/Map
	 ***********************************************************/

	setTopOriginsList(newTopOriginsList) {
		this.topOriginsList = newTopOriginsList;
	}

	setNeedsSomeLoveList(newNeedsSomeLoveList) {
		this.needsSomeLoveList = newNeedsSomeLoveList;
	}

	/***********************************************************
	 * Update Total Sent Assets Map
	 ***********************************************************/

	/**
	 * Update the total sent assets map by adding the amount to an existing
	 * asset (currency) or create a new asset in the total sent assets map.
	 * 
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
	updateAssetsMapWithAsset({
		paymentPointer,
		assetCode = null,
		assetScale = null,
		amount = null
	}) {
		if (assetCode !== null && amount !== null && assetScale !== null) {
			if (!this.totalSentAssetsMap[assetCode]) {
				this.totalSentAssetsMap[assetCode] = new WebMonetizationAsset(assetCode);
			}

			this.totalSentAssetsMap[assetCode].addAmount(amount, assetScale);
		}
	}
}