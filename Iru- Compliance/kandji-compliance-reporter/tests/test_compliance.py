from kandji.devices import Device
from checks.checkin import CheckInCheck
from checks.os_version import MacOSVersionCheck
from checks.filevault import FileVaultCheck


def test_checkin_passes_recent_device():
    device = Device(last_check_in="2026-09-01T00:00:00+00:00")
    status, issues = CheckInCheck(max_days=7).evaluate(device)
    assert status == "PASS"
    assert issues == []


def test_checkin_fails_old_device():
    device = Device(last_check_in="2026-08-01T00:00:00+00:00")
    status, issues = CheckInCheck(max_days=7).evaluate(device)
    assert status == "FAIL"
    assert any("Last check-in" in issue for issue in issues)


def test_macos_version_check_passes():
    device = Device(os_version="14.5")
    status, issues = MacOSVersionCheck(min_version="14.0").evaluate(device)
    assert status == "PASS"
    assert issues == []


def test_macos_version_check_fails():
    device = Device(os_version="13.5")
    status, issues = MacOSVersionCheck(min_version="14.0").evaluate(device)
    assert status == "FAIL"
    assert any("minimum" in issue for issue in issues)


def test_filevault_unknown_when_missing():
    device = Device(filevault_status=None)
    status, issues = FileVaultCheck().evaluate(device)
    assert status == "UNKNOWN"
    assert issues
