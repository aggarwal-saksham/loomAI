import asyncio
import unittest

from app.connectors.mock import MockSearchConnector


class ConnectorTests(unittest.TestCase):
    def test_mock_connector_returns_traceable_fixture_documents(self) -> None:
        documents = asyncio.run(MockSearchConnector().fetch("fintech hackathon", limit=2))
        self.assertEqual(len(documents), 2)
        self.assertTrue(all(document.url.startswith("https://") for document in documents))


if __name__ == "__main__":
    unittest.main()
