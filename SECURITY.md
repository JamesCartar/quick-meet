# Security

## Before pushing

Never commit Firebase service-account JSON, private keys, `.dev.vars`, real `.env` files, or deployment tokens. Store local credentials in ignored files and production credentials in Lightsail environment variables or a secrets manager. Use `pnpm check-secrets` before committing; it checks staged and working files for common credential patterns, not every possible secret or Git history.

Ignoring a file does not remove it from Git's index or past commits. If a real credential was committed or shared, revoke/rotate it first and remove it from history before pushing. Deleting the current file is not enough. Do not include secret values in issues, screenshots, logs, or pull requests.

Firebase web configuration (including its web API key) and the database URL are public identifiers. Database rules and backend authorization—not hiding web configuration—control access. Review API-key restrictions in Google Cloud for your deployed origins and required Firebase APIs.

Enable GitHub secret scanning and push protection where available. CI does not need production credentials. Keep deployment credentials out of pull-request workflows.

## Current prototype limitations

This app has no authentication or access control. Anyone who can reach its public API can join or invoke meeting mutations. CORS does not prevent non-browser API calls. Public Firebase reads expose participant metadata and signaling data; treat the meeting as public, not private.

`firebase/database.rules.json` denies browser writes and allows the reads required by the current prototype. Publish and verify those rules in Firebase; merely committing them does not update the live database. The backend service account can still write using its privileged credentials.

Before exposing this app for sensitive/internal meetings, add authentication, participant ownership checks, restricted signaling reads, and abuse/rate-limit protections. Keep service-account permissions scoped to what the backend needs. TURN is not configured, so some networks cannot establish media connections.

## Reporting

Do not post credentials or exploit details in a public issue. Once hosted on GitHub, enable private vulnerability reporting and use the repository's Security tab to report vulnerabilities privately.
