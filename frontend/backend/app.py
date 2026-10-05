import re
import threading
import webbrowser
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS


FRONTEND_DIR = Path(__file__).resolve().parent.parent
app = Flask(__name__, static_folder=str(FRONTEND_DIR), static_url_path="")
app.config["MAX_CONTENT_LENGTH"] = 64 * 1024
CORS(
    app,
    resources={
        r"/api/*": {
            "origins": [
                "null",
                re.compile(r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"),
            ]
        }
    },
)

SPAM_PATTERNS = (
    (re.compile(r"\b(?:winner|lottery|prize|free\s+(?:cash|gift|money|iPhone))\b", re.I), 20,
     "Prize, lottery, or free-gift language"),
    (re.compile(r"\b(?:urgent|act now|immediately|limited time|expires today)\b", re.I), 15,
     "Urgent or time-limited language"),
    (re.compile(r"\b(?:click here|verify (?:your )?(?:account|identity)|confirm (?:your )?(?:account|details))\b", re.I), 25,
     "A request to click a link or verify account details"),
    (re.compile(r"\b(?:password|bank details|credit card|social security|one-time passcode|\bOTP\b)\b", re.I), 25,
     "A request involving sensitive credentials or financial details"),
    (re.compile(r"\b(?:wire transfer|gift card|send money|payment required|processing fee)\b", re.I), 25,
     "A request for payment or money transfer"),
    (re.compile(r"\b(?:guaranteed|risk[- ]free)\b", re.I), 15,
     "Unusually guaranteed or risk-free claims"),
)
URL_PATTERN = re.compile(r"https?://|www\.", re.I)
SHORT_URL_PATTERN = re.compile(r"https?://(?:bit\.ly|tinyurl\.com|t\.co|goo\.gl|cutt\.ly)/", re.I)
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@app.get("/")
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})


@app.post("/api/detect")
def detect():
    if not request.is_json:
        return jsonify({"error": "Send a JSON request body."}), 415

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"error": "The request body must be a JSON object."}), 400

    sender = payload.get("sender", "")
    subject = payload.get("subject", "")
    body = payload.get("body", "")
    for field, value, limit in (
        ("sender", sender, 254),
        ("subject", subject, 200),
        ("body", body, 10000),
    ):
        if not isinstance(value, str):
            return jsonify({"error": f"{field} must be text."}), 400
        if len(value) > limit:
            return jsonify({"error": f"{field} must be {limit} characters or fewer."}), 400

    if sender and not EMAIL_PATTERN.fullmatch(sender.strip()):
        return jsonify({"error": "Enter a valid sender email address, or leave it blank."}), 400
    if not body.strip():
        return jsonify({"error": "Paste the email content before checking it."}), 400

    email_text = f"{sender}\n{subject}\n{body}"
    score = 0
    signals = []
    for pattern, weight, signal in SPAM_PATTERNS:
        if pattern.search(email_text):
            score += weight
            signals.append(signal)

    if URL_PATTERN.search(email_text):
        score += 10
        signals.append("Contains a web link")
    if SHORT_URL_PATTERN.search(email_text):
        score += 15
        signals.append("Contains a shortened link that hides its destination")
    if re.search(r"!{2,}", email_text):
        score += 5
        signals.append("Uses repeated exclamation marks")

    risk_score = min(score, 100)
    is_spam = risk_score >= 30
    summary = (
        "This email has multiple common spam or phishing warning signs."
        if is_spam
        else "No strong common spam or phishing pattern was detected."
    )

    return jsonify({
        "is_spam": is_spam,
        "classification": "spam" if is_spam else "not_spam",
        "risk_score": risk_score,
        "signals": signals,
        "summary": summary,
    })


if __name__ == "__main__":
    threading.Timer(1, lambda: webbrowser.open("http://127.0.0.1:5000")).start()
    app.run(host="127.0.0.1", port=5000, debug=False)
