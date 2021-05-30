/**
 * "enum" of available Akita data types as a convenience to
 * storeDataIntoAkitaFormat().
 */
const AKITA_DATA_TYPE = {
	'PAYMENT': 0,
	'VISIT_DATA': 1,
	'TIME_SPENT': 2,
	'ORIGIN_FAVICON': 3
};
const VALID_AKITA_DATA_TYPE_VALUES = Object.values(AKITA_DATA_TYPE);

const ORIGIN_NAME_LIST_KEY = 'originList';
const ORIGIN_STATS_KEY = 'originStats';
const ORIGIN_DATA_LIST_KEY = 'originDataList';
let webBrowser = chrome ? chrome : browser;

// Promise used for locking when storing data to local storage
let storeDataLockPromise = Promise.resolve();

/**
 * Store data for a monetized origin.
 *
 * @param {Object} data Data to store. May be null if no data included.
 * @param {AKITA_DATA_TYPE} typeOfData The type of param data, should be one of AKITA_DATA_TYPE.
 * @param {string} origin The origin of the page storing the data. Defaults to window.location.origin.
 */
async function storeDataIntoAkitaFormat(data, typeOfData, origin=window.location.origin) {
	const resolveLock = await acquireStoreLock();

	// Start getting originList asynchronously
	const originListPromise = getOriginList();

	// Get and update existing data for this origin if it exists, or create a new
	// piece of data if it does not.
	let originData = await loadOriginData(origin);
	const originDataExists = originData !== null;
	if (!originDataExists) {
		originData = new AkitaOriginData(origin);
	}

	await updateAkitaData(originData, data, typeOfData, isMonetizedData = true);

	// Overwrite or create the data for this origin in storage
	await storeOriginData(origin, originData);

	// If the origin is monetized and data does not already exist for this origin,
	// then the origin must not be in the originList, so add it.
	if (!originDataExists) {
		const originList = await originListPromise;

		originList.push(origin);
		await storeOriginList(originList);
	}

	resolveLock();
}

/**
 * Store data for a non-monetized origin.
 *
 * @param {Object} data Data to store. May be null if no data included.
 * @param {AKITA_DATA_TYPE} typeOfData The type of param data, should be one of AKITA_DATA_TYPE.
 */
async function storeDataIntoAkitaFormatNonMonetized(data, typeOfData) {
	const resolveLock = await acquireStoreLock();

	// There is no origin data when storing non-monetized data
	await updateAkitaData(originData = null, data, typeOfData, isMonetizedData = false);

	resolveLock();
}

/**
 * Updates application data by saving data to local extension storage in a
 * special Akita format. Using this method ensures that the data in storage
 * maintains the Akita format structure. For an example of the Akita format
 * see ./example_data.json
 *
 * @param {AkitaOriginData} originData The origin data to store data for. Will be null if storing
 *		data for a non-monetized origin.
 * @param {Object} data Data to store. May be null if no data included.
 * @param {AKITA_DATA_TYPE} typeOfData The type of param data, should be one of AKITA_DATA_TYPE.
 * @param {Boolean} isMonetizedData Whether or not the data being stored is for a monetized origin.
 */
async function updateAkitaData(originData, data, typeOfData, isMonetizedData) {
	if (!VALID_AKITA_DATA_TYPE_VALUES.includes(typeOfData)) {
		throw "invalid typeOfData passed to updateAkitaData";
	}

	// Get existing originStats or create it if it doesn't already exist
	let originStats = await loadOriginStats();

	if (!originStats) {
		originStats = new AkitaOriginStats();
	}

	switch (typeOfData) {
		case AKITA_DATA_TYPE.PAYMENT: // Only for a monetized origin
			updatePaymentData(originData, originStats, data);
			break;
		case AKITA_DATA_TYPE.VISIT_DATA:
			if (isMonetizedData) {
				originData.updateVisitData();
			} else {
				originStats.incrementTotalVisits();
			}
			break;
		case AKITA_DATA_TYPE.TIME_SPENT:
			updateTimeSpent(originData, originStats, data, isMonetizedData);
			break;
		case AKITA_DATA_TYPE.ORIGIN_FAVICON: // Only for a monetized origin
			storeOriginFavicon(originData.origin, data);
			break;
	}

	// Overwrite or create origin stats in storage
	await storeOriginStats(originStats);
}

/**
 * Given an origin and an absolute or relative path to a favicon, this function:
 *   - fetches the favicon to check if it is a valid favicon,
 *     - if the fetch is successful, the favicon is valid, so the origin's orginData favicon is set
 *     to the given favicon path,
 *     - if the fetch is unsuccessful, the origin's originData favicon is set to "",
 *   - finally, the updated originData is stored.
 *
 * Note: this function's implementation assumes that the specified origin's data has been created
 * and stored prior to the critical section.
 *
 * @param {String} origin The origin to set a favicon for.
 * @param {String} faviconPath The absolute or relative path to the origin's favicon.
 */
 async function storeOriginFavicon(origin, faviconPath) {
	const absoluteFaviconPath = pathToAbsolutePath(faviconPath, origin);
	const isFaviconValid = await isFetchStatusOk(absoluteFaviconPath);

	// Once/If the favicon resolves, store the originData with the favicon included:
	const resolveLock = await acquireStoreLock();

	// Get and update existing data for this origin.
	let originData = await loadOriginData(origin);
	if (isFaviconValid) {
		originData.setOriginFavicon(absoluteFaviconPath);
	} else {
		originData.setOriginFavicon("");
	}

	// Update the data for this origin in storage
	await storeOriginData(origin, originData);
	resolveLock();
}


/***********************************************************
 * Locking Functions
 ***********************************************************/

/**
 * Adds a promise to the data store lock chain. Promises in the chain are
 * resolved sequentially in the order they are added to the chain.
 * Data needs to be stored synchronously since simultaenous asynschronous stores
 * might overwrite each other otherwise. As such, this should be called before the
 * critical section to store data is executed.
 *
 * @return {Promise<>} The resolve function for the lock promise, to be used
 * by releaseStoreLock() to release exclusive access to store data.
 */
async function acquireStoreLock() {
	// Capture the data lock promise before chaining the new one
	const previousStoreDataLockPromise = storeDataLockPromise;

	// Create the new data lock promise
	let newLockResolver = null;
	let newStoreDataLockPromise = new Promise((resolve, reject) => {
		newLockResolver = resolve;
	});

	// Add the new promise to the data lock promise chain
	storeDataLockPromise = storeDataLockPromise.then(() => newStoreDataLockPromise);

	// Wait for the previous data lock promise to resolve
	await previousStoreDataLockPromise;

	return newLockResolver;
}

/***********************************************************
 * Helper Functions
 ***********************************************************/

/**
 * Update payment data in originData and in originStats.
 *
 * @param {AkitaOriginData} originData The origin data to update.
 * @param {AkitaOriginStats} originStats The origin stats to update.
 * @param {{
 *	paymentPointer: String,
 *	validationTimestamp: Number,
 *	amount?: Number,
 *	assetScale?: Number,
 *	assetCode?: String
 * }} paymentData
 * 	 This object may be created, or a Web Monetization event detail object can be used.
 * 	 Pass in an object with just a paymentPointer to register a payment pointer for
 * 	 the current website. Payment pointer should be validated first.
 *	 Optionally pass in validationTimestamp to set when the payment pointer was most
 *	 recently validated.
 * 	 Additionally pass in assetCode, assetScale, and amount together to add to the
 * 	 total amount sent to the current website.
 */
function updatePaymentData(originData, originStats, paymentData) {
	originData.updatePaymentData(paymentData);
	originStats.updateAssetsMapWithAsset(paymentData);
}

/**
 * Update time spent in originData and in originStats.
 *
 * @param {AkitaOriginData} originData The origin data to update.
 * @param {AkitaOriginStats} originStats The origin stats to update.
 * @param {Number} recentTimeSpent Amount of recent time spent at the origin.
 * @param {Boolean} isMonetizedTime If the recent time spent was monetized or not.
 */
function updateTimeSpent(originData, originStats, recentTimeSpent, isMonetizedTime) {
	if (isMonetizedTime) {
		originData.addMonetizedTimeSpent(recentTimeSpent);
	}

	originStats.updateTimeSpent(recentTimeSpent, isMonetizedTime);
}

/**
 * Makes an absolute path from an input path which is either relative or absolute. If the input path
 * is absolute, the input path is returned unchanged. If the input path is relative, an absolute
 * path on the given origin is made with the input path.
 *
 * @param {String} path A path to convert to an absolute path, or check that it is already an absolute path.
 * @param {String} origin If the path is relative, this param is he origin which the path is
 * relative to. Not used if the path is absolute.
 * @returns {String} The input path as an absolute path.
 */
function pathToAbsolutePath(path, origin) {
	// Regex pattern for the start of the path
	const pathStartPattern = /^(https?:\/\/)(www\.)?/i; // i = ignore case (case insensitive)

	if (pathStartPattern.test(path)) {
		// The favicon path is an absolute path
		return path;
	} else {
		// The favicon path is relative to the origin
		if ((origin.charAt(origin.length) !== '/')
			&& (path.charAt(0) !== '/')
		) {
			return origin + "/" + path;
		} else {
			return origin + path;
		}
	}
}

/**
 * Fetches a url and resolves to true if the response has status 200 OK.
 *
 * @param {String} url The url to be requested by the browser.
 * @returns {Promise<Boolean>} true if the request response has status 200 OK, false otherwise.
 */
async function isFetchStatusOk(url) {
	let response = await fetch(url);

	return (200 === response?.status);
}

/***********************************************************
 * Load/Store Origin Stats
 ***********************************************************/

/**
 * Load origin stats from storage.
 *
 * @return {Promise<string[]>} asynchronously load from storage. Resolves to the origin stats.
 **/
async function loadOriginStats() {
	return new Promise((resolve, reject) => {
		webBrowser.storage.local.get(
			ORIGIN_STATS_KEY,
			(storageObject) => {
				const loadedObject = storageObject[ORIGIN_STATS_KEY];
				if (loadedObject) {
					resolve(AkitaOriginStats.fromObject(loadedObject));
				} else {
					resolve(null);
				}
			}
		);
	});
}

/**
 * Store origin stats to storage.
 *
 * @param {AkitaOriginStats]} originStats an AkitaOriginStats object.
 * @return {Promise<AkitaOriginStats>} asynchronously store (overwrite) data in storage. Resolves to the AkitaOriginStats object which was stored.
 **/
async function storeOriginStats(originStats) {
	return new Promise((resolve, reject) => {
		const storageSetterObject = {};
		storageSetterObject[ORIGIN_STATS_KEY] = originStats;

		webBrowser.storage.local.set(
			storageSetterObject,
			() => resolve(originStats)
		);
	});
}

/***********************************************************
 * Load/Store Origin Data
 ***********************************************************/

/**
 * Get the entire list of origin data, 'originDataList' in example_data.json
 *
 * @return {Promise<[AkitaOriginData]>} asynchronously load from storage.
 *   Resolves to a list of all AkitaOriginData in storage.
 */
async function getOriginDataList() {
	const originList = await getOriginList();

	return new Promise((resolve, reject) => {
		webBrowser.storage.local.get(
			originList,
			(storageObject) => {
				if (storageObject) {
					let originDataList = [];

					for (const originData in storageObject) {
						originDataList.push(AkitaOriginData.fromObject(storageObject[originData]));
					}

					resolve(originDataList);
				} else {
					resolve(null);
				}
			}
		);
	});
}

/**
 * @param {string} origin identify a website by origin.
 * @return {Promise<AkitaOriginData>} asynchronously load from storage.
 *	 Resolves to the AkitaOriginData associated with the website.
 */
async function loadOriginData(origin) {
	return new Promise((resolve, reject) => {
		webBrowser.storage.local.get(
			origin,
			(storageObject) => {
				const loadedObject = storageObject[origin];
				if (loadedObject) {
					resolve(AkitaOriginData.fromObject(loadedObject));
				} else {
					resolve(null);
				}
			}
		);
	});
}

/**
 * @param {string} origin identify a website by origin.
 * @param {AkitaOriginData} akitaOriginData set (overwrite) AkitaOriginData associated with the website.
 * @return {Promise<AkitaOriginData>} asynchronously store. Resolves when data has been stored.
 */
async function storeOriginData(origin, akitaOriginData) {
	return new Promise((resolve, reject) => {
		const storageSetterObject = {};
		storageSetterObject[origin] = akitaOriginData;

		webBrowser.storage.local.set(
			storageSetterObject,
			() => resolve(akitaOriginData)
		);
	});
}

/***********************************************************
 * Load All Data
 ***********************************************************/

/**
 * Asynchronously gets all AkitaOriginData in storage, as well as a list of all website origins
 * which have data stored.
 *
 * @return {Promise<{ originList: string[], originDataList: AkitaOriginData[] }>}
 */
async function loadAllData() {
	const originList = await getOriginList();
	const originStats = await loadOriginStats();
	const promiseList = [];

	for (const origin of originList) {
		promiseList.push(loadOriginData(origin));
	}

	return {
		[ORIGIN_NAME_LIST_KEY]: originList,
		[ORIGIN_STATS_KEY]: originStats,
		[ORIGIN_DATA_LIST_KEY]: await Promise.all(promiseList)
	};
}

/***********************************************************
 * Load/Store Origin List
 ***********************************************************/

/**
 * @return {Promise<string[]>} asynchronously load from storage. Resolves to the list of all origins
 *	 which have data stored.
 **/
async function getOriginList() {
	return new Promise((resolve, reject) => {
		webBrowser.storage.local.get(
			ORIGIN_NAME_LIST_KEY,
			(storageObject) => resolve(storageObject[ORIGIN_NAME_LIST_KEY] ?? [])
		);
	});
}

/**
 * @param {string[]} originList a list of origins. Current origin can be obtained by window.location.origin.
 * @return {Promise<string[]>} asynchronously store (overwrite) data in storage. Resolves to the list which was stored.
 **/
async function storeOriginList(originList) {
	return new Promise((resolve, reject) => {
		const storageSetterObject = {};
		storageSetterObject[ORIGIN_NAME_LIST_KEY] = originList;

		webBrowser.storage.local.set(
			storageSetterObject,
			() => resolve(originList)
		);
	});
}
