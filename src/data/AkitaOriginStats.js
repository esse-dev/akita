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
				totalSentAssetsMap[assetCode]
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
	 * @param {Boolean} originIsMonetized Whether the origin is monetized or not.
	 */
	updateTimeSpent(recentTimeSpent, originIsMonetized) {
		if (originIsMonetized) {
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
	 * @param {Boolean} originIsMonetized Whether the origin is monetized or not.
	 */
	incrementVisits(originIsMonetized) {
		if (originIsMonetized) {
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

	setTotalSentAssetsMap(newTotalSentAssetsMap) {
		this.totalSentAssetsMap = newTotalSentAssetsMap;
	}
}