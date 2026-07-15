// Server-only. Do NOT import from browser bundles.
function requireApiKey(): string {
  const key = process.env.LOVABLE_API_KEY
  if (!key) throw new Error('LOVABLE_API_KEY is not set')
  return key
}

export interface AppUserOAuthAuthorizeParams {
  gatewayBaseUrl: string
  connectorId: string
  appUserId: string
  clientAPIKey: string
  returnUrl: string
  credentialsConfiguration?: Record<string, unknown>
  responseMode?: 'redirect' | 'web_message'
  webMessageTargetOrigin?: string
}

export async function authorizeAppUserOAuth(
  params: AppUserOAuthAuthorizeParams,
): Promise<{ authorizationUrl: string; sessionId: string }> {
  const res = await fetch(`${params.gatewayBaseUrl}/api/v1/app-users/oauth2/authorize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${requireApiKey()}`,
      'Content-Type': 'application/json',
      'X-Client-Api-Key': params.clientAPIKey,
    },
    body: JSON.stringify({
      connector_id: params.connectorId,
      app_user_id: params.appUserId,
      return_url: params.returnUrl,
      credentials_configuration: params.credentialsConfiguration,
      response_mode: params.responseMode,
      web_message_target_origin: params.webMessageTargetOrigin,
    }),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`OAuth start failed (${res.status}): ${text}`)
  const body = JSON.parse(text) as { authorization_url?: string; session_id?: string }
  if (!body.authorization_url) throw new Error('Missing authorization_url')
  return { authorizationUrl: body.authorization_url, sessionId: body.session_id ?? '' }
}

export async function callAsAppUser(params: {
  gatewayBaseUrl: string
  connectionAPIKey: string
  connectorId: string
  path: string
  init?: RequestInit
}): Promise<Response> {
  const p = params.path.startsWith('/') ? params.path : `/${params.path}`
  const headers = new Headers(params.init?.headers)
  headers.set('Authorization', `Bearer ${requireApiKey()}`)
  headers.set('X-Connection-Api-Key', params.connectionAPIKey)
  return fetch(`${params.gatewayBaseUrl}/${params.connectorId}${p}`, { ...params.init, headers })
}

export async function disconnectAppUser(params: {
  gatewayBaseUrl: string
  connectionAPIKey: string
  connectorId: string
}): Promise<void> {
  const headers = new Headers()
  headers.set('Authorization', `Bearer ${requireApiKey()}`)
  headers.set('X-Connection-Api-Key', params.connectionAPIKey)
  headers.set('Content-Type', 'application/json')
  const res = await fetch(`${params.gatewayBaseUrl}/api/v1/app-users/connection`, {
    method: 'DELETE',
    headers,
    body: JSON.stringify({ connector_id: params.connectorId }),
  })
  if (!res.ok) throw new Error(`Disconnect failed (${res.status}): ${await res.text()}`)
}
