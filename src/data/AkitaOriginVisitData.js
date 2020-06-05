/**
 * Holds visit data for an origin.
 * 
 * Refer to originVisitData in example_data.json for examples.
 * 
 * Visit data includes:
 *   - amount of time spent at origin since using Akita (in milliseconds)
 *   - number of visits recorded in Akita
 *   - date of first visit recorded in Akita (format: YYYY-MM-DD)
 *   - date of most recent visit recorded in Akita (format: YYYY-MM-DD)
 */
class AkitaOriginVisitData {
	timeSpentAtOrigin = 0; // time in milliseconds
	numberOfVisits = 0;
	dateOfFirstVisit = "";
	dateOfMostRecentVisit = "";

	/**
	 * This function takes an object with the same properties as AkitaOriginVisitData,
	 * i.e. an AkitaOriginVisitData instance which has been stored and loaded from browser storage,
	 * and copies the object's properties over to an AkitaOriginVisitData instance.
	 *
	 * @param {Object} akitaOriginVisitDataObject an object with the same properties as an AkitaOriginVisitData object.
	 * @return {AkitaOriginVisitData} the input object as an instance of the AkitaOriginVisitData class.
	 */
	static fromObject(akitaOriginVisitDataObject) {
		let newOriginVisitData = null;

		if (akitaOriginVisitDataObject !== null) {
			newOriginVisitData = new AkitaOriginVisitData();
			newOriginVisitData.timeSpentAtOrigin = akitaOriginVisitDataObject.timeSpentAtOrigin;
			newOriginVisitData.numberOfVisits = akitaOriginVisitDataObject.numberOfVisits;
			newOriginVisitData.dateOfFirstVisit = akitaOriginVisitDataObject.dateOfFirstVisit;
			newOriginVisitData.dateOfMostRecentVisit = akitaOriginVisitDataObject.dateOfMostRecentVisit;
		}
		
		return newOriginVisitData;
	}

	/**
	 * Update the total time spent by adding the recent time to the total.
	 * 
	 * @param {Number} recentTimeSpentAtOrigin The new amount of time spent at the origin.
	 */
	addTimeSpent(recentTimeSpentAtOrigin = 0) {
		this.timeSpentAtOrigin += recentTimeSpentAtOrigin;
	}

	/**
	 * Update the visit data.
	 */
	updateVisitData() {
		this.numberOfVisits += 1;
		this.dateOfMostRecentVisit = this.getCurrentDateAsYYYYMMDD();

		if (this.dateOfFirstVisit === "") {
			// We haven't already stored the date of first visit
			this.dateOfFirstVisit = this.dateOfMostRecentVisit;
		}
	}

	/**
	 * Return the current date formatted as YYYY-MM-DD.
	 * 
	 * @return {Number} The current date.
	 */
	getCurrentDateAsYYYYMMDD() {
		const DASH = '-';
		const currentDate = new Date();
		const currentYear = currentDate.getFullYear();
		const currentMonth = this.formatNumberAsDateString(currentDate.getMonth() + 1); // +1 since month is 0-indexed in javascript :(
		const currentDay = this.formatNumberAsDateString(currentDate.getDay());

		const dateString = currentYear + DASH + currentMonth + DASH + currentDay;

		return dateString;
	}

	/**
	 * Prepend the number with a zero if its value is between
	 * zero and ten, so that it is compatible in date strings.
	 * 
	 * e.g. If number = 6, return "06"
	 * 
	 * @param {Number} number Value to format as a date number.
	 * @return The formatted number. 
	 */
	formatNumberAsDateString(number) {
		if (number < 10 && number > 0) {
			return "0" + number;
		}
	}
}
