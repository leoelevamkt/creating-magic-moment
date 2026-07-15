import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import {
  authorizeAppUserOAuth,
  callAsAppUser,
  disconnectAppUser,
} from '@/integrations/lovable/appUserConnector'

const GATEWAY_BASE_URL = 'https://connector-gateway.lovable.dev'
const CONNECTOR_ID = 'google_calendar'
const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/calendar.events',
]

export const startGoogleConnect = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((targetOrigin: string) => targetOrigin)
  .handler(async ({ data: targetOrigin, context }) => {
    const clientKey = process.env.GOOGLE_CALENDAR_APP_USER_CONNECTOR_CLIENT_API_KEY
    if (!clientKey) throw new Error('Google Calendar connector client key não configurada.')
    const { authorizationUrl } = await authorizeAppUserOAuth({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectorId: CONNECTOR_ID,
      appUserId: context.userId,
      clientAPIKey: clientKey,
      returnUrl: targetOrigin,
      responseMode: 'web_message',
      webMessageTargetOrigin: targetOrigin,
      credentialsConfiguration: { scopes: SCOPES },
    })
    return { authorizationUrl }
  })

export const saveGoogleConnection = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { connectionAPIKey: string }) => i)
  .handler(async ({ data, context }) => {
    // Look up account email via Google userinfo.
    let email: string | null = null
    try {
      const res = await callAsAppUser({
        gatewayBaseUrl: GATEWAY_BASE_URL,
        connectorId: CONNECTOR_ID,
        connectionAPIKey: data.connectionAPIKey,
        path: '/oauth2/v2/userinfo',
      })
      if (res.ok) {
        const j = (await res.json()) as { email?: string }
        email = j.email ?? null
      }
    } catch { /* non-fatal */ }
    const { saveConnectionKeyForUser } = await import('@/server/appUserConnections.server')
    await saveConnectionKeyForUser(context.userId, CONNECTOR_ID, data.connectionAPIKey, email)
    return { ok: true, email }
  })

export const getGoogleConnectionStatus = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getConnectionKeyForUser } = await import('@/server/appUserConnections.server')
    const row = await getConnectionKeyForUser(context.userId, CONNECTOR_ID)
    return { connected: !!row, email: row?.email ?? null }
  })

export const disconnectGoogle = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getConnectionKeyForUser, deleteConnectionForUser } = await import(
      '@/server/appUserConnections.server'
    )
    const row = await getConnectionKeyForUser(context.userId, CONNECTOR_ID)
    if (row) {
      try {
        await disconnectAppUser({
          gatewayBaseUrl: GATEWAY_BASE_URL,
          connectorId: CONNECTOR_ID,
          connectionAPIKey: row.key,
        })
      } catch { /* ignore remote errors, still delete locally */ }
    }
    await deleteConnectionForUser(context.userId, CONNECTOR_ID)
    return { ok: true }
  })

const CreateEventSchema = z.object({
  sessionId: z.string().uuid(),
})

export const createMeetForSession = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => CreateEventSchema.parse(i))
  .handler(async ({ context, data }) => {
    const { getConnectionKeyForUser } = await import('@/server/appUserConnections.server')
    const row = await getConnectionKeyForUser(context.userId, CONNECTOR_ID)
    if (!row) throw new Error('Google Calendar não conectado. Conecte em Configurações.')

    const { data: s, error } = await context.supabase
      .from('sessions_plan')
      .select('id, title, session_date, start_time, end_time, objectives, patients(name)')
      .eq('id', data.sessionId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!s) throw new Error('Sessão não encontrada')

    const date = s.session_date
    const startTime = s.start_time ?? '09:00'
    const endTime = s.end_time ?? addHour(startTime)
    const patientName = (s.patients as { name: string } | null)?.name ?? ''
    const summary = patientName ? `${s.title} — ${patientName}` : s.title

    const body = {
      summary,
      description: s.objectives ?? undefined,
      start: { dateTime: `${date}T${startTime}:00`, timeZone: 'America/Sao_Paulo' },
      end: { dateTime: `${date}T${endTime}:00`, timeZone: 'America/Sao_Paulo' },
      conferenceData: {
        createRequest: {
          requestId: `neuroflux-${s.id}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    }
    const res = await callAsAppUser({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectorId: CONNECTOR_ID,
      connectionAPIKey: row.key,
      path: '/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
      init: {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      },
    })
    if (!res.ok) {
      throw new Error(`Google Calendar: ${res.status} ${await res.text()}`)
    }
    const ev = (await res.json()) as {
      id?: string
      hangoutLink?: string
      conferenceData?: { entryPoints?: Array<{ entryPointType?: string; uri?: string }> }
    }
    const meetUrl =
      ev.hangoutLink ??
      ev.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video')?.uri ??
      null

    const { error: upErr } = await context.supabase
      .from('sessions_plan')
      .update({ google_event_id: ev.id ?? null, meet_url: meetUrl, create_meet: true })
      .eq('id', data.sessionId)
    if (upErr) throw new Error(upErr.message)
    return { ok: true, meetUrl }
  })

function addHour(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(2000, 0, 1, h, m)
  d.setHours(d.getHours() + 1)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
