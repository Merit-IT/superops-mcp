// SuperOps MCP Server - Simplified Main Template
targetScope = 'subscription'

// Parameters
@description('Your SuperOps API key')
@secure()
param superopsApiKey string

@description('Your SuperOps subdomain')
param superopsSubdomain string

@description('Azure region')
param location string = 'eastus'

@description('OAuth Client ID (Azure AD App ID)')
param oauthClientId string

@description('Entra ID Client Secret')
@secure()
param entraClientSecret string

// Compute the APIM gateway URL (deterministic from resource group ID)
var uniqueSuffix = uniqueString(subscriptionResourceId('Microsoft.Resources/resourceGroups', 'superops-mcp-rg'))
var apimGatewayUrl = 'https://superops-apim-prod-${uniqueSuffix}.azure-api.net'

// Create resource group
resource rg 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: 'superops-mcp-rg'
  location: location
}

// Deploy everything
module infrastructure 'modules/infrastructure.bicep' = {
  scope: rg
  name: 'infrastructure'
  params: {
    location: location
    environment: 'prod'
    superopsApiKey: superopsApiKey
    superopsSubdomain: superopsSubdomain
    entraClientId: oauthClientId
    entraClientSecret: entraClientSecret
    entraTenantId: subscription().tenantId
    mcpServerBaseUrl: apimGatewayUrl
  }
}

module apiGateway 'modules/api-gateway-oauth.bicep' = {
  scope: rg
  name: 'api-gateway'
  params: {
    location: location
    environment: 'prod'
    backendUrl: infrastructure.outputs.containerAppUrl
  }
}

// Outputs
output resourceGroupName string = rg.name
output containerRegistryName string = infrastructure.outputs.containerRegistryName
output apiGatewayUrl string = apiGateway.outputs.gatewayUrl
output apiManagementName string = apiGateway.outputs.apiManagementName
