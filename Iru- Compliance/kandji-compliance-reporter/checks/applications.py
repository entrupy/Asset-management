from __future__ import annotations

from kandji.devices import Device


class RequiredApplicationsCheck:
    def __init__(self, required_applications: list[str] | None = None) -> None:
        self.required_applications = [app.strip() for app in (required_applications or []) if app and app.strip()]

    def evaluate(self, device: Device) -> tuple[str, list[str]]:
        if not self.required_applications:
            return "UNKNOWN", ["No required applications configured"]

        installed = device.raw.get("installed_applications") or device.raw.get("applications") or []
        if not isinstance(installed, list):
            installed = []

        names = {str(item).strip().lower() for item in installed}
        missing = []
        for app in self.required_applications:
            if app.lower() not in names:
                missing.append(app)

        if not missing:
            return "PASS", []
        return "FAIL", [f"Required applications missing: {', '.join(missing)}"]
