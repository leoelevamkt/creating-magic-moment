import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

const jsonHeaders = { 'Content-Type': 'application/json' }

const SubmitBody = z.object({
  responses: z.record(z.string(), z.any()),
})

export const Route = createFileRoute('/api/public/forms/$token')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
        const { data, error } = await (supabaseAdmin as any)
          .from('patient_forms')
          .select('id, title, description, fields, status, expires_at')
          .eq('token', params.token)
          .maybeSingle()
        if (error) return new Response(error.message, { status: 500 })
        if (!data) return new Response('Formulário não encontrado.', { status: 404 })
        if (data.status !== 'pending')
          return new Response(JSON.stringify({ status: data.status }), {
            status: 410,
            headers: jsonHeaders,
          })
        if (data.expires_at && new Date(data.expires_at).getTime() < Date.now())
          return new Response('Formulário expirado.', { status: 410 })
        return new Response(
          JSON.stringify({
            title: data.title,
            description: data.description,
            fields: data.fields,
          }),
          { headers: jsonHeaders },
        )
      },
      POST: async ({ params, request }) => {
        let body: unknown
        try {
          body = await request.json()
        } catch {
          return new Response('JSON inválido.', { status: 400 })
        }
        const parsed = SubmitBody.safeParse(body)
        if (!parsed.success)
          return new Response('Respostas inválidas.', { status: 400 })

        const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
        const { data: form, error: e1 } = await (supabaseAdmin as any)
          .from('patient_forms')
          .select('id, status, expires_at')
          .eq('token', params.token)
          .maybeSingle()
        if (e1) return new Response(e1.message, { status: 500 })
        if (!form) return new Response('Formulário não encontrado.', { status: 404 })
        if (form.status !== 'pending')
          return new Response('Este formulário já foi respondido.', { status: 410 })
        if (form.expires_at && new Date(form.expires_at).getTime() < Date.now())
          return new Response('Formulário expirado.', { status: 410 })

        const { error: e2 } = await (supabaseAdmin as any)
          .from('patient_forms')
          .update({
            responses: parsed.data.responses,
            status: 'submitted',
            submitted_at: new Date().toISOString(),
          })
          .eq('id', form.id)
        if (e2) return new Response(e2.message, { status: 500 })

        return new Response(JSON.stringify({ ok: true }), { headers: jsonHeaders })
      },
    },
  },
})
