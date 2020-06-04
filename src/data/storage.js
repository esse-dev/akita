/**
 * "enum" of available Akita data types as a convenience to
 * storeDataIntoAkitaFormat().
 */
const AKITA_DATA_TYPE = {
	'PAYMENT': 0,
	'ORIGIN_VISIT_DATA': 1,
	'ORIGIN_TIME_SPENT': 2
};

const ORIGIN_NAME_LIST_KEY = 'originList';
let webBrowser = chrome ? chrome : browser;

/**
 * Updates application data by saving data to local extension storage in a
 * special Akita format. Using this method ensures that the data in storage
 * maintains the Akita format structure. For an example of the Akita format
 * see ./example_data.json
 * 
 * @param {Object} data Data to store. May be null if no data included.
 * @param {AKITA_DATA_TYPE} typeOfData The type of param data, should be one of AKITA_DATA_TYPE.
 */
async function storeDataIntoAkitaFormat(data, typeOfData) {
	// TODO: ensure typeOfData is one of AKITA_DATA_TYPE

	const origin = window.location.origin;
	// Start getting originList asynchronously
	const originListPromise = getOriginList();

	// Get and update existing data for this origin if it exists, or create a new
	// piece of data if it does not.
	let originData = await loadOriginData(origin);
	const originDataExists = originData !== null;
	if (!originDataExists) {
		originData = new AkitaOriginData(origin);
	}

	if (AKITA_DATA_TYPE.PAYMENT === typeOfData) {
		originData.updatePaymentData(data);
	} else if (AKITA_DATA_TYPE.ORIGIN_VISIT_DATA === typeOfData) {
		originData.updateVisitData();
	} else if (AKITA_DATA_TYPE.ORIGIN_TIME_SPENT === typeOfData) {
		originData.addTimeSpent(data);
	}

	// Overwrite or create the data for this origin in storage
	await storeOriginData(origin, originData);

	// If data does not already exist for this origin, then the origin must not
	// be in the originList, so add it.
	if (!originDataExists) {
		const originList = await originListPromise;

		originList.push(origin);
		await storeOriginList(originList);
	}
}

// Helper functions.

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

/**
 * Asynchronously gets all AkitaOriginData in storage, as well as a list of all website origins
 * which have data stored.
 *
 * @return {Promise<{ originList: string[], originDataList: AkitaOriginData[] }>}
 */
async function loadAllData() {
	const originList = await getOriginList();

	const promiseList = [];
	for (const origin of originList) {
		promiseList.push(loadOriginData(origin));
	}

	return {
		[ORIGIN_NAME_LIST_KEY]: originList,
		originDataList: await Promise.all(promiseList)
	};
}

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
