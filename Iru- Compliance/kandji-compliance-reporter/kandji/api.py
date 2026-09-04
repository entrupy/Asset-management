import logging
import os
from typing import Any

import requests

logger = logging.getLogger(__name__)


class ConfigurationError(ValueError):
    """Raised when required runtime configuration is missing or invalid."""


class KandjiAPIError(RuntimeError):
    """Raised when the Kandji API request fails."""


class KandjiAPIClient:
    def __init__(self, base_url: str, token: str, timeout: int = 30, device_endpoint: str = "devices") -> None:
        self.base_url = base_url.rstrip("/")
        self.token = token
        self.timeout = timeout
        self.device_endpoint = device_endpoint.lstrip("/")

        if not self.base_url:
            raise ConfigurationError("KANDJI_API_BASE_URL is not configured. Set it in your environment or .env file.")

        if not self.token:
            raise ConfigurationError("KANDJI_API_TOKEN is missing. Set the environment variable before running the report.")

        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        })

    def _endpoint(self, path: str) -> str:
        return f"{self.base_url}/{path.lstrip('/')}"

    def list_devices(self) -> list[dict[str, Any]]:
        url = self._endpoint(self.device_endpoint)
        logger.info("Connecting to Kandji at %s", url)

        try:
            response = self.session.get(url, timeout=self.timeout)
        except requests.exceptions.Timeout:
            raise KandjiAPIError("Request to Kandji timed out. Check the API availability and network connectivity.") from None
        except requests.exceptions.ConnectionError:
            raise KandjiAPIError("Unable to connect to the Kandji API. Check the base URL and network connectivity.") from None
        except requests.exceptions.RequestException as exc:
            raise KandjiAPIError(f"Request failed before a response was received: {exc.__class__.__name__}") from exc

        if response.status_code == 401:
            raise KandjiAPIError("Authentication failed. Verify the Kandji API token and permissions.")
        if response.status_code == 403:
            raise KandjiAPIError("Access forbidden. Check the API token scope and account permissions.")
        if response.status_code == 429:
            raise KandjiAPIError("Kandji API rate limit reached. Retry later or reduce request frequency.")
        if response.status_code >= 500:
            raise KandjiAPIError("Kandji API is unavailable or returned a server error.")
        if response.status_code >= 400:
            raise KandjiAPIError(f"Kandji API returned an unexpected HTTP error: {response.status_code}.")

        try:
            payload = response.json()
        except ValueError as exc:
            raise KandjiAPIError("Invalid JSON response received from the Kandji API.") from exc

        if isinstance(payload, dict):
            items = payload.get("data") or payload.get("devices") or payload.get("results")
            if isinstance(items, list):
                return items
            if not items:
                return []
            raise KandjiAPIError("Kandji API response did not contain a recognized device list.")

        if isinstance(payload, list):
            return payload

        raise KandjiAPIError("Kandji API response was not a list or object containing a device list.")
