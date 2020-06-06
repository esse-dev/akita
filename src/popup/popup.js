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

new Flickity(document.getElementById('flickity'), {
    on: { change: (slideNumber) => {
        if (slideNumber === 5) {
            document.getElementById('intro-exit').innerHTML = 'done';
        } else {
            document.getElementById('intro-exit').innerHTML = 'skip';
        }
    }}
});

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

    if (originStats && originStats.totalTimeSpent > 0) {
        document.getElementById('monetized-time-data').innerHTML = convertMSToNiceTimeString(originStats.totalMonetizedTimeSpent);
        if (originStats.totalSentAssetsMap?.XRP?.amount > 0) {
            const sentXRP = originStats.totalSentAssetsMap.XRP;
            const actualAmount = sentXRP.amount * 10**(-sentXRP.assetScale);
            document.getElementById('monetized-sent-data').innerHTML = actualAmount.toFixed(3) + '<span style="font-size: 12px;">XRP</span>';
        } else {
            // ADD A CHANGE OF TEXT!
            document.getElementById('monetized-sent-text').innerHTML = 'if you were using <a href="https://www.coil.com/">Coil</a> you would have sent '
            document.getElementById('monetized-sent-data').innerHTML = '$' + await getEstimatedPaymentForOriginUSD(origin) + '<span style="font-size: 12px;">USD</span>';
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
    const needLoveOrigins = await getTopOriginsThatNeedSomeLove(4);
    const needLoveSitesEl = document.getElementById('sites-need-love');

    if (needLoveOrigins.length > 0) {
        for (const originData of needLoveOrigins) {
            const linkEl = document.createElement('a');
            linkEl.href = originData.origin;
            linkEl.innerHTML = originData.origin;

            needLoveSitesEl.appendChild(linkEl);
            const brEl = document.createElement('br');
            needLoveSitesEl.appendChild(brEl);
        }
    } else {
        const el = document.createElement('span');
        el.innerHTML = 'No sites visited yet!';

        needLoveSitesEl.appendChild(el);
    }

    // Make links clickable
    var links = document.getElementsByTagName("a");

    for (const link of Array.from(links)) {
        if (link.id !== 'goto-intro') {
            link.addEventListener("click", () => {
                webBrowser.tabs.create({ url: link.href });
            }, false);
        }
    }

    const topOrigins = await getTopOriginsByTimeSpent(6);
    let circleWeights = [];
    for (const originData of topOrigins) {
        const timeSpent = originData?.originVisitData.timeSpentAtOrigin;
        circleWeights.push(timeSpent);
    }

    //Circles
    const square = {
        height: 155,
        width: 245
    };
    const CIRCLE_COLORS = ['#F96060', '#42D2B8', '#92DEFF', '#FFF27B', '#9F88FC'];

    const circleContainer = document.getElementById('circle-container');

    const circleWeightsSum = circleWeights.reduce((prev, cur) => prev + cur, 0);
    const areaNormalizationFactor = Math.min(square.width / circleWeightsSum, square.height / circleWeights[0]);
    circleWeights = circleWeights.map(weight => weight * areaNormalizationFactor);

    for (let i = 0; i < circleWeights.length; i++) {
        const circleEl = document.createElement('div');
        const circleWeight = circleWeights[i];
        const color = CIRCLE_COLORS[i];
        const originData = topOrigins[i];
        const visitData = originData?.originVisitData;
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

        circleEl.setAttribute('data-url',
            `${convertMSToNiceTimeString(visitData.timeSpentAtOrigin)} spent here · 
            ${originData.origin} · 
            ${visitData.numberOfVisits} visits · 
            ${totalSentXRP.toFixed(3)}XRP sent`);
        if (circleWeight > 40) {
            circleEl.innerHTML = `${convertMSToNiceTimeString(visitData.timeSpentAtOrigin)}<br>${totalSentXRP.toFixed(3)} XRP<br>${visitData.numberOfVisits} visits`;
            circleEl.style.fontSize = Math.round(circleWeight / 8) + 'px';
        }

        circleEl.className = 'circle'
        circleEl.style.background = color;
        circleEl.style.height = circleWeight + 'px';
        circleEl.style.width = circleWeight + 'px';
        circleEl.addEventListener("click", () => {
            chrome.tabs.create({ url: originData.origin });
        }, false);

        circleContainer.appendChild(circleEl);
    }
}