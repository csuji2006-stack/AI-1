# Email spam detector backend

The Flask app serves the frontend and provides the email-checking API on the same origin.

From the `frontend` directory, double-click `start_detector.bat`. It starts the backend and opens the detector in your browser. Alternatively, from this directory, install the requirements and start the app:

```powershell
python -m pip install -r requirements.txt
python app.py
```

Open <http://127.0.0.1:5000>. Paste an email's content into the detector; checking starts automatically after a short pause. The optional sender and subject are included in the check. `POST /api/detect` accepts JSON with `sender`, `subject`, and `body` string fields. `GET /api/health` reports whether the service is running.

Detection uses transparent, rule-based warning signs and a risk score. It is a demonstration, not a trained machine-learning classifier, mail-server integration, or a guarantee that an email is safe. Emails are only analyzed after the user pastes them into the page; the app does not access an inbox.

Run the backend tests from this directory with:

```powershell
python -m unittest
```
