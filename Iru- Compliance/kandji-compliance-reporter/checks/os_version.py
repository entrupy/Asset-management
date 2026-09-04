from __future__ import annotations

from kandji.devices import Device


class MacOSVersionCheck:
    def __init__(self, min_version: str = "") -> None:
        self.min_version = min_version.strip()

    def _parse_version(self, value: str) -> tuple[int, ...]:
        return tuple(int(part) for part in value.replace("macOS ", "").split(".") if part.isdigit())

    def evaluate(self, device: Device) -> tuple[str, list[str]]:
        os_version = (device.os_version or "").strip()
        if not os_version:
            return "UNKNOWN", ["macOS version is missing or unavailable"]

        if not self.min_version:
            return "UNKNOWN", ["Minimum macOS version is not configured"]

        current = self._parse_version(os_version)
        minimum = self._parse_version(self.min_version)
        if len(current) < len(minimum):
            current = current + (0,) * (len(minimum) - len(current))
        if len(minimum) < len(current):
            minimum = minimum + (0,) * (len(current) - len(minimum))

        if current >= minimum:
            return "PASS", []
        return "FAIL", [f"macOS version below minimum requirement ({self.min_version})"]
