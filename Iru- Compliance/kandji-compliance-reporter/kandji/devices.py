from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class Device:
    device_name: str | None = None
    serial_number: str | None = None
    model: str | None = None
    platform: str | None = None
    os_version: str | None = None
    user: str | None = None
    blueprint: str | None = None
    last_check_in: str | None = None
    status: str | None = None
    filevault_status: str | None = None
    raw: dict[str, Any] = field(default_factory=dict)

    @staticmethod
    def safe_get(data: dict[str, Any], *keys: str) -> Any:
        current: Any = data
        for key in keys:
            if not isinstance(current, dict):
                return None
            current = current.get(key)
        return current

    @classmethod
    def from_api(cls, item: dict[str, Any]) -> "Device":
        if not isinstance(item, dict):
            raise TypeError("Device data must be a dictionary.")

        return cls(
            device_name=Device.safe_get(item, "name") or Device.safe_get(item, "device_name") or Device.safe_get(item, "hostname"),
            serial_number=Device.safe_get(item, "serial_number") or Device.safe_get(item, "serial") or Device.safe_get(item, "serialNumber"),
            model=Device.safe_get(item, "model") or Device.safe_get(item, "device_model") or Device.safe_get(item, "modelName"),
            platform=Device.safe_get(item, "platform") or Device.safe_get(item, "os_platform") or Device.safe_get(item, "devicePlatform"),
            os_version=Device.safe_get(item, "os_version") or Device.safe_get(item, "osVersion") or Device.safe_get(item, "operating_system_version"),
            user=Device.safe_get(item, "user") or Device.safe_get(item, "username") or Device.safe_get(item, "assigned_user"),
            blueprint=Device.safe_get(item, "blueprint") or Device.safe_get(item, "blueprint_name") or Device.safe_get(item, "blueprintName"),
            last_check_in=Device.safe_get(item, "last_check_in") or Device.safe_get(item, "lastCheckIn") or Device.safe_get(item, "last_checkin"),
            status=Device.safe_get(item, "status") or Device.safe_get(item, "device_status") or Device.safe_get(item, "state"),
            filevault_status=Device.safe_get(item, "filevault") or Device.safe_get(item, "filevault_status") or Device.safe_get(item, "fileVaultStatus"),
            raw=item,
        )
