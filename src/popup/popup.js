// Make links clickable
var links = document.getElementsByTagName("a");

for (const link of Array.from(links)) {
    if (link.id !== 'goto-intro') {
        link.addEventListener("click", () => {
            chrome.tabs.create({ url: link.href });
        }, false);
    }
}

// Section navigation
let otherSection = document.getElementById('data-story');
let currentSection = document.getElementById('intro-carousel');
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
        if (slideNumber === 4) {
            document.getElementById('intro-exit').innerHTML = 'done';
        } else {
            document.getElementById('intro-exit').innerHTML = 'skip';
        }
    }}
});

//if storage.alreadyBeenToTutorial === false then go to tutorial

document.getElementById('intro-exit').addEventListener('click', switchSection);
document.getElementById('goto-intro').addEventListener('click', switchSection);


//Circles
const square = {
    height: 155,
    width: 245
};
const CIRCLE_COLORS = ['#F96060', '#42D2B8', '#92DEFF', '#FFF27B', '#9F88FC'];
let circleWeights = [10, 7, 1, 1, 1];

const circleContainer = document.getElementById('circle-container');

const circleWeightsSum = circleWeights.reduce((prev, cur) => prev + cur, 0);
const areaNormalizationFactor = Math.min(square.width / circleWeightsSum, square.height / circleWeights[0]);
circleWeights = circleWeights.map(weight => weight * areaNormalizationFactor);

for (let i = 0; i < circleWeights.length; i++) {
    const circleEl = document.createElement('div');
    const circleWeight = circleWeights[i];
    const color = CIRCLE_COLORS[i];

    if (circleWeight > 40) {
        circleEl.innerHTML = '10hrs<br>0.0005XRP<br>20 visits';
        circleEl.setAttribute('data-url', 'https://google.com');
        circleEl.style.fontSize = Math.round(circleWeight / 8) + 'px';
    }

    circleEl.className = 'circle'
    circleEl.style.background = color;
    circleEl.style.height = circleWeight + 'px';
    circleEl.style.width = circleWeight + 'px';

    circleContainer.appendChild(circleEl);
}

function ConvertMSToNiceTimeString(ms) {
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
        return `${Math.round(seconds)} minutes`;
    }
    return `${ms}ms`;
}