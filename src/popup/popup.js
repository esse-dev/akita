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
			document.getElementById('intro-exit').style.color = '#EF5E92';
			document.getElementById('intro-exit').style.opacity = 1;
		} else {
			document.getElementById('intro-exit').innerHTML = 'skip';
			document.getElementById('intro-exit').style.color = '#000000';
			document.getElementById('intro-exit').style.opacity = 0.5;
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

	if (days > 1) {
		return `${days.toFixed(2)} days`;
	}
	if (hours > 1) {
		return `${hours.toFixed(2)} hours`;
	}
	if (minutes > 1) {
		return `${Math.round(minutes)} minutes`;
	}
	if (seconds > 1) {
		return `${Math.round(seconds)} seconds`;
	}
	return `${ms}ms`;
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
		const monetizedTimePercent = await getMonetizedTimeSpentPercent(originStats);
		if (monetizedTimePercent) {
			document.getElementById('monetized-percent-data').innerHTML = monetizedTimePercent+'%';
		} else {
			// TODO: ADD A CHANGE OF TEXT!
			document.getElementById('monetized-percent-data').innerHTML = '0%';
		}
	} else {
		document.getElementById('info-container').innerHTML = `You haven't visited any websites yet! What are you waiting for? Get out there and explore the wild wild web.`;
	}
	const needLoveOrigins = await getTopOriginsThatNeedSomeLove(3);
	const needLoveSitesEl = document.getElementById('sites-need-love');

	if (needLoveOrigins.length > 0) {
		for (const originData of needLoveOrigins) {
			if ((originData.faviconSource) && (originData.faviconSource !== "")) {
				needLoveSitesEl.appendChild(createFaviconImgElement(originData.faviconSource));
			}
			
			const linkEl = document.createElement('a');
			linkEl.href = originData.origin;

			// strip 'https://' or 'http://' and 'www.' from the beginning of the origin
			linkEl.innerHTML = originData.origin.replace(/^(https?:\/\/)(www\.)?/, "");

			needLoveSitesEl.appendChild(linkEl);
			const brEl = document.createElement('br');
			needLoveSitesEl.appendChild(brEl);
		}
	} else {
		const el = document.createElement('span');
		el.innerHTML = 'No sites visited yet!';

		needLoveSitesEl.appendChild(el);
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
			const div = document.createElement('div');
			div.innerHTML = createTopSiteCircleHTML(originData, totalSentXRP);
			circleEl.appendChild(div);
			circleEl.style.fontSize = Math.round(circleWeight / 6) + 'px';
		}

		const detailHTML = createTopSiteDetailHTML(originData, totalSentXRP);
		circleEl.addEventListener('mouseover', () => showTopSiteDetail(detailHTML, color));
		circleEl.addEventListener('mouseleave', hideTopSiteDetail);

		circleContainer.appendChild(circleEl);
	}
}

function calculateTotalSentXRPForOrigin(originData) {
	let totalSentXRP = 0;
	if (originData.paymentPointerMap) {
		for (const paymentPointerData of Object.values(originData.paymentPointerMap)) {
			if (paymentPointerData.sentAssetsMap?.XRP?.amount > 0) {
				const sentXRP = paymentPointerData.sentAssetsMap.XRP;
				const actualAmount = sentXRP.amount * 10**(-sentXRP.assetScale);
				totalSentXRP += actualAmount;
			}
		}
	}
	return totalSentXRP;
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
	if (totalSentXRP > 0) {
		return `${convertMSToNiceTimeString(visitData.timeSpentAtOrigin)}<br>${totalSentXRP.toFixed(3)} XRP<br>${visitData.numberOfVisits} visits`;
	} else {
		return `${convertMSToNiceTimeString(visitData.timeSpentAtOrigin)}<br>${visitData.numberOfVisits} visits`;
	}
}

function createTopSiteDetailHTML(originData, totalSentXRP) {
	const visitData = originData?.originVisitData;
	return `<a href="${originData.origin}" style="color: black; text-decoration: underline;">${originData.origin}</a><br><br>
		You've spent <strong>${convertMSToNiceTimeString(visitData.timeSpentAtOrigin)}</strong> here<br>
		You've visited <strong>${visitData.numberOfVisits} times</strong><br>
		You've sent <strong>${totalSentXRP.toFixed(3)}XRP</strong>`;
}

const topSiteDetailEl = document.getElementById('top-site-detail');
function showTopSiteDetail(innerHTML, color) {
	topSiteDetailEl.style.zIndex = 1;
	topSiteDetailEl.style.opacity = 1;
	topSiteDetailEl.style.background = color;
	topSiteDetailEl.innerHTML = innerHTML;
}

function hideTopSiteDetail() {
	// Place element "behind" all other elements so it does not intercept mouse interactions.
	topSiteDetailEl.style.zIndex = -1;
	// Make element invisible.
	topSiteDetailEl.style.opacity = 0;
}
