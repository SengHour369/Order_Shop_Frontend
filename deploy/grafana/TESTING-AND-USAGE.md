# Grafana: testing and usage

## What Grafana does

Grafana displays metrics collected by Prometheus. In this project, the supplied dashboard shows whether Prometheus can scrape each configured target. Use it to investigate service connectivity and scrape failures.

Data flows from your service or exporter to Prometheus, then Grafana queries Prometheus and displays the results. This repository supplies Grafana only. You must run Prometheus separately and configure its scrape jobs. The Angular application and its nginx server do not expose Prometheus metrics automatically.

## 1. Prepare the configuration

Requirements: Docker Engine, Docker Compose v2, and an existing Prometheus server reachable from Docker.

Run all commands below from the repository root. Create the local configuration once; do not overwrite it if you have already configured it:

```sh
cp -n deploy/grafana/.env.example deploy/grafana/.env
```

Edit `deploy/grafana/.env`:

```dotenv
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD='replace-with-your-own-strong-password'
GRAFANA_PORT=3000
GRAFANA_ROOT_URL=http://localhost:3000
PROMETHEUS_URL=http://host.docker.internal:9090
```

Replace the password before starting. This file is ignored by Git. The example Prometheus URL points to the Docker host. Prometheus must listen on an interface reachable from Docker; a host service listening only on loopback may be inaccessible. Do not use `localhost:9090` for a host Prometheus server: inside Grafana, localhost means the Grafana container.

If port 3000 is occupied, set both `GRAFANA_PORT=3001` and `GRAFANA_ROOT_URL=http://localhost:3001`. Substitute that port in the browser and curl commands below.

## 2. Test the Compose configuration

```sh
docker compose --env-file deploy/grafana/.env -f deploy/grafana/compose.yaml config --quiet
```

Expected: exit code 0 and no output. Missing passwords, missing Prometheus URLs, or invalid Compose syntax must be fixed before startup. This check does not prove that the image can start or that Prometheus is reachable. Keep `--quiet` to avoid printing resolved credentials.

## 3. Start Grafana and test its health

```sh
docker compose --env-file deploy/grafana/.env -f deploy/grafana/compose.yaml up -d
docker compose --env-file deploy/grafana/.env -f deploy/grafana/compose.yaml ps
curl --fail --silent --show-error http://localhost:3000/api/health
```

Expected: the container is running, eventually reports `healthy`, and the HTTP health response contains `"database": "ok"`. Initial startup can take time while Grafana initializes its database. Grafana health confirms the application and its database; it does not confirm Prometheus connectivity.

If startup fails, inspect the logs:

```sh
docker compose --env-file deploy/grafana/.env -f deploy/grafana/compose.yaml logs --tail=100 grafana
```

## 4. Test login and the Prometheus connection

1. Open http://localhost:3000.
2. Sign in using the username and password from `.env`.
3. Open the provisioned **Prometheus** datasource in Grafana's data source settings and run its connection test, if available.
4. Open **Explore**, select **Prometheus**, and run `up`.

Expected: a successful Prometheus query and one series for each configured scrape target. An empty result can be valid if Prometheus has no scrape targets. A connection error means Grafana cannot query the configured server.

The supplied datasource is managed by provisioning. To change its URL, edit `.env` and run the startup command again so Compose recreates the container with the new environment.

## 5. Use the dashboard

Open **Dashboards → E-Shop → E-Shop · Prometheus target health**. The chart legend identifies targets by `job / instance`. Select a time range and hover over the chart to inspect values. The dashboard refreshes every 30 seconds; the datasource assumes a 15-second scrape interval.

| Result | Meaning | Next check |
| --- | --- | --- |
| `1` | Prometheus successfully scraped the target | Inspect service metrics for application health |
| `0` | Prometheus failed to scrape the target | Check the target's address, metrics endpoint and connectivity |
| No data | No matching series in the selected time range | Check time range and Prometheus scrape configuration |
| Query error | Grafana could not complete the query | Check datasource URL, Prometheus availability and logs |

A successful scrape does not prove checkout, payment or other customer flows work. Browser errors, latency, orders and payment counts require their own instrumentation and dashboards.

## 6. Optional failure and recovery test

Use a disposable test target already scraped by Prometheus. Do this in a local or test environment where stopping that target is acceptable.

1. Confirm its `up` series is `1`.
2. Stop that test target while leaving Prometheus and Grafana running.
3. Wait for the next scrape and dashboard refresh. Its value should become `0`.
4. Restart the target. After a successful scrape and refresh, it should return to `1`.

Keep the scrape job configured during this test. Removing the job can make the series disappear instead of showing `0`. Stopping Prometheus itself tests datasource connectivity and normally produces a query error rather than a target-down value.

## 7. Test persistence and stop safely

Create a temporary dashboard in a separate folder through the UI, save it, then restart Grafana:

```sh
docker compose --env-file deploy/grafana/.env -f deploy/grafana/compose.yaml restart grafana
```

After Grafana becomes healthy, sign in and confirm the saved dashboard still exists. Delete the temporary dashboard after testing. The supplied provisioned dashboard is read-only; change its JSON in Git when maintaining it.

Stop the deployment while preserving its database:

```sh
docker compose --env-file deploy/grafana/.env -f deploy/grafana/compose.yaml down
```

The named volume retains users, settings and saved dashboards. Adding `-v` deletes that volume and its data. Changing the initial admin password in `.env` does not reset an account in an existing database.

## Troubleshooting

| Symptom | Action |
| --- | --- |
| Browser cannot open Grafana | Check `compose ps`, logs and the configured host port |
| Port already allocated | Set an unused `GRAFANA_PORT` and update `GRAFANA_ROOT_URL` |
| Login fails after changing `.env` | Use the existing account password or Grafana's password reset procedure |
| Prometheus connection refused or timed out | Verify the container-reachable URL, host listener and firewall/network rules |
| Dashboard missing | Inspect startup logs for provisioning errors and verify the mounted files exist |
| Dashboard edits disabled | Edit `deploy/grafana/dashboards/target-health.json`; provisioning manages this dashboard |
| Prometheus works but shop metrics are missing | Configure service exporters/instrumentation and scrape jobs in Prometheus |

## Validation record

Configuration validation performed when this setup was added:

- Compose configuration rendered successfully using temporary validation values.
- Compose rejected missing required credentials and Prometheus URL.
- YAML files and dashboard JSON parsed successfully.
- Git whitespace validation passed.

These are static checks. Container startup, login, datasource connectivity, dashboard data and persistence require the runtime tests above; they have not been verified by this document.

See [deployment and production notes](README.md) for storage, HTTPS, secrets and upgrades.
