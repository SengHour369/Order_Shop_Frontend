# Grafana

Standalone Docker Compose deployment with persistent storage, file provisioning and a Prometheus target-health dashboard. Grafana queries an existing Prometheus server; this deployment does not install a collector or expose Angular/nginx metrics.

For step-by-step checks and daily usage, see [testing and usage](TESTING-AND-USAGE.md).

## Start

From the repository root:

```sh
cp deploy/grafana/.env.example deploy/grafana/.env
# Edit .env: set GRAFANA_ADMIN_PASSWORD and PROMETHEUS_URL.
docker compose --env-file deploy/grafana/.env -f deploy/grafana/compose.yaml config --quiet
docker compose --env-file deploy/grafana/.env -f deploy/grafana/compose.yaml up -d
```

Open http://localhost:3000 and sign in with the configured admin credentials. The dashboard is under **E-Shop → E-Shop · Prometheus target health**. If changing the port, update `GRAFANA_ROOT_URL` too.

`PROMETHEUS_URL` must be reachable from the container. `localhost` refers to Grafana itself. The example uses the Docker host via `host.docker.internal`; Prometheus must listen on an interface reachable from Docker. For a Prometheus container in another Compose project, attach Grafana to that deployment's network and use its service name. Configure the scrape interval to match the provisioned datasource's `timeInterval` (15 seconds by default).

The dashboard uses Prometheus's standard `up` metric for all scraped targets. It does not measure customer availability, browser errors, request latency or business metrics. Configure appropriate collectors and scrape jobs in your Prometheus deployment to add those signals.

## Operations

- Grafana is bound to loopback. For remote access, place an HTTPS reverse proxy in front and set `GRAFANA_ROOT_URL` to its public URL. For HTTPS, set `GF_SECURITY_COOKIE_SECURE: "true"` in the service environment.
- Credentials in `.env` are ignored by Git and excluded from the frontend Docker build context. For production, inject the password through your secret manager or Grafana's `GF_SECURITY_ADMIN_PASSWORD__FILE` mechanism instead of a Compose environment variable.
- Admin environment variables initialize a new database only. Changing them does not reset an existing user's password; use Grafana's password reset procedure.
- `grafana-data` persists users and settings. Back up this volume before upgrades. `docker compose ... down` preserves it; `down -v` deletes it.
- Dashboard JSON and datasource YAML are the source of truth. Edit them in Git; UI edits are disabled. Restart Grafana after datasource provisioning changes.
- The Grafana image is pinned for repeatable deployment. Review supported releases and security advisories regularly, update the tag, and validate before rollout. SQLite is suitable for this single instance; use an external supported database for high availability.

```sh
docker compose --env-file deploy/grafana/.env -f deploy/grafana/compose.yaml ps
docker compose --env-file deploy/grafana/.env -f deploy/grafana/compose.yaml logs --tail=100 grafana
```

References: [Docker configuration](https://grafana.com/docs/grafana/latest/setup-grafana/configure-docker/), [provisioning](https://grafana.com/docs/grafana/latest/administration/provisioning/).
