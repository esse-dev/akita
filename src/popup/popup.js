// Code for the extension popup window

// The number of decimal points to use when displaying an amount of payment
const GENERAL_CURRENCY_PRECISION = 2;

// Browser type constants
const BROWSER_TYPE_FIREFOX = "Firefox";
const BROWSER_TYPE_CHROME = "Chrome";
const BROWSER_TYPE_EDGE = "Edge";
const browserType = getBrowser();

// Set the icon illustration in the tutorial based on browser (defaults in HTML are for Chrome/Brave)
const monetizedIconObject = document.getElementById('akita-icon-monetized-object');
const unmonetizedIconObject = document.getElementById('akita-icon-unmonetized-object');

if (browserType === BROWSER_TYPE_FIREFOX) {
	monetizedIconObject.data = "../../assets/tutorial/demo_mon_firefox.svg";
	unmonetizedIconObject.data = "../../assets/tutorial/demo_unmon_firefox.svg";
} else if (browserType === BROWSER_TYPE_EDGE) {
	monetizedIconObject.data = "../../assets/tutorial/demo_mon_edge.svg";
	unmonetizedIconObject.data = "../../assets/tutorial/demo_unmon_edge.svg";
}

// Setting click listeners and selecting the correct survey url for the user
const feedbackPopupDiv = document.getElementById('feedback-popup-div');

function setClickListenersForCloseFeedbackEls() {
	const closePopupEls = Array.from(document.getElementsByClassName('close-popup'));
	for (const el of closePopupEls) {
		el.addEventListener('click', () => {
			hideElement(feedbackPopupDiv);
		}, false);
	}
}

const WM_PROVIDER_USER_SURVEY_LINK = 'https://docs.google.com/forms/d/e/1FAIpQLSfipkYgCY9aNjmtWaBandNptYxuGEamDGV3BU672iybMBW7wg/viewform';
const NON_WM_PROVIDER_USER_SURVEY_LINK = 'https://docs.google.com/forms/d/e/1FAIpQLSd5qFPZTW2Lcla1CSxyfXdVy3LR6Ls3_4MW-gPcDh9I91huuQ/viewform';
let surveyUrl = "";

function setSurveyUrl(originStats) {
	const isWMProviderUser = hasUsedWebMonetizationProvider(originStats);
	surveyUrl = isWMProviderUser ? WM_PROVIDER_USER_SURVEY_LINK : NON_WM_PROVIDER_USER_SURVEY_LINK;
}

function setClickListenerForFeedbackPopupSurveyEl() {
	const surveyButtonEl = document.getElementById('feedback-popup-survey-button');
	surveyButtonEl.addEventListener('click', () =>
		window.open(surveyUrl, '_blank')
	, false);
}

function setClickListenerForHeaderFeedbackEl() {
	const headerFeedbackLinkEl = document.getElementById('goto-survey');
	headerFeedbackLinkEl.addEventListener('click', () =>
		window.open(surveyUrl, '_blank')
	, false);
}

const browsingTimeThresholdMs = 24 * 60 * 60 * 1000; // 24 hours
function handleFeedbackPopup(originStats) {
	if (!originStats) return;

	// Only show the popup after some amount of browsing time: 24 hours
	if (originStats.totalTimeSpent < browsingTimeThresholdMs) return;

	// Only show the feedback popup once
	webBrowser.storage.local.get('seenFeedbackPopup', ({ seenFeedbackPopup }) => {
		if (!seenFeedbackPopup) {
			setClickListenersForCloseFeedbackEls();
			setClickListenerForFeedbackPopupSurveyEl();
			showElement(feedbackPopupDiv);
			webBrowser.storage.local.set({ seenFeedbackPopup:true });
		}
	});
}

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
	if (browserType === BROWSER_TYPE_FIREFOX) {
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

main();
async function main() {
	const originStats = await loadOriginStats();
	setSurveyUrl(originStats);
	setClickListenerForHeaderFeedbackEl();
	handleFeedbackPopup(originStats);
	await renderStats(originStats);
}

/**
 * Render all of the data/stats presented in the Akita extension.
 *
 * @param {AkitaOriginStats} originStats Akita origin stats data loaded from storage.
 */
async function renderStats(originStats) {
	const URL_PREFIX_REGEX = /^(https?:\/\/)(www\.)?/;
	const circleContainer = document.getElementById('circle-container');

	if (!originStats || originStats.totalMonetizedTimeSpent === 0) {
		// The user has not visited a monetized site yet
		document.getElementById('circle-empty-illustration').style.display = 'block';
		circleContainer.style.display = 'none';
		setContentOfEl(document.getElementById('info-container'), [
			textEl(`You haven't visited any monetized websites yet! What are you waiting for? Get out there and explore the wild wild web.`),
			linebreakEl(),
			textEl(`Not sure where to start? `),
			linkEl(`https://coil.com/explore`, `Discover some monetized sites!`)
		]);
	} else {
		if (originStats && originStats.totalMonetizedTimeSpent > 0) {
			// If the user has visisted at least 1 monetized site, display monetization data
			document.getElementById('monetized-time-data').innerText = convertMSToNiceTimeString(originStats.totalMonetizedTimeSpent);

			const totalSentAssetsMap = originStats.getTotalSentAssets();

			if (totalSentAssetsMap) {
				const sentAssetsEls = getSentAssetsMapAsEls(totalSentAssetsMap, GENERAL_CURRENCY_PRECISION);
				if (sentAssetsEls.length > 0) {
					document.getElementById('monetized-sent-text').innerText = `In total, you’ve streamed `;
					setContentOfEl(document.getElementById('monetized-sent-data'), sentAssetsEls);
				}
			} else {
				// No payment has been streamed to the site -- present estimation based on Coil rate
				const estimatedPaymentSentInUSD = getEstimatedPaymentForTimeInUSD(originStats.totalMonetizedTimeSpent);
				if (estimatedPaymentSentInUSD > 0) {
					setContentOfEl(document.getElementById('monetized-sent-text'), [
						textEl(`If you were using `),
						linkEl(`https://www.coil.com/`, `Coil`),
						textEl(` you would have sent `),
					]);
					setContentOfEl(document.getElementById('monetized-sent-data'), [
						setContentOfEl(strongEl(), [
							textEl(`$${estimatedPaymentSentInUSD}`),
							smallTextEl(`USD`)
						]),
						textEl(`.`),
					]);
				}
			}

			const monetizedTimePercent = getMonetizedTimeSpentPercent(originStats);
			if (monetizedTimePercent) {
				document.getElementById('monetized-percent-data').innerText = `${monetizedTimePercent}%`;
			} else {
				// TODO: ADD A CHANGE OF TEXT!
				document.getElementById('monetized-percent-data').innerText = `0%`;
			}
			document.getElementById('circle-empty-illustration').style.display = 'none';
			circleContainer.style.display = 'flex';

			const needsLoveContainer = document.getElementById('sites-need-love-container');
			const noProviderResourcesContainer = document.getElementById('no-provider-resources-container');
			if (hasUsedWebMonetizationProvider(originStats)) {
				noProviderResourcesContainer.style.display = 'none';
				needsLoveContainer.style.display = 'block';

				const needLoveOrigins = await getTopOriginsThatNeedSomeLove(3);

				if (needLoveOrigins.length > 0) {
					for (const originData of needLoveOrigins) {
						if ((originData.faviconSource) && (originData.faviconSource !== "")) {
							const faviconEl = createFaviconImgElement(originData.faviconSource);
							faviconEl.addEventListener('click', () =>
								webBrowser.tabs.create({ url: originData.origin })
							, false);

							needsLoveContainer.appendChild(faviconEl);
						}

						const linkEl = document.createElement('a');
						linkEl.href = originData.origin;

						// strip 'https://' or 'http://' and 'www.' from the beginning of the origin
						linkEl.innerText = originData.origin.replace(URL_PREFIX_REGEX, "");

						needsLoveContainer.appendChild(linkEl);
						const brEl = document.createElement('br');
						needsLoveContainer.appendChild(brEl);
					}
				} else {
					const el = document.createElement('span');
					el.innerText = `No sites visited yet!`;

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
					setContentOfEl(circleEl, [createFaviconImgElement(originData.faviconSource)]);
				} else {
					// If no favicon is available, use the first character of site origin
					// to represent the origin in its circle, capitalized and bolded
					setContentOfEl(circleEl, [
						setContentOfEl(paragraphEl(), [
							strongEl(originData.origin.replace(URL_PREFIX_REGEX, "").charAt(0).toUpperCase())
						])
					]);
				}

				if (circleWeight > 40) {
					let circleFontSize = Math.round(circleWeight / 6);
					// Font size should be no smaller than 11, otherwise it's not legible
					if (circleFontSize > 11) {
						circleEl.append(
							setContentOfEl(document.createElement('div'), createTopSiteCircleEls(originData))
						);
						circleEl.style.fontSize = circleFontSize + 'px';
					}
				}

				const detailEls = createTopSiteDetailEls(originData, originStats);
				circleEl.addEventListener('mouseover', () => showTopSiteDetail(detailEls, color));
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

function createTopSiteCircleEls(originData) {
	if (originData) {
		const visitData = originData.originVisitData;
		const visitText = (visitData.numberOfVisits === 1) ? 'visit' : 'visits';

		return [
			textEl(convertMSToNiceTimeString(visitData.monetizedTimeSpent)),
			linebreakEl(),
			textEl(`${visitData.numberOfVisits} ${visitText}`)
		];
	}
}

function createTopSiteDetailEls(originData, originStats) {
	if (!originData || !originStats) return [];

	const timeSpent = originData.originVisitData.monetizedTimeSpent;

	// Set time spent text
	let timeSpentEl = paragraphEl();
	if (timeSpent > 0) {
		const percentTimeSpent = getPercentTimeSpentAtOriginOutOfTotal(originData, originStats);
		if (percentTimeSpent > 0) {
			setContentOfEl(timeSpentEl, [
				textEl(`You've spent `),
				strongEl(convertMSToNiceTimeString(timeSpent)),
				textEl(` of monetized time here, which is `),
				strongEl(`${percentTimeSpent}%`),
				textEl(` of your time online.`)
			]);
		} else {
			setContentOfEl(timeSpentEl, [
				textEl(`Crunching time spent numbers...`)
			]);
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
	let visitCountEl = paragraphEl();
	if (visitCountText !== ``) {
		const percentVisits = getPercentVisitsToOriginOutOfTotal(originData, originStats);
		if (percentVisits > 0) {
			setContentOfEl(visitCountEl, [
				textEl(`You've visited `),
				strongEl(visitCountText),
				textEl(`, which is `),
				strongEl(`${percentVisits}%`),
				textEl(` of your total website visits.`)
			]);
		} else {
			setContentOfEl(visitCountEl, [
				textEl(`Counting up visits...`)
			]);
		}
	}

	// Set payment data text
	const paymentEl = paragraphEl();
	const sentAssetsMap = originData.getTotalSentAssets();
	if (sentAssetsMap) {
		const sentPaymentEls = getSentAssetsMapAsEls(sentAssetsMap, GENERAL_CURRENCY_PRECISION);
		if (sentPaymentEls.length > 0) {
			setContentOfEl(paymentEl, [
				textEl(`So far, you've sent `),
				...sentPaymentEls,
				textEl(` to this site.`)
			]);
		} else {
			setContentOfEl(paymentEl, [
				textEl(`You'll have to spend some more time here before there's payment data to show you!`),
			]);
		}
	} else {
		// No payment has been streamed to the site -- present estimation based on Coil rate
		const estimatedPaymentSentInUSD = getEstimatedPaymentForTimeInUSD(timeSpent);
		if (estimatedPaymentSentInUSD > 0) {
			setContentOfEl(paymentEl, [
				textEl(`You haven't sent payment here yet. In the time you've spent here, with Coil you would have sent `),
				setContentOfEl(strongEl(), [
					textEl(`$${estimatedPaymentSentInUSD}`),
					smallTextEl(`USD`)
				]),
				textEl(` to this site.`)
			]);
		} else {
			setContentOfEl(paymentEl, [
				textEl(`You'll have to spend some more time here before there's payment data to show you!`),
			]);
		}
	}

	const origin = originData.origin;

	return [linkEl(origin, origin), timeSpentEl, visitCountEl, paymentEl];
}

const topSiteDetailEl = document.getElementById('top-site-detail');
function showTopSiteDetail(els, color) {
	topSiteDetailEl.style.zIndex = 1;
	topSiteDetailEl.style.opacity = 1;
	topSiteDetailEl.style.background = color;
	setContentOfEl(topSiteDetailEl, els);
}

/**
 * Convert the provided sentAssetsMap to list of HTML elements.
 * Example output: [
 * 	<strong>20.20<span style="font-size: 12px;">CAD</span></strong>,
 *	<strong>0.67<span style="font-size: 12px;">XRP</span></strong>,
 *	 and ,
 *	<strong>123.45<span style="font-size: 12px;">USD</span></strong>
 * ]
 *
 * @param {Map<String, Number>} sentAssetsMap A map containing the sent asset amounts,
 * with the currency as the key (String) and the sent amount as the value (Number).
 * @param {Number} decimalPoints The AkitaOriginData to calculate sent assets for.
 * @return {HTMLElement[]} The sent assets formatted as a string.
 */
 function getSentAssetsMapAsEls(sentAssetsMap, decimalPoints) {
	let sentAssetsEls = [];

	if (sentAssetsMap) {
		let entriesToStringify = sentAssetsMap.size;

		for (const [currency, amount] of sentAssetsMap.entries()) {
			let amountSent = amount.toFixed(decimalPoints);

			// No need to display the amount if it's effectively zero
			if (parseFloat(amountSent) === 0) {
				continue;
			}

			let amountSentEl = setContentOfEl(
				strongEl(), [
					textEl(amountSent),
					smallTextEl(currency)
				]
			);

			// There's only one entry in the map
			if (sentAssetsMap.size === 1) {
				sentAssetsEls = [amountSentEl];
				break;
			}

			// There's more than one entry in the map
			if (entriesToStringify >= 3) {
				// There are at least 3 entries to stringify, so we'll use a comma to separate the entries
				sentAssetsEls.push(amountSentEl, textEl(`, `));
			} else if ((sentAssetsMap.size > 1) && (entriesToStringify === 1)) {
				// This is the entry left to stringify, so use 'and'
				sentAssetsEls.push(textEl(` and `), amountSentEl);
			} else {
				// There's a single entry remaining in the map
				sentAssetsEls.push(amountSentEl);
			}

			entriesToStringify -= 1;
		}
	}

	return sentAssetsEls;
}

function hideElement(element) {
	// Make element invisible
	element.style.opacity = 0;
	// Place element "behind" all other elements so it does not intercept mouse interactions
	element.style.zIndex = -1;
}

function showElement(element) {
	// Make element visible
	element.style.opacity = 1;
	// Place element "in front of" all other elements so it can intercept mouse interactions
	element.style.zIndex = 100;
}

/**
 * Retrieves the browser type based on user agent.
 *
 * This function is based on the code provided at this source: https://stackoverflow.com/a/56361977,
 * which is licensed under Attribution-ShareAlike 4.0 International (CC BY-SA 4.0). A copy of this
 * license can be found at https://creativecommons.org/licenses/by-sa/4.0/.
 *
 * The code in this function uses the source's idea of leveraging indexOf to check the user agent
 * string to identify the browser.
 *
 * As per the license, this function is hereby licensed under CC BY-SA 4.0.
 *
 * @returns {String} The browser type.
 */
function getBrowser() {
	const userAgentString = window.navigator.userAgent.toLowerCase();

	// Chromium Edge (does not match old Edge)
	if (userAgentString.indexOf("edg/") > -1) {
		return BROWSER_TYPE_EDGE;
	}
	// Chrome and Brave
	if ((userAgentString.indexOf("chrome") > -1) && (!!window.chrome)) {
		return BROWSER_TYPE_CHROME;
	}
	// Firefox
	if (userAgentString.indexOf("firefox") > -1){
		return BROWSER_TYPE_FIREFOX;
	}

	return "other";
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

		document.getElementById('intro-exit').innerText = `done`;
		document.getElementById('intro-exit').style.color = '#C31354';
	} else {
		rightButtonEl.classList.remove('disabled-button');

		document.getElementById('intro-exit').innerText = `skip`;
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

/********************************************************
 * html element creation helper functions
 ********************************************************/
function setContentOfEl(el, els) {
	el.textContent = ''; // Clear the element's contents
	el.append(...els);
	return el;
}

function linkEl(href, content) {
	const el = document.createElement('a');
	el.href = href;
	el.target = '_blank';
	el.innerText = content;
	return el;
}

function strongEl(content) {
	const el = document.createElement('strong');
	el.innerText = content;
	return el;
}

function textEl(content) {
	return document.createTextNode(content);
}

function smallTextEl(content) {
	const el = document.createElement('span');
	el.style.fontSize = '12px';
	el.innerText = content;
	return el;
}

function linebreakEl() {
	return document.createElement('br');
}

function paragraphEl(content) {
	const el = document.createElement('p');
	el.innerText = content;
	return el;
}
