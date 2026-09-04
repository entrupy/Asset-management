import logging
import os
from pathlib import Path

from dotenv import load_dotenv

from checks.applications import RequiredApplicationsCheck
from checks.checkin import CheckInCheck
from checks.filevault import FileVaultCheck
from checks.os_version import MacOSVersionCheck
from kandji.api import ConfigurationError, KandjiAPIClient, KandjiAPIError
from kandji.devices import Device
from reports.csv_report import generate_csv_report
from reports.summary import render_summary


logger = logging.getLogger(__name__)


def configure_logging() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s - %(message)s")


def parse_required_applications(value: str) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


def load_runtime_config() -> dict:
    load_dotenv()
    return {
        "api_base_url": os.getenv("KANDJI_API_BASE_URL", "").strip(),
        "api_token": os.getenv("KANDJI_API_TOKEN", "").strip(),
        "device_endpoint": os.getenv("KANDJI_DEVICE_ENDPOINT", "devices").strip() or "devices",
        "check_in_days": int(os.getenv("CHECK_IN_DAYS", "7")),
        "min_macos_version": os.getenv("MIN_MACOS_VERSION", "").strip(),
        "required_applications": parse_required_applications(os.getenv("REQUIRED_APPLICATIONS", "")),
    }


def evaluate_device(device: Device, config: dict) -> dict:
    checks = [
        CheckInCheck(max_days=config["check_in_days"]),
        MacOSVersionCheck(min_version=config["min_macos_version"]),
        FileVaultCheck(),
        RequiredApplicationsCheck(config["required_applications"]),
    ]

    status_order = {"PASS": 0, "UNKNOWN": 1, "FAIL": 2}
    statuses = []
    issues: list[str] = []

    for check in checks:
        check_status, check_issues = check.evaluate(device)
        statuses.append(check_status)
        issues.extend(check_issues)

    if any(status == "FAIL" for status in statuses):
        overall_status = "NON_COMPLIANT"
    elif any(status == "UNKNOWN" for status in statuses):
        overall_status = "UNKNOWN"
    else:
        overall_status = "COMPLIANT"

    return {
        "device_name": device.device_name or "Unknown",
        "serial_number": device.serial_number or "",
        "model": device.model or "",
        "user": device.user or "",
        "blueprint": device.blueprint or "",
        "os_version": device.os_version or "",
        "last_check_in": device.last_check_in or "",
        "filevault_status": device.filevault_status or "UNKNOWN",
        "compliance_status": overall_status,
        "compliance_issues": issues,
    }


def main() -> int:
    configure_logging()
    logger.info("Starting Kandji Compliance Reporter")

    try:
        config = load_runtime_config()
        client = KandjiAPIClient(
            base_url=config["api_base_url"],
            token=config["api_token"],
            timeout=30,
            device_endpoint=config["device_endpoint"],
        )
    except ConfigurationError as exc:
        logger.error("Configuration error: %s", exc)
        return 1

    try:
        logger.info("Connecting to Kandji")
        raw_devices = client.list_devices()
    except KandjiAPIError as exc:
        logger.error("Kandji API error: %s", exc)
        return 1

    logger.info("Retrieved %s devices", len(raw_devices))

    devices = [Device.from_api(item) for item in raw_devices if isinstance(item, dict)]
    assessments = [evaluate_device(device, config) for device in devices]

    logger.info("Running compliance checks")
    report_path = generate_csv_report(assessments, Path("reports"))
    summary_text = render_summary(assessments)

    logger.info("Compliance checks completed")
    logger.info("%s devices compliant", sum(1 for item in assessments if item["compliance_status"] == "COMPLIANT"))
    logger.info("%s devices non-compliant", sum(1 for item in assessments if item["compliance_status"] == "NON_COMPLIANT"))
    logger.info("%s devices unknown", sum(1 for item in assessments if item["compliance_status"] == "UNKNOWN"))
    logger.info("Report generated at %s", report_path)
    print(summary_text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
