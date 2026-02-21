// Core Infrastructure Module
@description('Location for all resources')
param location string

@description('Environment name')
param environment string

@secure()
param superopsApiKey string

param superopsSubdomain string

param entraClientId string

@secure()
param entraClientSecret string

param entraTenantId string

@description('Public base URL for the MCP server (APIM gateway URL)')
param mcpServerBaseUrl string

// Variables
var uniqueSuffix = uniqueString(resourceGroup().id)
var acrName = 'superopsmcr${uniqueSuffix}'
var keyVaultName = 'kv-${uniqueSuffix}' // Shortened to fit 24-char limit
var logAnalyticsName = 'superops-logs-${environment}'
var appInsightsName = 'superops-insights-${environment}'
var containerAppEnvName = 'superops-env-${environment}'
var containerAppName = 'superops-mcp-${environment}'

// Container Registry
resource acr 'Microsoft.ContainerRegistry/registries@2023-01-01-preview' = {
  name: acrName
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true
    publicNetworkAccess: 'Enabled'
  }
  identity: {
    type: 'SystemAssigned'
  }
}

// Key Vault
resource keyVault 'Microsoft.KeyVault/vaults@2023-02-01' = {
  name: keyVaultName
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      defaultAction: 'Allow'
      bypass: 'AzureServices'
    }
  }
}

// Store SuperOps credentials in Key Vault
resource apiKeySecret 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  parent: keyVault
  name: 'superops-api-key'
  properties: {
    value: superopsApiKey
  }
}

resource subdomainSecret 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  parent: keyVault
  name: 'superops-subdomain'
  properties: {
    value: superopsSubdomain
  }
}

resource entraClientSecretKv 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  parent: keyVault
  name: 'entra-client-secret'
  properties: {
    value: entraClientSecret
  }
}

// Storage Account (for auth token persistence via Table Storage)
var storageAccountName = 'superops${uniqueSuffix}'
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    encryption: {
      services: {
        blob: {
          enabled: true
        }
        file: {
          enabled: true
        }
      }
      keySource: 'Microsoft.Storage'
    }
    allowBlobPublicAccess: false
  }
}

// Log Analytics Workspace
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: logAnalyticsName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// Application Insights
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

// Container Apps Environment
resource containerAppEnv 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: containerAppEnvName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// User-assigned Managed Identity for Container App
resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: 'superops-mcp-identity'
  location: location
}

// Grant managed identity access to Key Vault
resource keyVaultRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: keyVault
  name: guid(keyVault.id, managedIdentity.id, 'Key Vault Secrets User')
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6') // Key Vault Secrets User
    principalId: managedIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

// Grant managed identity access to ACR
resource acrRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: acr
  name: guid(acr.id, managedIdentity.id, 'AcrPull')
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d') // AcrPull
    principalId: managedIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

// Container App
resource containerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: containerAppName
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${managedIdentity.id}': {}
    }
  }
  properties: {
    managedEnvironmentId: containerAppEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3000
        transport: 'http'
        allowInsecure: false
      }
      registries: [
        {
          server: acr.properties.loginServer
          identity: managedIdentity.id
        }
      ]
      secrets: [
        {
          name: 'superops-api-key'
          keyVaultUrl: apiKeySecret.properties.secretUri
          identity: managedIdentity.id
        }
        {
          name: 'superops-subdomain'
          keyVaultUrl: subdomainSecret.properties.secretUri
          identity: managedIdentity.id
        }
        {
          name: 'entra-client-secret'
          keyVaultUrl: entraClientSecretKv.properties.secretUri
          identity: managedIdentity.id
        }
        {
          name: 'appinsights-connection-string'
          value: appInsights.properties.ConnectionString
        }
        {
          name: 'storage-connection-string'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=core.windows.net'
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'superops-mcp'
          image: 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest' // Placeholder - workflow updates with real image
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            {
              name: 'SUPEROPS_API_KEY'
              secretRef: 'superops-api-key'
            }
            {
              name: 'SUPEROPS_SUBDOMAIN'
              secretRef: 'superops-subdomain'
            }
            {
              name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
              secretRef: 'appinsights-connection-string'
            }
            {
              name: 'ENTRA_TENANT_ID'
              value: entraTenantId
            }
            {
              name: 'ENTRA_CLIENT_ID'
              value: entraClientId
            }
            {
              name: 'ENTRA_CLIENT_SECRET'
              secretRef: 'entra-client-secret'
            }
            {
              name: 'MCP_SERVER_BASE_URL'
              value: mcpServerBaseUrl
            }
            {
              name: 'AZURE_STORAGE_CONNECTION_STRING'
              secretRef: 'storage-connection-string'
            }
            {
              name: 'NODE_ENV'
              value: 'production'
            }
          ]
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 5
        rules: [
          {
            name: 'http-scaling'
            http: {
              metadata: {
                concurrentRequests: '10'
              }
            }
          }
        ]
      }
    }
  }
  dependsOn: [
    keyVaultRoleAssignment
    acrRoleAssignment
  ]
}

// Outputs
output containerRegistryName string = acr.name
output containerRegistryLoginServer string = acr.properties.loginServer
output keyVaultName string = keyVault.name
output containerAppUrl string = containerApp.properties.configuration.ingress.fqdn
output managedIdentityId string = managedIdentity.id
output appInsightsConnectionString string = appInsights.properties.ConnectionString
