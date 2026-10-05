import unittest

from app import app


class SpamDetectionTests(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_detects_suspicious_email(self):
        response = self.client.post(
            "/api/detect",
            json={
                "sender": "offers@example.com",
                "subject": "Urgent prize",
                "body": "Congratulations winner! Click here to claim your prize: https://bit.ly/example",
            },
        )

        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        self.assertTrue(result["is_spam"])
        self.assertEqual(result["classification"], "spam")
        self.assertGreaterEqual(result["risk_score"], 30)
        self.assertTrue(result["signals"])

    def test_ordinary_email_is_not_flagged(self):
        response = self.client.post(
            "/api/detect",
            json={
                "sender": "colleague@example.com",
                "subject": "Meeting notes",
                "body": "Hello, the notes from today's meeting are attached.",
            },
        )

        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        self.assertFalse(result["is_spam"])
        self.assertEqual(result["classification"], "not_spam")
        self.assertEqual(result["risk_score"], 0)

    def test_rejects_empty_email_body(self):
        response = self.client.post("/api/detect", json={"body": "  "})

        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.get_json())

    def test_rejects_invalid_sender_address(self):
        response = self.client.post(
            "/api/detect",
            json={"sender": "not-an-email", "body": "Hello there"},
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("valid sender email", response.get_json()["error"])

    def test_health_endpoint(self):
        response = self.client.get("/api/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"status": "ok"})

    def test_file_opened_frontend_can_call_api(self):
        response = self.client.options(
            "/api/detect",
            headers={
                "Origin": "null",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type",
            },
        )

        self.assertEqual(response.headers.get("Access-Control-Allow-Origin"), "null")
        self.assertIn("POST", response.headers.get("Access-Control-Allow-Methods", ""))

    def test_root_serves_frontend(self):
        response = self.client.get("/")
        page = response.get_data()
        response.close()

        self.assertEqual(response.status_code, 200)
        self.assertIn(b"Email Spam Detector", page)


if __name__ == "__main__":
    unittest.main()
