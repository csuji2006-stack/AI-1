const senderInput = document.getElementById("sender");
const subjectInput = document.getElementById("subject");
const messageInput = document.getElementById("message");
const charCount = document.getElementById("charCount");
const detectBtn = document.getElementById("detectBtn");
const clearBtn = document.getElementById("clearBtn");
const detectionStatus = document.getElementById("detectionStatus");

const result = document.getElementById("result");
const resultIcon = document.getElementById("resultIcon");
const resultTitle = document.getElementById("resultTitle");
const resultMessage = document.getElementById("resultMessage");
const resultSignals = document.getElementById("resultSignals");
const hostingNotice = document.getElementById("hostingNotice");

const SPAM_PATTERNS = [
    { pattern: /\b(?:winner|lottery|prize|free\s+(?:cash|gift|money|iPhone))\b/i, weight: 20, signal: "Prize, lottery, or free-gift language" },
    { pattern: /\b(?:urgent|act now|immediately|limited time|expires today)\b/i, weight: 15, signal: "Urgent or time-limited language" },
    { pattern: /\b(?:click here|verify (?:your )?(?:account|identity)|confirm (?:your )?(?:account|details))\b/i, weight: 25, signal: "A request to click a link or verify account details" },
    { pattern: /\b(?:password|bank details|credit card|social security|one-time passcode|\bOTP\b)\b/i, weight: 25, signal: "A request involving sensitive credentials or financial details" },
    { pattern: /\b(?:wire transfer|gift card|send money|payment required|processing fee)\b/i, weight: 25, signal: "A request for payment or money transfer" },
    { pattern: /\b(?:guaranteed|risk[- ]free)\b/i, weight: 15, signal: "Unusually guaranteed or risk-free claims" },
];

let debounceTimer;
let activeRequest;
let requestNumber = 0;
const isGitHubPages = window.location.hostname.endsWith(".github.io");
const isLocalPage = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const apiBase = window.location.protocol === "file:" ||
    (isLocalPage && window.location.port !== "5000")
    ? "http://127.0.0.1:5000"
    : "";

if (isGitHubPages) {
    hostingNotice.textContent = "This demo runs the detector directly in the browser, so it works on GitHub Pages without the Python backend.";
    hostingNotice.classList.remove("hidden");
}

function hideResult() {
    result.classList.add("hidden");
    result.classList.remove("spam-result", "safe-result");
    result.removeAttribute("data-state");
    resultSignals.replaceChildren();
}

function showError(message) {
    hideResult();
    detectionStatus.textContent = message;
    detectionStatus.classList.add("error");
}

function analyzeEmailLocally(sender, subject, body) {
    const emailText = `${sender}\n${subject}\n${body}`;
    let score = 0;
    const signals = [];

    SPAM_PATTERNS.forEach(({ pattern, weight, signal }) => {
        if (pattern.test(emailText)) {
            score += weight;
            signals.push(signal);
        }
    });

    if (/(https?:\/\/|www\.)/i.test(emailText)) {
        score += 10;
        signals.push("Contains a web link");
    }

    if (/https?:\/\/(?:bit\.ly|tinyurl\.com|t\.co|goo\.gl|cutt\.ly)\//i.test(emailText)) {
        score += 15;
        signals.push("Contains a shortened link that hides its destination");
    }

    if (/!{2,}/.test(emailText)) {
        score += 5;
        signals.push("Uses repeated exclamation marks");
    }

    const riskScore = Math.min(score, 100);
    const isSpam = riskScore >= 30;
    return {
        is_spam: isSpam,
        classification: isSpam ? "spam" : "not_spam",
        risk_score: riskScore,
        signals,
        summary: isSpam
            ? "This email has multiple common spam or phishing warning signs."
            : "No strong common spam or phishing pattern was detected.",
    };
}

function renderResult(data) {
    result.classList.remove("hidden", "spam-result", "safe-result");
    result.classList.add(data.is_spam ? "spam-result" : "safe-result");
    resultIcon.textContent = data.is_spam ? "!" : "✓";
    resultTitle.textContent = data.is_spam ? "Spam likely" : "No spam signals found";
    resultMessage.textContent = `${data.summary} Risk score: ${data.risk_score}/100.`;
    result.dataset.state = data.is_spam ? "spam" : "safe";
    resultSignals.replaceChildren();
    data.signals.forEach((signal) => {
        const item = document.createElement("li");
        item.textContent = signal;
        resultSignals.appendChild(item);
    });
}

async function detectSpam() {
    const message = messageInput.value.trim();
    const currentRequest = ++requestNumber;

    if (!message) {
        hideResult();
        detectionStatus.textContent = "";
        detectionStatus.classList.remove("error");
        return;
    }

    if (isGitHubPages) {
        renderResult(analyzeEmailLocally(
            senderInput.value.trim(),
            subjectInput.value.trim(),
            message,
        ));
        detectionStatus.textContent = "Checked locally in your browser.";
        detectionStatus.classList.remove("error");
        return;
    }

    if (activeRequest) {
        activeRequest.abort();
    }

    activeRequest = new AbortController();
    detectionStatus.textContent = "Checking email...";
    detectionStatus.classList.remove("error");
    detectBtn.disabled = true;

    try {
        const response = await fetch(`${apiBase}/api/detect`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                sender: senderInput.value.trim(),
                subject: subjectInput.value.trim(),
                body: message,
            }),
            signal: activeRequest.signal,
        });

        let data;
        try {
            data = await response.json();
        } catch {
            throw new Error("The spam checker returned an invalid response.");
        }

        if (!response.ok) {
            throw new Error(data.error || "The email could not be checked.");
        }

        if (currentRequest !== requestNumber) {
            return;
        }

        renderResult(data);
        detectionStatus.textContent = "Checked automatically.";
        detectionStatus.classList.remove("error");
    } catch (error) {
        if (error.name === "AbortError" || currentRequest !== requestNumber) {
            return;
        }

        if (!(error instanceof TypeError)) {
            showError(error.message || "Unable to connect to the spam detection service.");
            return;
        }

        const fallbackData = analyzeEmailLocally(
            senderInput.value.trim(),
            subjectInput.value.trim(),
            message,
        );
        if (currentRequest !== requestNumber) {
            return;
        }

        renderResult(fallbackData);
        detectionStatus.textContent = isGitHubPages
            ? "Checked locally in your browser."
            : "Checked locally because the backend is unavailable.";
        detectionStatus.classList.remove("error");
    } finally {
        if (currentRequest === requestNumber) {
            detectBtn.disabled = false;
        }
    }
}

function scheduleDetection() {
    charCount.textContent = messageInput.value.length;
    hideResult();
    detectionStatus.textContent = "";
    detectionStatus.classList.remove("error");
    window.clearTimeout(debounceTimer);
    requestNumber += 1;
    if (activeRequest) {
        activeRequest.abort();
    }
    detectBtn.disabled = false;

    if (messageInput.value.trim()) {
        debounceTimer = window.setTimeout(detectSpam, 500);
    }
}

[senderInput, subjectInput, messageInput].forEach((input) => {
    input.addEventListener("input", scheduleDetection);
});

detectBtn.addEventListener("click", () => {
    window.clearTimeout(debounceTimer);
    detectSpam();
});

clearBtn.addEventListener("click", () => {
    window.clearTimeout(debounceTimer);
    requestNumber += 1;
    if (activeRequest) {
        activeRequest.abort();
    }
    senderInput.value = "";
    subjectInput.value = "";
    messageInput.value = "";
    charCount.textContent = "0";
    detectionStatus.textContent = "";
    detectionStatus.classList.remove("error");
    hideResult();
    messageInput.focus();
});