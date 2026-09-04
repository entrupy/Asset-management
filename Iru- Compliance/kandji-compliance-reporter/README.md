# Kandji Compliance Reporter

Kandji Compliance Reporter is a small Python automation project that connects to the Kandji API, collects Mac device inventory, evaluates device compliance against configurable rules, and exports a CSV report and text summary.

It is designed for a simple GitHub Actions schedule so that an IT administrator can run compliance checks on a recurring basis without a database or a large operational framework.

## What the project does

- Connects to the Kandji API using an environment variable token
- Retrieves device inventory
- Evaluates devices against configurable checks
- Writes a timestamped CSV report to the `reports/` folder
- Prints a compliance summary for later Slack or email automation
- Runs automatically in GitHub Actions on a schedule or manually

## Project architecture

- `main.py` orchestrates the full run
- `kandji/api.py` contains the Kandji API client and error handling
- `kandji/devices.py` creates a safe device data model
- `checks/` contains independent compliance check modules
- `reports/` contains CSV generation and summary logic
- `.github/workflows/compliance.yml` runs the job in GitHub Actions

## Prerequisites

- Python 3.11+
- Access to a Kandji instance with a valid API token
- A Kandji API base URL that matches the vendor documentation for your environment
- GitHub repository access for Actions secrets and variables

## Install Python dependencies

From the project root:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

## Configure `.env`

Create a local `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Then edit `.env` and set:

```env
KANDJI_API_TOKEN="your-token"
KANDJI_API_BASE_URL="https://your-kandji-instance.example.com"
KANDJI_DEVICE_ENDPOINT="devices"
CHECK_IN_DAYS="7"
MIN_MACOS_VERSION="14.0"
REQUIRED_APPLICATIONS="Google Chrome,Slack,Zoom,1Password"
```

Important:

- Never commit `.env`
- Never print the token in logs
- Never add credentials into source control
- `KANDJI_API_BASE_URL` and `KANDJI_DEVICE_ENDPOINT` should be verified against the current Kandji API documentation for your environment

## Run locally

```bash
source .venv/bin/activate
python main.py
```

This generates a CSV in the `reports/` directory and prints a summary.

## Configure GitHub Secrets

In the GitHub repository:

1. Open Settings > Secrets and variables > Actions
2. Add a repository or environment secret named `KANDJI_API_TOKEN`
3. Add repository variables for compliance settings such as:
   - `KANDJI_API_BASE_URL`
   - `KANDJI_DEVICE_ENDPOINT`
   - `CHECK_IN_DAYS`
   - `MIN_MACOS_VERSION`
   - `REQUIRED_APPLICATIONS`

The workflow reads the token from GitHub Secrets and never logs it.

## Run GitHub Actions manually

1. Open the GitHub repository
2. Go to Actions
3. Choose the `Kandji Compliance Report` workflow
4. Click `Run workflow`
5. The job will run and upload the CSV artifact

## Scheduling

The workflow uses a cron schedule in `.github/workflows/compliance.yml`.

Example schedule:

```yaml
schedule:
  - cron: '0 3 * * *'
```

This runs daily at 03:00 UTC. You can adjust the cron expression to match your maintenance window.

## Change compliance rules

Edit environment variables in `.env` for local work or repository variables/secrets for GitHub Actions.

Examples:

- `CHECK_IN_DAYS` controls the maximum number of days since the last check-in
- `MIN_MACOS_VERSION` sets the minimum supported macOS version
- `REQUIRED_APPLICATIONS` controls which software must be installed

## Add additional compliance checks

Create a new module in the `checks/` package, for example:

- `disk_encryption.py`
- `admin_user.py`
- `backup_status.py`

Then add the new check to the evaluation flow in `main.py`.

Each rule should return one of:

- `PASS`
- `FAIL`
- `UNKNOWN`

Because the checks are independent, you can add more rules without rewriting the full project.

## Add Slack notifications later

This project separates the data collection and compliance logic from the reporting layer, which makes it easy to add a Slack notification step later.

Recommended future pattern:

- Keep the CSV and summary generation as-is
- Add a new module named `notifications/slack.py`
- Send a summary message after the report is created
- Keep credentials in GitHub Secrets or a secure configuration system

## Security notes

- No API token is stored in code
- `.env` is ignored by Git
- Generated reports are ignored by Git
- The GitHub Actions workflow reads secrets from secure configuration only
- The application never logs authorization headers or raw secrets

## Files created in this project

- `main.py`: entry point for the full workflow
- `requirements.txt`: Python dependencies
- `.env.example`: sample local configuration
- `.gitignore`: ignores local secrets and generated reports
- `kandji/api.py`: Kandji API client with timeout, error handling, and auth support
- `kandji/devices.py`: safe device representation
- `checks/`: compliance modules for last check-in, macOS version, FileVault, and applications
- `reports/`: CSV and summary generation logic
- `.github/workflows/compliance.yml`: scheduled and manual GitHub Actions automation

## Notes about Kandji API configuration

The exact endpoint and path structure may vary by Kandji deployment and version. This project intentionally leaves the API path configurable through `KANDJI_API_BASE_URL` and `KANDJI_DEVICE_ENDPOINT`, and the final values should be verified against the current Kandji API documentation for your environment.

This keeps the project secure and avoids guessing undocumented endpoint details.
