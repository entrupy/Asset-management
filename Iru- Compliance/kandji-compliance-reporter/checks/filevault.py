from __future__ import annotations

from kandji.devices import Device


class FileVaultCheck:
    def evaluate(self, device: Device) -> tuple[str, list[str]]:
        value = device.filevault_status
        if value is None:
            return "UNKNOWN", ["FileVault status is unavailable"]

        normalized = str(value).strip().lower()
        if normalized in {"enabled", "true", "on", "pass"}:
            return "PASS", []
        if normalized in {"disabled", "false", "off", "fail"}:
            return "FAIL", ["FileVault disabled"]
        return "UNKNOWN", ["FileVault status is unrecognized"]
