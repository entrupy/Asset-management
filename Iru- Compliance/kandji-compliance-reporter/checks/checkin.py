from __future__ import annotations

from datetime import datetime, timezone

from kandji.devices import Device


class CheckInCheck:
    def __init__(self, max_days: int = 7) -> None:
        self.max_days = max_days

    def evaluate(self, device: Device) -> tuple[str, list[str]]:
        last_check_in = device.last_check_in
        if not last_check_in:
            return "UNKNOWN", ["Last check-in is missing or unavailable"]

        try:
            if isinstance(last_check_in, str):
                if last_check_in.endswith("Z"):
                    last_check_in = last_check_in[:-1] + "+00:00"
                parsed = datetime.fromisoformat(last_check_in)
                if parsed.tzinfo is None:
                    parsed = parsed.replace(tzinfo=timezone.utc)
            else:
                parsed = datetime.fromtimestamp(float(last_check_in), tz=timezone.utc)
        except (TypeError, ValueError):
            return "UNKNOWN", ["Last check-in timestamp is invalid"]

        now = datetime.now(timezone.utc)
        delta_days = (now - parsed).total_seconds() / 86400

        if delta_days <= self.max_days:
            return "PASS", []
        return "FAIL", [f"Last check-in is older than {self.max_days} days"]
