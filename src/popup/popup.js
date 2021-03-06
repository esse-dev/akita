// Code for the extension popup window

// The number of decimal points to use when displaying an amount of payment
const GENERAL_CURRENCY_PRECISION = 2;

// Section navigation
let otherSection = document.getElementById('intro-carousel');
let currentSection = document.getElementById('data-story');
function switchSection() {
	let swapTemp = otherSection;
	otherSection = currentSection;
	currentSection = swapTemp;

	currentSection.scrollIntoView({
		behavior: 'smooth'
	});

	// Hacky thing to get past buggy Firefox scrollIntoView smooth problem
	if (getBrowser() === "Firefox") {
		if (currentSection === document.getElementById('data-story')) {
			setTimeout(() => {
				currentSection.scrollIntoView();
			}, 320);
		}
	}
}

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

const URL_PREFIX_REGEX = /^(https?:\/\/)(www\.)?/;

getStats();
async function getStats() {
	const originStats = await loadOriginStats();
	const circleContainer = document.getElementById('circle-container');

	if (!originStats || originStats.totalMonetizedTimeSpent === 0) {
		// The user has not visisted a monetized site yet
		document.getElementById('circle-empty-illustration').style.display = 'block';
		circleContainer.style.display = 'none';
		document.getElementById('info-container').innerHTML = `You haven't visited any monetized websites yet! What are you waiting for? Get out there and explore the wild wild web.<br>Not sure where to start? <a href="https://coil.com/explore" target="_blank">Discover some monetized sites!</a>`;
	} else {
		if (originStats && originStats.totalMonetizedTimeSpent > 0) {
			// If the user has visisted at least 1 monetized site, display monetization data
			document.getElementById('monetized-time-data').innerHTML = convertMSToNiceTimeString(originStats.totalMonetizedTimeSpent);

			const totalSentAssetsMap = originStats.getTotalSentAssets();

			if (totalSentAssetsMap) {
				const sentAssetsString = getSentAssetsMapAsString(totalSentAssetsMap, GENERAL_CURRENCY_PRECISION);
				if (sentAssetsString && sentAssetsString !== ``) {
					document.getElementById('monetized-sent-text').innerHTML = `In total, you’ve streamed `;
					document.getElementById('monetized-sent-data').innerHTML = `${sentAssetsString}.`;
				}
			} else {
				// No payment has been streamed to the site -- present estimation based on Coil rate
				const estimatedPaymentSentInUSD = getEstimatedPaymentForTimeInUSD(originStats.totalMonetizedTimeSpent);
				if (estimatedPaymentSentInUSD > 0) {
					document.getElementById('monetized-sent-text').innerHTML = `If you were using <a href="https://www.coil.com/">Coil</a> you would have sent `;
					document.getElementById('monetized-sent-data').innerHTML = `<strong>$${estimatedPaymentSentInUSD}<span style="font-size: 12px;">USD</span></strong>.`;
				}
			}

			const monetizedTimePercent = getMonetizedTimeSpentPercent(originStats);
			if (monetizedTimePercent) {
				document.getElementById('monetized-percent-data').innerHTML = monetizedTimePercent+'%';
			} else {
				// TODO: ADD A CHANGE OF TEXT!
				document.getElementById('monetized-percent-data').innerHTML = '0%';
			}
			document.getElementById('circle-empty-illustration').style.display = 'none';
			circleContainer.style.display = 'flex';

			const needsLoveContainer = document.getElementById('sites-need-love-container');
			const noProviderResourcesContainer = document.getElementById('no-provider-resources-container');
			if ((originStats)
				&& (originStats.totalSentAssetsMap)
				&& (Object.keys(originStats.totalSentAssetsMap).length !== 0)
			) {
				noProviderResourcesContainer.style.display = 'none';
				needsLoveContainer.style.display = 'block';

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
						linkEl.innerHTML = originData.origin.replace(URL_PREFIX_REGEX, "");

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
				noProviderResourcesContainer.style.display = 'grid';
				needsLoveContainer.style.display = 'none';
			}

			// Top sites visualization with circles
			const topOrigins = await getTopOriginsByTimeSpent(5);
			let circleWeights = [];
			for (const originData of topOrigins) {
				const timeSpent = originData?.originVisitData.monetizedTimeSpent;
				circleWeights.push(timeSpent);
			}

			// Circles
			const CIRCLE_COLORS = ['#F96060', '#42D2B8', '#92DEFF', '#FFF27B', '#9F88FC'];

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

				circleEl.className = 'circle';
				circleEl.style.background = color;
				circleEl.style.height = circleWeight + 'px';
				circleEl.style.width = circleWeight + 'px';

				const originData = topOrigins[i];

				if ((originData.faviconSource) && (originData.faviconSource !== "")) {
					const faviconEl = createFaviconImgElement(originData.faviconSource);
					circleEl.appendChild(faviconEl);
				} else {
					// If no favicon is available, use the first character of site origin
					// to represent the origin in its circle, capitalized and bolded
					const characterEl = document.createElement('p');
					characterEl.innerHTML = `<strong>${originData.origin.replace(URL_PREFIX_REGEX, "").charAt(0).toUpperCase()}</strong>`;
					circleEl.appendChild(characterEl);
				}

				if (circleWeight > 40) {
					let circleFontSize = Math.round(circleWeight / 6);
					// Font size should be no smaller than 11, otherwise it's not legible
					if (circleFontSize > 11) {
						const div = document.createElement('div');
						div.innerHTML = createTopSiteCircleHTML(originData);
						circleEl.appendChild(div);
						circleEl.style.fontSize = circleFontSize + 'px';
					}
				}

				const detailHTML = createTopSiteDetailHTML(originData, originStats);
				circleEl.addEventListener('mouseover', () => showTopSiteDetail(detailHTML, color));
				circleEl.addEventListener('mouseleave', () => hideElement(topSiteDetailEl));
				circleEl.addEventListener("click", () => {
					webBrowser.tabs.create({ url: originData.origin });
				}, false);

				circleContainer.appendChild(circleEl);
			}
		}
	}

	// Make all links in extension popup clickable and open in new tab.
	// Must be done at the end of this function so that links added above are made clickable as well.
	var links = document.getElementsByTagName("a");

	for (const link of Array.from(links)) {
		if (link.id !== 'goto-intro') {
			link.target = "_blank";

			link.addEventListener("click", () => {
				setTimeout(() => {
					window.close();
				}, 100);
			}, false);
		}
	}
}

function createFaviconImgElement(faviconSource) {
	const faviconEl = document.createElement('img');
	faviconEl.classList.add('favicon');

	// Lazy-load the image in javascript so that popup opening is not blocked by faviconEl loading
	fetch(faviconSource).then(async (response) => {
		const blob = await response.blob();
		faviconEl.src = URL.createObjectURL(blob);
	});

	return faviconEl;
}

function createTopSiteCircleHTML(originData) {
	if (originData) {
		const visitData = originData.originVisitData;
		const visitText = (visitData.numberOfVisits === 1) ? 'visit' : 'visits';

		return `${convertMSToNiceTimeString(visitData.monetizedTimeSpent)}<br>${visitData.numberOfVisits} ` + visitText;
	}
}

function createTopSiteDetailHTML(originData, originStats) {
	if (!originData || !originStats) return ``;

	const timeSpent = originData.originVisitData.monetizedTimeSpent;

	// Set time spent text
	let timeSpentString = ``;
	if (timeSpent > 0) {
		const percentTimeSpent = getPercentTimeSpentAtOriginOutOfTotal(originData, originStats);
		if (percentTimeSpent > 0) {
			timeSpentString = `You've spent <strong>${convertMSToNiceTimeString(timeSpent)}</strong> of monetized time here, which is <strong>${percentTimeSpent}%</strong> of your time online.<br><br>`;
		} else {
			timeSpentString = `Crunching time spent numbers...<br><br>`
		}
	}

	// Set visit count text
	let visitCountText = ``;
	const visitCount = originData.originVisitData.numberOfVisits;
	if (visitCount === 0) {
		// Don't set the visit count text
	} else if (visitCount === 1) {
		visitCountText = `${visitCount} time`;
	} else {
		visitCountText = `${visitCount} times`;
	}
	let visitCountString = ``;
	if (visitCountText !== ``) {
		const percentVisits = getPercentVisitsToOriginOutOfTotal(originData, originStats);
		if (percentVisits > 0) {
			visitCountString = `You've visited <strong>${visitCountText}</strong>, which is <strong>${percentVisits}%</strong> of your total website visits.<br><br>`;
		} else {
			visitCountString = `Counting up visits...<br><br>`;
		}
	}

	// Set payment data text
	let paymentString = ``;
	let sentPayment = ``;
	const sentAssetsMap = originData.getTotalSentAssets();
	if (sentAssetsMap) {
		sentPayment = getSentAssetsMapAsString(sentAssetsMap, GENERAL_CURRENCY_PRECISION);
		if ((sentPayment) && (sentPayment !== ``)) {
			paymentString = `So far, you've sent `;
		}
	} else {
		// No payment has been streamed to the site -- present estimation based on Coil rate
		const estimatedPaymentSentInUSD = getEstimatedPaymentForTimeInUSD(timeSpent);
		if (estimatedPaymentSentInUSD > 0) {
			paymentString = `You haven't sent payment here yet. In the time you've spent here, with Coil you could have sent `;
			sentPayment = `<strong>$${estimatedPaymentSentInUSD}<span style="font-size: 12px;">USD</span></strong>`;
		}
	}
	if ((paymentString !== ``) && (sentPayment !== ``)) {
		paymentString += `${sentPayment} to this site.`;
	} else {
		paymentString = `You'll have to spend some more time here before there's payment data to show you!`;
	}

	const origin = originData.origin;

	return `<a href="${origin}" style="color: black; text-decoration: underline;">${origin}</a><br><br>
		${timeSpentString}
		${visitCountString}
		${paymentString}`;
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

// source: https://stackoverflow.com/a/45985333/5425899
function getBrowser() {
	if (typeof chrome !== "undefined") {
		if (typeof browser !== "undefined") {
			return "Firefox";
		} else {
			return "Chrome";
		}
	} else {
		return "Edge";
	}
}

// Carousel code
document.getElementById('carousel');

let currentSlide = 0;
let currentTranslateX = 0;

const carouselDotElements = document.getElementsByClassName('carousel-dot');
for (let i = 0; i < carouselDotElements.length; i++) {
	carouselDotElements[i].addEventListener('mousedown', () => {
		currentSlide = i;

		onSlideChange();
	});
}

const carouselElements = document.getElementsByClassName('carousel-slide');
const carouselEl = document.getElementById('carousel');
const leftButtonEl = document.getElementById('left-button');
const rightButtonEl = document.getElementById('right-button');

leftButtonEl.addEventListener('mousedown', () => {
	if (currentSlide > 0) {
		currentSlide--;

		onSlideChange();
	}
});
rightButtonEl.addEventListener('mousedown', () => {
	if (currentSlide < carouselElements.length - 1) {
		currentSlide++;

		onSlideChange();
	}
});
onSlideChange();

function onSlideChange() {
	if (currentSlide === carouselElements.length - 1) {
		rightButtonEl.classList.add('disabled-button');

		document.getElementById('intro-exit').innerHTML = 'done';
		document.getElementById('intro-exit').style.color = '#C31354';
	} else {
		rightButtonEl.classList.remove('disabled-button');

		document.getElementById('intro-exit').innerHTML = 'skip';
		document.getElementById('intro-exit').style.color = '#000000';
	}
	if (currentSlide === 0) {
		leftButtonEl.classList.add('disabled-button');
	} else {
		leftButtonEl.classList.remove('disabled-button');
	}
	// Highlight the current slide dot
	for (let i = 0; i < carouselDotElements.length; i++) {
		if (i === currentSlide) {
			carouselDotElements[i].style.opacity = 0.5;
		} else {
			carouselDotElements[i].style.opacity = 0.2;
		}
	}
}

const SLIDE_WIDTH = 390;
const TRANSITION_RATE = 0.2;
function carouselAnimationLoop() {
	requestAnimationFrame(carouselAnimationLoop);

	const targetTranslateX = -SLIDE_WIDTH * currentSlide;
	currentTranslateX += (targetTranslateX - currentTranslateX) * TRANSITION_RATE;
	carouselEl.style.transform = `translateX(${currentTranslateX}px)`;
}
requestAnimationFrame(carouselAnimationLoop);
