// Section navigation
let otherSection = document.getElementById('intro-carousel');
let currentSection =  document.getElementById('data-story');
function switchSection() {
	let swapTemp = otherSection;
	otherSection = currentSection;
	currentSection = swapTemp;

	currentSection.scrollIntoView({
		behavior: 'smooth'
	});
}

// Slideshow / carousel
new Flickity(document.getElementById('flickity'), {
	on: { change: (slideNumber) => {
		if (slideNumber === 5) {
			document.getElementById('intro-exit').innerHTML = 'done';
            document.getElementById('intro-exit').style.color = '#C31354';
		} else {
			document.getElementById('intro-exit').innerHTML = 'skip';
			document.getElementById('intro-exit').style.color = '#000000';
		}
	}}
});

// Only default to the tutorial screen on first load
webBrowser.storage.local.get('seenTutorial', ({ seenTutorial }) => {
	if (!seenTutorial) {
		switchSection();
		webBrowser.storage.local.set({ seenTutorial:true });
	}
})

document.getElementById('intro-exit').addEventListener('click', switchSection);
document.getElementById('goto-intro').addEventListener('click', switchSection);

function convertMSToNiceTimeString(ms) {
	let seconds = ms / 1000;
	let days = seconds / (24 * 3600);
	let hours = seconds / 3600;
	let minutes = seconds / 60;
	let niceTimeString = "";
	let isSingularUnit = false;

	if (days >= 1) {
		niceTimeString = `${days.toFixed(2)} days`;
		if (days === 1) isSingularUnit = true;
	} else if ((hours >= 1) && (hours < 24)) {
		niceTimeString = `${hours.toFixed(2)} hours`;
		if (hours === 1) isSingularUnit = true;
	} else if ((minutes >= 1) && (minutes < 60)) {
		let roundedMinutes = Math.round(minutes);
		niceTimeString = `${roundedMinutes} minutes`;
		if (roundedMinutes === 1) isSingularUnit = true;
	} else if ((seconds >= 1) && (seconds < 60)) {
		let roundedSeconds = Math.round(seconds);
		niceTimeString = `${roundedSeconds} seconds`;
		if (roundedSeconds === 1) isSingularUnit = true;
	} else {
		return `${ms} ms`;
	}

	// remove the "s" from the end of the string if the unit is singular
	return isSingularUnit ? niceTimeString.slice(0, -1) : niceTimeString;
}

getStats();
async function getStats() {
    const originStats = await loadOriginStats();

	if (originStats && originStats.totalVisits > 0) {
		document.getElementById('monetized-time-data').innerHTML = convertMSToNiceTimeString(originStats.totalMonetizedTimeSpent);

		if (originStats.totalSentAssetsMap?.XRP?.amount > 0) {
			const sentXRP = originStats.totalSentAssetsMap.XRP;
			const actualAmount = sentXRP.amount * 10**(-sentXRP.assetScale);
			document.getElementById('monetized-sent-data').innerHTML = actualAmount.toFixed(3) + '<span style="font-size: 12px;">XRP</span>';
		} else {
			document.getElementById('monetized-sent-text').innerHTML = 'if you were using <a href="https://www.coil.com/">Coil</a> you would have sent '
			document.getElementById('monetized-sent-data').innerHTML = '$' + getEstimatedPaymentForTimeInUSD(originStats.totalMonetizedTimeSpent) + '<span style="font-size: 12px;">USD</span>';
		}

		const monetizedTimePercent = getMonetizedTimeSpentPercent(originStats);
		if (monetizedTimePercent) {
			document.getElementById('monetized-percent-data').innerHTML = monetizedTimePercent+'%';
		} else {
			// TODO: ADD A CHANGE OF TEXT!
			document.getElementById('monetized-percent-data').innerHTML = '0%';
		}
	} else {
		document.getElementById('info-container').innerHTML = `You haven't visited any websites yet! What are you waiting for? Get out there and explore the wild wild web.`;
	}

	if (originStats.totalSentAssetsMap?.XRP?.amount > 0) {
        const needsLoveContainer = document.getElementById('sites-need-love-container');
        const linkGrid = document.getElementsByClassName('link-grid')[0];
        linkGrid.style.display = 'none';

		const needLoveOrigins = await getTopOriginsThatNeedSomeLove(3);

		if (needLoveOrigins.length > 0) {
			for (const originData of needLoveOrigins) {
				if ((originData.faviconSource) && (originData.faviconSource !== "")) {
					const faviconEl = createFaviconImgElement(originData.faviconSource);
					faviconEl.addEventListener("click", () => {
						webBrowser.tabs.create({ url: originData.origin });
					}, false);

					needsLoveContainer.appendChild(faviconEl);
				}

				const linkEl = document.createElement('a');
				linkEl.href = originData.origin;

				// strip 'https://' or 'http://' and 'www.' from the beginning of the origin
				linkEl.innerHTML = originData.origin.replace(/^(https?:\/\/)(www\.)?/, "");

				needsLoveContainer.appendChild(linkEl);
				const brEl = document.createElement('br');
				needsLoveContainer.appendChild(brEl);
			}
		} else {
			const el = document.createElement('span');
			el.innerHTML = 'No sites visited yet!';

			needsLoveContainer.appendChild(el);
		}
	} else {
		const needsLoveContainer = document.getElementById("sites-need-love-container");
		needsLoveContainer.style.display = 'none';
	}

	// Make all links in extension popup clickable
	var links = document.getElementsByTagName("a");

	for (const link of Array.from(links)) {
		if (link.id !== 'goto-intro') {
			link.addEventListener("click", () => {
				webBrowser.tabs.create({ url: link.href });
			}, false);
		}
	}

	// Top sites visualization with circles
	const topOrigins = await getTopOriginsByTimeSpent(6);
	let circleWeights = [];
	for (const originData of topOrigins) {
		const timeSpent = originData?.originVisitData.timeSpentAtOrigin;
		circleWeights.push(timeSpent);
	}

	// Circles
	const CIRCLE_COLORS = ['#F96060', '#42D2B8', '#92DEFF', '#FFF27B', '#9F88FC'];

	const circleContainer = document.getElementById('circle-container');
	const CIRCLE_MARGIN_SIZE = 10; // This is 2 * .circle margin
	const CIRCLE_PADDING_SIZE = 24; // This is 2 * .circle padding
	const CIRCLE_BORDER_SIZE = 6; // This is 2 * .circle:hover border
	const square = {
		height: circleContainer.clientHeight - (CIRCLE_MARGIN_SIZE + CIRCLE_PADDING_SIZE) - CIRCLE_BORDER_SIZE - 1,
		width: circleContainer.clientWidth - (CIRCLE_MARGIN_SIZE + CIRCLE_PADDING_SIZE) * circleWeights.length - CIRCLE_BORDER_SIZE - 1
	};

	const circleWeightsSum = circleWeights.reduce((prev, cur) => prev + cur, 0);

	// Ensure that the circles are as big as possible, but not so big they overflow, and in scale with each other.
	const areaNormalizationFactor = Math.min(square.width / circleWeightsSum, square.height / circleWeights[0]);
	circleWeights = circleWeights.map(weight => weight * areaNormalizationFactor);

	for (let i = 0; i < circleWeights.length; i++) {
		const circleEl = document.createElement('div');
		const circleWeight = circleWeights[i];
		const color = CIRCLE_COLORS[i];

		const originData = topOrigins[i];
		const totalSentXRP = calculateTotalSentXRPForOrigin(originData);

		circleEl.className = 'circle';
		circleEl.style.background = color;
		circleEl.style.height = circleWeight + 'px';
		circleEl.style.width = circleWeight + 'px';

		if ((originData.faviconSource) && (originData.faviconSource !== "")) {
			const faviconEl = createFaviconImgElement(originData.faviconSource);
			circleEl.appendChild(faviconEl);
		}

		if (circleWeight > 40) {
			let circleFontSize = Math.round(circleWeight / 6);
			// Font size should be no smaller than 11, otherwise it's not legible
			if (circleFontSize > 11) {
				const div = document.createElement('div');
				div.innerHTML = createTopSiteCircleHTML(originData, totalSentXRP);
				circleEl.appendChild(div);
				circleEl.style.fontSize = circleFontSize + 'px';
			}
		}

		const detailHTML = createTopSiteDetailHTML(originData, totalSentXRP, originStats);
		circleEl.addEventListener('mouseover', () => showTopSiteDetail(detailHTML, color));
		circleEl.addEventListener('mouseleave', () => hideElement(topSiteDetailEl));
		circleEl.addEventListener("click", () => {
			webBrowser.tabs.create({ url: originData.origin });
		}, false);

		circleContainer.appendChild(circleEl);
	}
}


function createFaviconImgElement(faviconSource) {
	const faviconEl = document.createElement('img');
	faviconEl.src = faviconSource;

	// Set height and width to standard favicon size
	faviconEl.width = 16;
	faviconEl.height = 16;

	// Make favicon round
	faviconEl.style.borderRadius = "50%";

	return faviconEl;
}

function createTopSiteCircleHTML(originData, totalSentXRP) {
	const visitData = originData?.originVisitData;
	const visitText = (visitData.numberOfVisits === 1) ? "visit" : "visits";

	if (totalSentXRP > 0) {
		return `${convertMSToNiceTimeString(visitData.timeSpentAtOrigin)}<br>${totalSentXRP.toFixed(3)} XRP<br>${visitData.numberOfVisits} ` + visitText;
	} else {
		return `${convertMSToNiceTimeString(visitData.timeSpentAtOrigin)}<br>${visitData.numberOfVisits} ` + visitText;
	}
}

function createTopSiteDetailHTML(originData, totalSentXRP, originStats) {
	if (!originData || !originStats) return "";

	const timeSpent = originData.originVisitData.timeSpentAtOrigin;
	let sentPayment = totalSentXRP.toFixed(3);
	let paymentString = "So far, you've sent";
	if (parseFloat(sentPayment) > 0) {
		sentPayment += '<span style="font-size: 12px;">XRP</span>';
	} else {
		paymentString = 'If you were using Coil you would have sent';
		sentPayment = "$" + getEstimatedPaymentForTimeInUSD(timeSpent) + '<span style="font-size: 12px;">USD</span>';
	}

	let visitCountText = "";
	const visitCount = originData.originVisitData.numberOfVisits;
	if (visitCount === 1) {
		visitCountText = visitCount + " time";
	} else {
		visitCountText = visitCount + " times";
	}

	const origin = originData.origin;
	const percentTimeSpent = getPercentTimeSpentAtOriginOutOfTotal(originData, originStats);
	const percentVisits = getPercentVisitsToOriginOutOfTotal(originData, originStats);

	return `<a href="${origin}" style="color: black; text-decoration: underline;">${origin}</a><br><br>
		You've spent <strong>${convertMSToNiceTimeString(timeSpent)}</strong> here, which is <strong>${percentTimeSpent}%</strong> of your time online.<br><br>
		You've visited <strong>${visitCountText}</strong>, which is <strong>${percentVisits}%</strong> of your total website visits.<br><br>
		${paymentString} <strong>${sentPayment}</strong> to this site.`;
}

const topSiteDetailEl = document.getElementById('top-site-detail');
function showTopSiteDetail(innerHTML, color) {
	topSiteDetailEl.style.zIndex = 1;
	topSiteDetailEl.style.opacity = 1;
	topSiteDetailEl.style.background = color;
	topSiteDetailEl.innerHTML = innerHTML;
}

function hideElement(element) {
	// Make element invisible.
	element.style.opacity = 0;
	// Place element "behind" all other elements so it does not intercept mouse interactions.
	element.style.zIndex = -1;
}
