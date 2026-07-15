import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

const BUCKET = 'patient-documents'

const CATEGORY = z.enum(['exame', 'laudo_externo', 'receita', 'outro'])

export const listPatientDocuments = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { patientId: string }) => z.object({ patientId: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from('patient_documents')
      .select('id, name, description, category, mime_type, size_bytes, storage_path, uploaded_by, created_at')
      .eq('patient_id', data.patientId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return rows ?? []
  })

export const createPatientDocument = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      patientId: z.string().uuid(),
      name: z.string().min(1).max(240),
      description: z.string().max(2000).optional().nullable(),
      category: CATEGORY.optional().default('outro'),
      mimeType: z.string().max(200).optional().nullable(),
      sizeBytes: z.number().int().nonnegative().optional().nullable(),
      storagePath: z.string().min(3).max(400),
    }).parse(i),
  )
  .handler(async ({ context, data }) => {
    const { error, data: row } = await context.supabase
      .from('patient_documents')
      .insert({
        patient_id: data.patientId,
        name: data.name,
        description: data.description ?? null,
        category: data.category ?? 'outro',
        mime_type: data.mimeType ?? null,
        size_bytes: data.sizeBytes ?? null,
        storage_path: data.storagePath,
        uploaded_by: context.userId,
      })
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    return { id: row!.id }
  })

export const deletePatientDocument = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from('patient_documents')
      .select('storage_path')
      .eq('id', data.id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!row) throw new Error('Documento não encontrado.')
    const { error: delErr } = await context.supabase.from('patient_documents').delete().eq('id', data.id)
    if (delErr) throw new Error(delErr.message)
    await context.supabase.storage.from(BUCKET).remove([row.storage_path])
    return { ok: true }
  })

export const getPatientDocumentUrl = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string; inline?: boolean }) =>
    z.object({ id: z.string().uuid(), inline: z.boolean().optional() }).parse(i),
  )
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from('patient_documents')
      .select('storage_path, name')
      .eq('id', data.id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!row) throw new Error('Documento não encontrado.')
    const { data: signed, error: signErr } = await context.supabase.storage
      .from(BUCKET)
      .createSignedUrl(row.storage_path, 60 * 10, data.inline ? {} : { download: row.name })
    if (signErr || !signed) throw new Error(signErr?.message ?? 'Falha ao gerar URL.')
    return { url: signed.signedUrl, name: row.name }
  })
