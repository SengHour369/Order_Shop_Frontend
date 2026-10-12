# Local Keycloak sign-in

E-Shop supports Keycloak Authorization Code + PKCE (S256) in addition to the existing password login. Angular uses the official `keycloak-js` adapter. Credentials remain in memory; session storage contains only a validated internal return route and the adapter's temporary PKCE/state data.

## Local addresses

- E-Shop: http://localhost:4200/auth
- Keycloak administration: http://localhost:8180/admin/
- Realm: `eshop`
- Public browser client: `eshop-web` (no client secret)
- Required access-token audience: `eshop-api`
- Exact redirect: `http://localhost:4200/auth/keycloak/callback`
- Logout redirect: `http://localhost:4200/auth`

Use `localhost`, not `127.0.0.1`, in the browser. Other hosts/ports require explicit realm redirect and origin changes.

Backend files are in `D:\spring boot\E-Shop`:

- `compose.keycloak.yaml`: local server and auth-service configuration.
- `keycloak/realm-template.json`: client, audience mapper, PKCE enforcement, and local test identity.
- `keycloak/initialize-local.ps1`: generates ignored local secrets and realm import once.
- `keycloak/local-credentials.txt`: generated development login credentials; never commit or share.
- `auth-service/src/main/resources/db/upgrade/20261012_keycloak_identity.sql`: explicit external identity ownership table.

Start from the backend directory, preserving the other overlays used by your stack:

```powershell
# Run once, only if .env.keycloak.local does not exist:
./keycloak/initialize-local.ps1
docker compose --env-file .env.keycloak.local -f compose.yaml -f compose.ai.yaml -f compose.local.yaml -f compose.ollama.yaml -f compose.keycloak.yaml up -d keycloak auth-service api-gateway
```

The local server is bound to loopback, uses a persistent Docker volume, and imports a realm only when it does not already exist. Replacing the import JSON does not update existing users or clients. This development server uses HTTP and `start-dev`; production requires a production database, HTTPS, correct public hostname, restricted origins, secret management, and Keycloak production settings.

## Processing and permission ownership

1. Angular loads the public non-secret configuration before the router processes a callback.
2. Sign-in redirects to Keycloak using a public client, code flow, PKCE and adapter-managed state/nonce validation.
3. The adapter exchanges the code. Angular posts the access token to the E-Shop exchange endpoint.
4. Auth-service verifies RS256 signature using cached provider JWKS, issuer, expiry, audience and authorized client (`azp`). JWKS requests have bounded connection/read timeouts.
5. Auth-service looks up the exact `(issuer, subject)` in `external_identity`. Unknown identities are rejected. Email, username and Keycloak roles never automatically grant access or link accounts.
6. The linked local user must be enabled, active and not deleted. E-Shop issues its existing access/refresh session, records the login audit, and preserves numeric user IDs and local permissions.
7. Downstream services continue to validate E-Shop JWTs. They do not directly accept Keycloak JWTs. Admin UI rendering and backend permission enforcement continue to use E-Shop's authoritative grants.
8. Logout revokes the E-Shop refresh token, then ends the Keycloak session for Keycloak sign-ins.

Provider-initiated backchannel logout and continuous synchronization of Keycloak account status are not implemented by this exchange bridge. Disable/revoke accounts in E-Shop to enforce local access policy. Existing short-lived access JWTs follow the app's existing expiration behavior. Reloading the app requires sign-in again; the existing Keycloak browser session can complete that without another password prompt.

## Identity linking

Link accounts only after an administrator verifies ownership of both identities. A Keycloak management-console administrator is separate from an E-Shop application administrator. No account is linked automatically by application startup.

The generated development identity has subject `72c15889-5991-44de-92c6-64d32b146301` and username `eshop-admin`. The proposed mapping to existing local E-Shop admin ID 1 requires explicit approval. If left unlinked, successful Keycloak authentication still returns an E-Shop sign-in rejection, by design.

For other accounts, apply the migration and insert a verified subject with its existing E-Shop user ID using your controlled database administration process. Do not use user-supplied email or realm roles to select an E-Shop administrator.

## API examples

```http
GET /api/v1/public/keycloak/config
```

```json
{"enabled":true,"url":"http://localhost:8180","realm":"eshop","clientId":"eshop-web"}
```

```http
POST /api/v1/public/keycloak/exchange
Content-Type: application/json
```

```json
{"accessToken":"<Keycloak access token from the browser adapter>"}
```

Returns the existing E-Shop `AuthenticationResponse` containing `id`, `access_token`, `refresh_token`, `username`, `email` and local `role`. Responses are `Cache-Control: no-store`. Invalid/expired tokens, wrong issuer/audience/client and unlinked/inactive accounts receive 401. Disabled integration receives 503. Neither browser nor backend logs should contain token bodies.

Both paths are explicitly public in the gateway; all other authorization rules remain in place. Remove the Keycloak overlay to disable the integration (default `eshop.keycloak.enabled=false`). Existing password login remains available even when the identity provider is offline.

## Verification performed

- Angular: 34 test files / 166 tests passed, production build passed.
- Backend: 13 selected tests passed, including real RSA/JWKS verification, issuer/audience/client/expiry checks, explicit identity persistence, inactive/deleted-account rejection, and HTTP error handling with the existing global advice.
- Live gateway: configuration enabled, forged token 401, blank token 400; existing local administrator password login, permissions and logout succeeded.
- Browser: English and Khmer sign-in option, S256 redirect, real local Keycloak login, callback and verified-token identity lookup checked. The unlinked identity was denied as intended.
- Successful E-Shop admin sign-in through Keycloak remains pending approval of the explicit admin identity link. This is not yet a verified successful admin SSO session.

On this Java 25 machine, Mockito tests required its explicit Java agent instead of dynamic self-attachment. Final builds used bounded Java/Node heaps; no production authentication behavior depends on a test agent.

## Reference links

- [Keycloak browser adapter](https://www.keycloak.org/securing-apps/javascript-adapter)
- [Keycloak container configuration](https://www.keycloak.org/server/containers)
- [Spring Security JWT validation](https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html)
