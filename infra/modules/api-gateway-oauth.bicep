// API Management Gateway — pass-through proxy for MCP + OAuth endpoints
@description('Location for all resources')
param location string

@description('Environment name')
param environment string

@description('Backend MCP server URL')
param backendUrl string

// Variables
var uniqueSuffix = uniqueString(resourceGroup().id)
var apimName = 'superops-apim-${environment}-${uniqueSuffix}'
var publisherEmail = 'admin@example.com' // Change this
var publisherName = 'SuperOps MCP Admin'

// API Management Service
resource apiManagement 'Microsoft.ApiManagement/service@2023-03-01-preview' = {
  name: apimName
  location: location
  sku: {
    name: 'Consumption'
    capacity: 0
  }
  properties: {
    publisherEmail: publisherEmail
    publisherName: publisherName
  }
  identity: {
    type: 'SystemAssigned'
  }
}

// Backend (MCP Server)
resource backend 'Microsoft.ApiManagement/service/backends@2023-03-01-preview' = {
  parent: apiManagement
  name: 'superops-mcp-backend'
  properties: {
    url: 'https://${backendUrl}'
    protocol: 'http'
    description: 'SuperOps MCP Server Backend'
  }
}

// API — root path so all routes pass through to the backend
resource api 'Microsoft.ApiManagement/service/apis@2023-03-01-preview' = {
  parent: apiManagement
  name: 'superops-mcp-api'
  properties: {
    displayName: 'SuperOps MCP API'
    apiRevision: '1'
    description: 'Pass-through proxy for SuperOps MCP Server (OAuth + MCP endpoints)'
    subscriptionRequired: false
    path: ''
    protocols: [
      'https'
    ]
    serviceUrl: 'https://${backendUrl}'
    isCurrent: true
  }
}

// Catch-all GET — handles /.well-known/*, /authorize, /callback, GET /mcp (SSE), /health
resource getAllOperation 'Microsoft.ApiManagement/service/apis/operations@2023-03-01-preview' = {
  parent: api
  name: 'get-catch-all'
  properties: {
    displayName: 'GET catch-all'
    method: 'GET'
    urlTemplate: '/*'
  }
}

// Catch-all POST — handles POST /mcp, /token, /register
resource postAllOperation 'Microsoft.ApiManagement/service/apis/operations@2023-03-01-preview' = {
  parent: api
  name: 'post-catch-all'
  properties: {
    displayName: 'POST catch-all'
    method: 'POST'
    urlTemplate: '/*'
  }
}

// Catch-all DELETE — handles DELETE /mcp (session termination)
resource deleteAllOperation 'Microsoft.ApiManagement/service/apis/operations@2023-03-01-preview' = {
  parent: api
  name: 'delete-catch-all'
  properties: {
    displayName: 'DELETE catch-all'
    method: 'DELETE'
    urlTemplate: '/*'
  }
}

// Catch-all OPTIONS — CORS pre-flight
resource optionsAllOperation 'Microsoft.ApiManagement/service/apis/operations@2023-03-01-preview' = {
  parent: api
  name: 'options-catch-all'
  properties: {
    displayName: 'OPTIONS catch-all'
    method: 'OPTIONS'
    urlTemplate: '/*'
  }
}

// API-level policy — forward all requests to backend, pass headers through
resource apiPolicy 'Microsoft.ApiManagement/service/apis/policies@2023-03-01-preview' = {
  parent: api
  name: 'policy'
  properties: {
    value: '''
<policies>
  <inbound>
    <base />
    <set-backend-service backend-id="superops-mcp-backend" />
    <set-header name="X-Forwarded-Host" exists-action="override">
      <value>@(context.Request.OriginalUrl.Host)</value>
    </set-header>
  </inbound>
  <backend>
    <base />
  </backend>
  <outbound>
    <base />
  </outbound>
  <on-error>
    <base />
  </on-error>
</policies>
'''
    format: 'xml'
  }
  dependsOn: [
    backend
  ]
}

// Product (API grouping)
resource product 'Microsoft.ApiManagement/service/products@2023-03-01-preview' = {
  parent: apiManagement
  name: 'superops-mcp-product'
  properties: {
    displayName: 'SuperOps MCP Product'
    description: 'Access to SuperOps MCP Server via OAuth'
    subscriptionRequired: false
    state: 'published'
  }
}

// Link API to Product
resource productApi 'Microsoft.ApiManagement/service/products/apis@2023-03-01-preview' = {
  parent: product
  name: api.name
}

// Outputs
output apiManagementName string = apiManagement.name
output gatewayUrl string = apiManagement.properties.gatewayUrl
output mcpUrl string = '${apiManagement.properties.gatewayUrl}/mcp'
output oauthMetadataUrl string = '${apiManagement.properties.gatewayUrl}/.well-known/oauth-authorization-server'
