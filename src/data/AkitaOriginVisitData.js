/**
 * Holds visit data for an origin.
 *
 * Refer to originVisitData in example_data.json for examples.
 *
 * Visit data includes:
 *   - amount of time spent at origin since using Akita (in milliseconds)
 *   - number of visits recorded in Akita
 */
class AkitaOriginVisitData {
	constructor(monetizedTimeSpentNumber = 0, numberOfVisitsNumber = 0) {
		// time in milliseconds
		this.monetizedTimeSpent = monetizedTimeSpentNumber;

		this.numberOfVisits = numberOfVisitsNumber;
	}

	/**
	 * This function takes an object with the same properties as AkitaOriginVisitData,
	 * i.e. an AkitaOriginVisitData instance which has been stored and loaded from browser storage,
	 * and copies the object's properties over to an AkitaOriginVisitData instance.
	 *
	 * @param {Object} akitaOriginVisitDataObject an object with the same properties as an AkitaOriginVisitData object.
	 * @return {AkitaOriginVisitData} the input object as an instance of the AkitaOriginVisitData class.
	 */
	static fromObject(akitaOriginVisitDataObject) {
		const newOriginVisitData = new AkitaOriginVisitData(
			akitaOriginVisitDataObject.monetizedTimeSpent,
			akitaOriginVisitDataObject.numberOfVisits
		);

		return newOriginVisitData;
	}

	/**
	 * Update the total monetized time spent by adding the recent monetized time to the total.
	 *
	 * @param {Number} recentMonetizedTimeSpentAtOrigin The new amount of monetized time spent at the origin.
	 */
	addMonetizedTimeSpent(recentMonetizedTimeSpentAtOrigin = 0) {
		this.monetizedTimeSpent += recentMonetizedTimeSpentAtOrigin;
	}

	/**
	 * Update the visit data.
	 */
	updateVisitData() {
		this.numberOfVisits += 1;
	}
}
