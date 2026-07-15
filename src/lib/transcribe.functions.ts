import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

const Input = z.object({
  // base64-encoded audio blob (no data: prefix), max ~15MB
  audioBase64: z.string().min(10),
  mimeType: z.string().default('audio/webm'),
  language: z.string().default('pt'),
})

/**
 * Transcreve áudio via Lovable AI Gateway.
 * O front envia o blob gravado (MediaRecorder) em base64.
 */
export const transcribeAudio = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY
    if (!key) throw new Error('LOVABLE_API_KEY ausente.')

    const bin = Buffer.from(data.audioBase64, 'base64')
    if (bin.byteLength > 20 * 1024 * 1024) {
      throw new Error('Áudio muito grande (máx. 20 MB). Grave trechos menores.')
    }
    const ext = data.mimeType.includes('mp4') ? 'mp4'
      : data.mimeType.includes('mpeg') ? 'mp3'
      : data.mimeType.includes('wav') ? 'wav'
      : 'webm'

    const form = new FormData()
    form.append('file', new Blob([bin], { type: data.mimeType }), `audio.${ext}`)
    form.append('model', 'gpt-4o-mini-transcribe')
    form.append('language', data.language)
    form.append('response_format', 'json')

    const res = await fetch('https://ai.gateway.lovable.dev/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Lovable-API-Key': key },
      body: form,
    })
    if (res.status === 429) throw new Error('Limite de uso da IA. Tente novamente em instantes.')
    if (res.status === 402) throw new Error('Créditos de IA esgotados.')
    if (!res.ok) {
      const t = await res.text()
      throw new Error(`Falha na transcrição (${res.status}): ${t.slice(0, 200)}`)
    }
    const json = (await res.json()) as { text?: string }
    const text = json.text?.trim() ?? ''
    if (!text) throw new Error('Não foi possível transcrever o áudio.')
    return { text }
  })

const SessionInput = z.object({ sessionId: z.string().uuid(), transcript: z.string() })
export const saveSessionTranscript = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => SessionInput.parse(i))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from('sessions_plan')
      .update({ transcript: data.transcript })
      .eq('id', data.sessionId)
    if (error) throw new Error(error.message)
    return { ok: true }
  })
