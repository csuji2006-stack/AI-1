const messageInput = document.getElementById("message");
const charCount = document.getElementById("charCount");
const detectBtn = document.getElementById("detectBtn");
const clearBtn = document.getElementById("clearBtn");

const result = document.getElementById("result");
const resultIcon = document.getElementById("resultIcon");
const resultTitle = document.getElementById("resultTitle");
const resultMessage = document.getElementById("resultMessage");

// Character counter
messageInput.addEventListener("input", function () {
    charCount.textContent = messageInput.value.length;
});

// Detect button
detectBtn.addEventListener("click", function () {

    const message = messageInput.value.trim();

    if (message === "") {
        alert("Please enter a message first.");
        messageInput.focus();
        return;
    }

    /*
        FRONTEND DEMO ONLY

        This is NOT an AI/ML model.
        It only demonstrates how the frontend result
        section works.

        Later, this section can be replaced with a
        backend API call to your trained AI model.
    */

    const spamKeywords = [
        "win",
        "winner",
        "prize",
        "free",
        "claim",
        "offer",
        "urgent",
        "click here",
        "congratulations",
        "lottery",
        "cash",
        "reward",
        "bonus",
        "limited time",
        "buy now"
    ];

    const lowerMessage = message.toLowerCase();

    let detectedWords = [];

    spamKeywords.forEach(function (keyword) {
        if (lowerMessage.includes(keyword)) {
            detectedWords.push(keyword);
        }
    });

    result.classList.remove("hidden");
    result.classList.remove("spam-result", "safe-result");

    if (detectedWords.length >= 2) {

        result.classList.add("spam-result");

        resultIcon.textContent = "!";
        resultTitle.textContent = "Spam Detected";
        resultMessage.textContent =
            "This message appears to contain suspicious content.";

    } else {

        result.classList.add("safe-result");

        resultIcon.textContent = "✓";
        resultTitle.textContent = "Not Spam";
        resultMessage.textContent =
            "This message appears to be safe.";
    }

    result.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
});

// Clear button
clearBtn.addEventListener("click", function () {

    messageInput.value = "";
    charCount.textContent = "0";

    result.classList.add("hidden");
    result.classList.remove("spam-result", "safe-result");

    messageInput.focus();
});