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

let debounceTimer;
let activeRequest;
let requestNumber = 0;
const isLocalPage = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const apiBase = window.location.protocol === "file:" ||
    (isLocalPage && window.location.port !== "5000")
    ? "http://127.0.0.1:5000"
    : "";

function hideResult() {
    result.classList.add("hidden");
    result.classList.remove("spam-result", "safe-result");
    resultSignals.replaceChildren();
}

function showError(message) {
    hideResult();
    detectionStatus.textContent = message;
    detectionStatus.classList.add("error");
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
                body: message
            }),
            signal: activeRequest.signal
        });
        let data;
        try {
            data = await response.json();
        } catch {
            throw new Error("The spam checker returned an invalid response. Start it with frontend\\start_detector.bat.");
        }

        if (!response.ok) {
            throw new Error(data.error || "The email could not be checked.");
        }
        if (currentRequest !== requestNumber) {
            return;
        }

        result.classList.remove("hidden", "spam-result", "safe-result");
        result.classList.add(data.is_spam ? "spam-result" : "safe-result");
        resultIcon.textContent = data.is_spam ? "!" : "✓";
        resultTitle.textContent = data.is_spam ? "Spam likely" : "No spam signals found";
        resultMessage.textContent =
            `${data.summary} Risk score: ${data.risk_score}/100.`;
        resultSignals.replaceChildren();
        data.signals.forEach((signal) => {
            const item = document.createElement("li");
            item.textContent = signal;
            resultSignals.appendChild(item);
        });
        detectionStatus.textContent = "Checked automatically.";
        detectionStatus.classList.remove("error");
    } catch (error) {
        if (error.name === "AbortError" || currentRequest !== requestNumber) {
            return;
        }
        const message = error instanceof TypeError
            ? "Can't reach the spam checker. Start it with frontend\\start_detector.bat, then open http://127.0.0.1:5000."
            : error.message || "Unable to connect to the spam detection service.";
        showError(message);
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
