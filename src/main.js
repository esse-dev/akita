/**
 * This file contains functions used to populate the UI with data.
 */

/***********************************************************
 * Get Top Origins
 ***********************************************************/

/**
 * Get the top N monetized origins based on time spent at the origin.
 * 
 * @param {Number} nTopOrigins The number of top monetized origins to retrieve.
 * @return {Promise<[AkitaOriginData]>} Resolves to a list of nTopOrigins AkitaOriginData objects.
 */
async function getTopOriginsByTimeSpent(nTopOrigins) {
	let monetizedOriginDataList = await getMonetizedOriginDataList();
	let topOriginsList = null;
	let listSize = nTopOrigins - 1;

	if (monetizedOriginDataList) {
		if (monetizedOriginDataList.length > 1) {
			// Sort the list of origin data by timeSpentAtOrigin,
			// i.e. sort by descending time starting from index 0
			monetizedOriginDataList.sort((a, b) => {
				return b.originVisitData.timeSpentAtOrigin - a.originVisitData.timeSpentAtOrigin
			});

			listSize = (listSize < monetizedOriginDataList.length) ? listSize : monetizedOriginDataList.length;
			topOriginsList = monetizedOriginDataList.slice(0, listSize);
		} else {
			topOriginsList = monetizedOriginDataList;
		}
	}

	return topOriginsList;
}

/**
 * Constants used to calculate how much love an origin needs relative to
 * another origin.
 */
const NEEDS_LOVE_MAGIC_NUMBER_MARGIN = 0.25;
const NEEDS_LOVE_MAGIC_NUMBER = 1;

/**
 * Get the top N monetized origins based on how much the origin
 * "needs some love" compared to other monetized origins. 
 * 
 * To calculate how much an origin "needs love", get the ratio of timeSpent
 * to visits. i.e. "needs love ratio" = timeSpentAtOrigin / numberOfVisits.
 * A small ratio indicates that, relative to how many times the user visits
 * the monetized site, they don't seem to spend much time there. We'd like to
 * inform the user if this is the case, so that the user can consider spending
 * more time on that site to support the creator (more time on the site = more
 * payment streamed if they are using a payment provider). A bit more complexity
 * is added to determining relative "love needed" by using the NEEDS_LOVE_MAGIC_NUMBER
 * and NEEDS_LOVE_MAGIC_NUMBER_MARGIN constants.
 * 
 * @param {Number} nTopOrigins The number of "top monetized origins that need some love" to retrieve.
 * @return {Promise<[AkitaOriginData]>} Resolves to a list of nTopOrigins AkitaOriginData objects.
 */
async function getTopOriginsThatNeedSomeLove(nTopOrigins) {
	let monetizedOriginDataList = await getMonetizedOriginDataList();
	let topOriginsList = null;
	let listSize = nTopOrigins;

	if (monetizedOriginDataList) {
		if (monetizedOriginDataList.length > 1) {
			// Sort the list of origin data by the "needs love ratio",
			// i.e. sort by ascending "needs love ratio" starting from index 0
			// The smallest ratios indicate the most "love needed"
			monetizedOriginDataList.sort((a, b) => {
				const needsLoveRatioA = a.originVisitData.timeSpentAtOrigin / a.originVisitData.numberOfVisits;
				const needsLoveRatioB = b.originVisitData.timeSpentAtOrigin / b.originVisitData.numberOfVisits;
				const ratioComparison = needsLoveRatioA / needsLoveRatioB;

				// If Array.prototype.sort() returns 0, 'b' and 'a' will be unchanged with respect to one another
				let sortResult = 0;

				if ((ratioComparison >= NEEDS_LOVE_MAGIC_NUMBER - NEEDS_LOVE_MAGIC_NUMBER_MARGIN)
					&& (ratioComparison <= NEEDS_LOVE_MAGIC_NUMBER)
				) {
					if (a.originVisitData.numberOfVisits > b.originVisitData.numberOfVisits) {
						// If origin 'a' has a slightly smaller needsLoveRatio but has more visits,
						// origin 'b' actually needs more love since the person has spent only a marginally
						// larger amount of time on the site, but with fewer visits. We should encourage
						// them to visit 'b' more!

						// If Array.prototype.sort() returns > 0, 'b' will be placed before 'a' in the array
						return 1;
					} else {
						// Otherwise, if origin 'a' has a smaller needsLoveRatio AND less visits, then
						// it definitely needs more love than 'b'.

						// If Array.prototype.sort() returns < 0, 'a' will be placed before 'b' in the array
						return -1;
					}
				} else {
					// Sort as usual, place the origin with the smaller ratio before the other one
					sortResult = needsLoveRatioA - needsLoveRatioB;
				}
				return sortResult;
			});

			listSize = (listSize < monetizedOriginDataList.length) ? listSize : monetizedOriginDataList.length;
			topOriginsList = monetizedOriginDataList.slice(0, listSize);
		} else {
			topOriginsList = monetizedOriginDataList;
		}
	}

	return topOriginsList;
}

/***********************************************************
 * Payment Prediction
 ***********************************************************/

/**
 * This stream rate is based on Coil's $0.36 USD/hour rate, as
 * described in https://help.coil.com/accounts/membership-accounts#how-much-do-you-pay-out-to-creators
 * 
 * 0.36/hour = 0.0000001/millisecond
 */
const STREAM_RATE_PER_MILLISECOND = 0.0000001;

/**
 * Calculate the estimated payment to the site in USD.
 * 
 * @param {String} origin The origin of the site to estimate payment for.
 * @return {Promise<Number>} The estimated payment to the site in USD.
 */
async function getEstimatedPaymentForOriginUSD(origin) {
	const originData = await loadOriginData(origin);
	let estimatedPayment = 0;

	if (originData) {
		const timeSpentAtOrigin = originData.originVisitData.timeSpentAtOrigin;
		estimatedPayment = Number.parseFloat(timeSpentAtOrigin * STREAM_RATE_PER_MILLISECOND).toFixed(2);
	}

	return estimatedPayment;
}

/**
 * Calculate the total estimated payment in USD based on the timeSpent.
 * 
 * @param {Number} timeSpent The amount of time spent in milliseconds.
 * @return {Number} The estimated payment in USD.
 */
function getEstimatedPaymentForTimeInUSD(timeSpent) {
	return Number.parseFloat(timeSpent * STREAM_RATE_PER_MILLISECOND).toFixed(2);
}

/***********************************************************
 * Various data retrieval functions
 ***********************************************************/

/**
 * Get the percentage of time spent at the origin out of
 * total time spent across all origins.
 * 
 * @param {AkitaOriginData} originData The origin data object.
 * @param {AkitaOriginStats} originStats The origin stats object.
 * @return {Number} The percent of time spent at the origin out of total time spent.
 */
function getPercentTimeSpentAtOriginOutOfTotal(originData, originStats) {
	if (!originData || !originStats) return 0;

	const timeSpentAtOrigin = originData.originVisitData.timeSpentAtOrigin;
	const totalTimeSpent = originStats.totalTimeSpent;

	return toPercent(timeSpentAtOrigin / totalTimeSpent);
}

/**
 * Get the percentage of visits to the origin out of total
 * origin visits.
 * 
 * @param {AkitaOriginData} originData The origin data object.
 * @param {AkitaOriginStats} originStats The origin stats object.
 * @return {Number} The percent of visits to the origin out of total visits.
 */
function getPercentVisitsToOriginOutOfTotal(originData, originStats) {
	if (!originData || !originStats) return 0;

	const visitsToOrigin = originData.originVisitData.numberOfVisits;
	const totalVisits = originStats.totalVisits;

	return toPercent(visitsToOrigin / totalVisits);
}

/**
 * Get the percentage of monetized origin time spent out of
 * total origin time spent.
 * 
 * @param {AkitaOriginStats} originStats The origin stats object.
 * @return {Number} The percent of monetized origin time spent.
 */
function getMonetizedTimeSpentPercent(originStats) {
	if (!originStats) return 0;

	const totalMonetizedTimeSpent = originStats.totalMonetizedTimeSpent;
	const totalTimeSpent = originStats.totalTimeSpent;

	return toPercent(totalMonetizedTimeSpent / totalTimeSpent);
}

/**
 * Get the percentage of monetized origin visits out of total
 * origin visits.
 * 
 * @param {AkitaOriginStats} originStats The origin stats object.
 * @return {Number} The percent of monetized origin visits.
 */
function getMonetizedVisitsPercent(originStats) {
	if (!originStats) return 0;

	const totalMonetizedVisits = originStats.totalMonetizedVisits;
	const totalVisits = originStats.totalVisits;

	return toPercent(totalMonetizedVisits / totalVisits);
}

/**
 * Convert a number to a percent with 2 decimal places.
 * 
 * @param {Number} number The number to convert into a percent.
 * @return {Number} The number as a percent.
 */
function toPercent(number){
	return (100 * number).toFixed(2);
}

/**
 * Get all the monetized originData objects in a list.
 * 
 * @return {Promise<[AkitaOriginData]>} Resolves to a list of monetized AkitaOriginData objects.
 */
async function getMonetizedOriginDataList() {
	const originDataList = await getOriginDataList();

	let monetizedOriginDataList = null;

	if (originDataList !== null) {
		monetizedOriginDataList = originDataList.filter((originData) => originData.isCurrentlyMonetized);
	}

	return monetizedOriginDataList;
}

/**
 * Get the number of unique origins visited.
 * 
 * @return {Promise<Number>} Resolves to the number of unique origins visited.
 */
async function getNumberOfOriginsVisited() {
	const originDataList = await getOriginDataList();
	return originDataList ? originDataList.length : -1;
}

/**
 * Get the number of unique monetized origins visited.
 * 
 * @return {Promise<Number>} Resolves to the number of unique monetized origins visited.
 */
async function getNumberOfMonetizedOriginsVisited() {
	const originDataList = await getMonetizedOriginDataList();
	return originDataList ? originDataList.length : -1;
}
