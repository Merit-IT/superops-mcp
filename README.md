# SuperOps MCP Server

An open-source **Model Context Protocol (MCP)** server for the **SuperOps.ai** MSP platform — enabling natural language queries for tickets, invoices, clients, and worklogs. Supports both local (stdio) and remote (Streamable HTTP + OAuth 2.0) modes.

We only use SuperOps as a PSA so this is all that's set up for right now.

---

## Available Tools

| Tool | Description |
|------|-------------|
| `list_tickets` | Fetch tickets with filtering and sorting (status, priority, date, client) |
| `list_clients` | Fetch all clients with pagination and sorting |
| `list_client_site` | Fetch a client site by ID |
| `list_invoices` | Fetch invoices with filtering (status, dates, amounts, client) |
| `list_invoice` | Fetch a single invoice by ID |
| `list_worklog_entries` | Fetch worklog entries for tickets or projects with filtering |
| `list_client` | Fetch an indiviudal client |
| `list_client_contract` | Fetch an indiviudal client contract item by id |
| `list_client_contracts` | Fetch client contracts |
| `list_client_custom_fields` | Fetch client custom fileds
---


## Sample Queries

```
"What client submitted the most tickets last week, make sure to get all results"
"List all our clients and their status"
"What clients are located in City, State"
"What clients have <name> as their account manager?"
"What open invoices are there"
"What client has the most open invoices"
"What technician did not put in 40 hours last week"
```

## Deployment Options (2)

## 1) Locally build (stdio)

### Pre-Req

#### Set Env vars for Claude to use
```cmd
setx SUPEROPS_API_KEY "your_token"
setx SUPEROPS_SUBDOMAIN "your_subdomain"
```

--or--

#### Config file location (if you did not set with cmd)

Windows:
```
%APPDATA%\Claude\claude_desktop_config.json
```

macOS:
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

#### sample claude_desktop_config.json  (if you did not set with cmd)
```json
{
  "mcpServers": {
    "superops": {
      "command": "node",
      "args": ["C:\\Users\\YOUR_USERNAME\\superops-mcp\\dist\\index.js"],
      "env": {
        "SUPEROPS_API_KEY": "YOUR_API_TOKEN",
        "SUPEROPS_SUBDOMAIN": "your-subdomain"
      }
    }
  }
}
```

### Run as a local MCP server via stdio:

```bash
node tsc index.ts
node dist/index.js
```


## 2) Bicep / Azure + Oauth setup

Most advanced use case but the Bicep file should handle setting up. The remote server exposes an MCP endpoint over Streamable HTTP with OAuth 2.0 authentication via Microsoft Entra ID.

### Azure Deployment

Infrastructure is defined in Bicep under `infra/`:

- **Container App** — runs the MCP server (scales 0-5 replicas)
- **API Management** — Consumption tier pass-through proxy, terminates TLS.   APIM does no endpoint logic. Its policy just sets the backend and forwards the X-Forwarded-Host header. All 4 operations (GET /*, POST /*, DELETE /*, OPTIONS /*) route everything straight to the Container App.
- **Key Vault** — stores secrets
- **Container Registry** — Docker images

### Pre-Req

#### Create app
```powershell
APP_NAME="superops-mcp"

# Create the app registration
$APP_ID=$(az ad app create \
  --display-name "$APP_NAME" \
  --query appId -o tsv)

echo "Client ID (OAUTHCLIENTID): $APP_ID"
```
#### Create a client secret (2-year expiry)
```powershell
CLIENT_SECRET=$(az ad app credential reset \
  --id $APP_ID \
  --years 2 \
  --query password -o tsv)

echo "Client Secret (ENTRACLIENTSECRET): $CLIENT_SECRET"
```
### Set scopes


```powershell
# Set the Application ID URI
az ad app update \
  --id $APP_ID \
  --identifier-uris "api://$APP_ID"

# Add the access_as_user scope
az ad app update \
  --id $APP_ID \
  --set api.oauth2PermissionScopes="[{
    \"id\": \"$(uuidgen)\",
    \"adminConsentDescription\": \"Allow the app to access SuperOps MCP as the signed-in user\",
    \"adminConsentDisplayName\": \"Access SuperOps MCP\",
    \"isEnabled\": true,
    \"type\": \"User\",
    \"userConsentDescription\": \"Allow the app to access SuperOps MCP on your behalf\",
    \"userConsentDisplayName\": \"Access SuperOps MCP\",
    \"value\": \"access_as_user\"
  }]"
```

### Create a Service Principal (needed to grant admin consent)

```powershell
az ad sp create --id $APP_ID

# Grant admin consent for the tenant
az ad app permission admin-consent --id $APP_ID
```

### Get Azure Creds for Github workflow

```powershell
# Create SP
SP=$(az ad sp create-for-rbac \
  --name "superops-mcp-github" \
  --role Contributor \
  --scopes /subscriptions/$SUBSCRIPTION_ID)

# Extract values
echo $SP | jq '{
  clientId: .appId,
  clientSecret: .password,
  tenantId: .tenant,
  subscriptionId: "'$SUBSCRIPTION_ID'"
}'

```
*The service principal also needs permission to create/manage the app registration and grant admin consent, so you may need to add the Application Administrator Entra role separately in the Azure portal under Entra ID > Roles and administrators.*

### Your Github repo should be setup with secrets defined and needed by Bicep to set in the KeyVault

```deploy.yml
              creds: ${{ secrets.AZURECREDENTIALS }}
              superopsApiKey='${{ secrets.SUPEROPSAPIKEY }}' \
              superopsSubdomain='${{ secrets.SUPEROPSSUBDOMAIN }}' \
              oauthClientId='${{ secrets.OAUTHCLIENTID }}' \
              entraClientSecret='${{ secrets.ENTRACLIENTSECRET }}'
```

### Connecting

Point your MCP client to the `/mcp` endpoint:

```
https://your-apim-url.azure-api.net/mcp
```

No client ID or secret needed — the client automatically discovers OAuth metadata at `/.well-known/oauth-authorization-server`, registers itself, and walks through the Entra ID login flow.

---

### Routes

| Endpoint | Method | Auth Required | Description |
|---|---|---|---|
| `/.well-known/oauth-authorization-server` | GET | No | OAuth metadata (auto-generated by mcpAuthRouter) |
| `/authorize` | GET | No | Starts OAuth flow, redirects to Microsoft login |
| `/token` | POST | No | Exchanges authorization code for token |
| `/register` | POST | No | Dynamic client registration |
| `/callback` | GET | No | Microsoft redirects here after user login |
| `/health` | GET | No | Returns `healthy` or `starting` status |
| `/mcp` | POST | Bearer token | JSON-RPC messages, session management |
| `/mcp` | GET | Bearer token | SSE stream for server-initiated messages |
| `/mcp` | DELETE | Bearer token | Session termination |


## Debugging

### MCP Inspector

```bash
npx @modelcontextprotocol/inspector node dist/remote-server.js
```


### Setup for local dev

```bash
npm install
npm run build
```

### Claude Desktop logs (Windows)

```
%AppData%\Roaming\Claude\logs
```

---


