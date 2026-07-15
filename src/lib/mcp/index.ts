import { auth, defineMcp } from '@lovable.dev/mcp-js'
import listPatients from './tools/list-patients'
import getPatient from './tools/get-patient'
import listMyTasks from './tools/list-my-tasks'
import listUpcomingSessions from './tools/list-upcoming-sessions'
import createPatientNote from './tools/create-patient-note'

// The OAuth issuer must be the direct Supabase host (never the .lovable.cloud
// proxy). Vite inlines VITE_SUPABASE_PROJECT_ID as a literal at build time.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? 'project-ref-unset'

export default defineMcp({
  name: 'neuroflux-mcp',
  title: 'NeuroFlux',
  version: '0.1.0',
  instructions:
    'Ferramentas do NeuroFlux (gestão clínica em neuropsicologia). Cada chamada roda como o usuário autenticado e respeita as políticas de acesso (RLS). Use list_patients/get_patient para consultar pacientes, list_my_tasks para tarefas do kanban, list_upcoming_sessions para agenda, e create_patient_note para registrar notas clínicas.',
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: 'authenticated',
  }),
  tools: [listPatients, getPatient, listMyTasks, listUpcomingSessions, createPatientNote],
})
