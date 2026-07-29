import { useMemo } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'

/**
 * Anamnese Neuropsicológica — Adultos.
 * Todos os campos são armazenados em `structured_data.adult_neuro`.
 */
export type AdultNeuroData = Record<string, unknown>

type Props = {
  value: AdultNeuroData
  onChange: (patch: AdultNeuroData) => void
}

// ---------- Domínios cognitivos ----------
const COG_DOMAINS = [
  'Atenção e concentração',
  'Memória de curto prazo',
  'Memória de longo prazo',
  'Memória de trabalho',
  'Velocidade de processamento',
  'Linguagem (encontrar palavras, nomear, compreensão)',
  'Leitura e escrita',
  'Cálculo e raciocínio matemático',
  'Funções executivas (planejamento, organização, decisão)',
  'Controle inibitório',
  'Flexibilidade cognitiva',
  'Orientação espacial',
  'Reconhecimento de faces ou objetos',
  'Habilidades visuoconstrutivas',
  'Cognição social',
  'Regulação emocional',
]

// ---------- Frequência: Atenção ----------
const ATENCAO_ITEMS = [
  'Perco o fio da meada no meio de conversas ou tarefas',
  'Me distraio com estímulos do ambiente',
  'Preciso reler parágrafos várias vezes',
  'Começo tarefas mas não consigo terminá-las',
  'Cometo erros por descuido em tarefas rotineiras',
  'Tenho dificuldade em acompanhar conversas simultâneas',
]

const MEMORIA_ITEMS = [
  'Esqueço onde coloquei objetos de uso cotidiano',
  'Esqueço compromissos, datas e recados recentes',
  'Repito histórias ou perguntas sem perceber',
  'Tenho dificuldade em lembrar nomes de pessoas conhecidas',
  'Esqueço o que ia fazer ao entrar em um cômodo',
  'Tenho lacunas em memórias de períodos específicos',
  'Tenho dificuldade em aprender informações novas',
]

const FE_ITEMS = [
  'Tenho dificuldade em planejar e organizar tarefas complexas',
  'Procrastino excessivamente ou tenho dificuldade em iniciar tarefas',
  'Ajo impulsivamente antes de pensar nas consequências',
  'Tenho dificuldade em mudar de plano quando algo muda',
  'Tenho dificuldade em tomar decisões mesmo simples',
  'Perco o controle emocional em situações de frustração',
  'Tenho dificuldade em gerir o tempo e cumprir prazos',
]

// ---------- Linguagem sim/não ----------
const LANG_SN = [
  'Tenho dificuldade em encontrar palavras durante a fala',
  'Falo ou escrevo palavras erradas sem perceber',
  'Tenho dificuldade em compreender textos longos ou complexos',
  'Leio com lentidão ou preciso reler para compreender',
  'Cometo erros ortográficos frequentes na escrita',
  'Tenho dificuldade em acompanhar piadas, ironias ou linguagem figurada',
  'Tenho dificuldade em acompanhar conversas em grupo ou ambientes barulhentos',
  'Minha fala é descrita como rápida demais, arrastada ou confusa',
  'Tenho dificuldade em organizar o discurso ao contar histórias',
  'Já realizei ou realizo acompanhamento fonoaudiológico',
]

// ---------- Desenvolvimento (sim/não) ----------
const DEV_SN = [
  'Fui prematuro(a) ou tive intercorrências no nascimento',
  'Tive atrasos no desenvolvimento motor',
  'Tive atrasos no desenvolvimento da fala ou linguagem',
  'Tive dificuldades na alfabetização',
  'Tive dificuldades com matemática desde criança',
  'Recebi diagnóstico de dificuldade de aprendizagem na infância',
  'Fui avaliado por psicólogo ou neuropediatra na infância',
  'Tomei ou tomo medicação para atenção, humor ou comportamento',
  'Repeti algum ano escolar',
  'Fui descrito como agitado, distraído ou difícil na escola',
]

// ---------- Saúde neuro/psiq ----------
const HEALTH = [
  'Epilepsia/convulsões',
  'Traumatismo cranioencefálico (TCE)',
  'AVC/acidente vascular cerebral',
  'Tumor cerebral/neurocirurgia',
  'Meningite/encefalite',
  'Hidrocefalia',
  'Doença de Parkinson/parkinsonismo',
  'Esclerose múltipla',
  'Doença de Alzheimer/demência',
  'Enxaqueca crônica/cefaleia',
  'Epilepsia do lobo temporal',
  'TDAH (diagnóstico formal)',
  'Transtorno do Espectro Autista (TEA)',
  'Transtorno Bipolar',
  'Esquizofrenia/psicose',
  'Transtorno Depressivo Maior',
  'Transtorno de Ansiedade Generalizada',
  'TEPT/trauma complexo',
  'TOC',
  'Transtorno de Personalidade',
  'Transtorno do sono',
  'Hipotireoidismo/hipertireoidismo',
  'Diabetes/síndrome metabólica',
  'HIV/condições imunológicas',
  'Doenças autoimunes',
]

// ---------- Substâncias ----------
const SUBSTANCIAS = [
  'Álcool — frequência e quantidade habitual',
  'Tabaco/nicotina',
  'Maconha/cannabis',
  'Cocaína/crack',
  'Estimulantes (anfetaminas, MDMA, metilfenidato sem receita)',
  'Benzodiazepínicos/sedativos sem prescrição ou além da dose',
  'Opioides/analgésicos sem prescrição',
  'Outras substâncias',
  'Já tive ou tenho diagnóstico de dependência química',
  'Já realizei tratamento para dependência química',
]

// ---------- Sintomas emocionais ----------
const SINTOMAS = [
  'Humor deprimido/tristeza persistente',
  'Anedonia (perda de prazer)',
  'Ansiedade/preocupação excessiva',
  'Ataques de pânico',
  'Irritabilidade/explosões de raiva',
  'Instabilidade intensa de humor',
  'Euforia/grandiosidade em períodos',
  'Impulsividade com consequências',
  'Comportamentos de risco repetidos',
  'Pensamentos obsessivos/ruminação',
  'Compulsões ou rituais',
  'Evitação de situações por medo',
  'Flashbacks/memórias intrusivas',
  'Hipervigilância/sobressalto excessivo',
  'Despersonalização',
  'Desrealização',
  'Paranoia/desconfiança intensa',
  'Isolamento social progressivo',
  'Dificuldade em controlar impulsos',
  'Automutilação',
  'Pensamentos sobre morte ou suicídio',
]

// ---------- Traços de personalidade ----------
const PERSONALIDADE = [
  { key: 'perfeccionismo', label: 'Sou perfeccionista e me cobro excessivamente', min: 'Nada', max: 'Muito' },
  { key: 'incerteza', label: 'Tenho dificuldade em tolerar incerteza e ambiguidade', min: 'Nada', max: 'Muito' },
  { key: 'conflitos', label: 'Evito conflitos e tenho dificuldade em dizer não', min: 'Nada', max: 'Muito' },
  { key: 'rigidez', label: 'Tenho padrões rígidos de pensamento', min: 'Nada', max: 'Muito' },
  { key: 'emocoes_intensas', label: 'Sinto que minhas emoções são mais intensas do que as da maioria', min: 'Nada', max: 'Muito' },
  { key: 'alexitimia', label: 'Tenho dificuldade em identificar o que estou sentindo', min: 'Nada', max: 'Muito' },
  { key: 'relacoes_instaveis', label: 'Minhas relações tendem a ser intensas e instáveis', min: 'Nada', max: 'Muito' },
  { key: 'introspeccao', label: 'Preciso de muito tempo sozinho(a) para recuperar energia', min: 'Nada', max: 'Muito' },
  { key: 'adaptacao', label: 'Me adapto com dificuldade a mudanças de rotina', min: 'Nada', max: 'Muito' },
  { key: 'sensorial', label: 'Tenho sensibilidade sensorial elevada', min: 'Nada', max: 'Muito' },
]

// ---------- Antecedentes familiares ----------
const FAMILIARES = [
  'TDAH/dificuldades de atenção',
  'Dislexia/dificuldades de leitura',
  'TEA/características autistas',
  'Deficiência intelectual',
  'Demência/Alzheimer de início precoce',
  'Epilepsia/convulsões',
  'Parkinson/doenças neurodegenerativas',
  'Transtorno Bipolar',
  'Esquizofrenia/psicose',
  'Depressão recorrente/ansiedade grave',
  'Dependência química/alcoolismo',
  'Síndromes genéticas',
  'AVC de repetição ou precoce',
  'Dificuldades escolares sem diagnóstico',
]

// ---------- Escalas autopercepção ----------
const ESCALAS = [
  { key: 'concentracao', label: 'Capacidade de concentração durante trabalho ou estudo', min: 'Muito prejudicada', max: 'Excelente' },
  { key: 'memoria_recentes', label: 'Qualidade da memória para eventos recentes', min: 'Muito prejudicada', max: 'Excelente' },
  { key: 'organizacao', label: 'Organização e capacidade de planejamento', min: 'Muito prejudicada', max: 'Excelente' },
  { key: 'velocidade', label: 'Velocidade com que processo informações novas', min: 'Muito lenta', max: 'Muito rápida' },
  { key: 'controle_emocional', label: 'Controle emocional no dia a dia', min: 'Nenhum', max: 'Total' },
  { key: 'sono', label: 'Qualidade do sono nas últimas 4 semanas', min: 'Péssima', max: 'Excelente' },
  { key: 'energia', label: 'Nível de energia e disposição geral', min: 'Nenhum', max: 'Muito alto' },
  { key: 'social', label: 'Funcionamento social', min: 'Muito prejudicado', max: 'Excelente' },
  { key: 'profissional', label: 'Funcionamento profissional/acadêmico', min: 'Muito prejudicado', max: 'Excelente' },
  { key: 'autocuidado', label: 'Capacidade de autocuidado e vida independente', min: 'Muito prejudicada', max: 'Plena' },
  { key: 'sofrimento', label: 'Nível de sofrimento causado pelas dificuldades cognitivas', min: 'Nenhum', max: 'Insuportável' },
  { key: 'motivacao', label: 'Motivação para realizar a avaliação e seguir recomendações', min: 'Nenhuma', max: 'Total' },
]

function get(obj: AdultNeuroData, path: string): unknown {
  return (obj as Record<string, unknown>)[path]
}

export function NeuroAdultAnamnese({ value, onChange }: Props) {
  const set = (k: string, v: unknown) => onChange({ ...value, [k]: v })

  const dominios = (value.dominios as Record<string, { queixa?: boolean; grau?: number; contexto?: string }>) ?? {}
  const setDom = (label: string, patch: Partial<{ queixa: boolean; grau: number; contexto: string }>) => {
    const cur = dominios[label] ?? {}
    set('dominios', { ...dominios, [label]: { ...cur, ...patch } })
  }

  const atencao = (value.atencao_freq as Record<string, number>) ?? {}
  const setAtencao = (k: string, v: number) => set('atencao_freq', { ...atencao, [k]: v })
  const memoria = (value.memoria_freq as Record<string, number>) ?? {}
  const setMemoria = (k: string, v: number) => set('memoria_freq', { ...memoria, [k]: v })
  const fe = (value.fe_freq as Record<string, number>) ?? {}
  const setFE = (k: string, v: number) => set('fe_freq', { ...fe, [k]: v })

  const langSN = (value.lang_sn as Record<string, 'sim' | 'nao' | ''>) ?? {}
  const setLangSN = (k: string, v: 'sim' | 'nao' | '') => set('lang_sn', { ...langSN, [k]: v })

  const devSN = (value.dev_sn as Record<string, 'sim' | 'nao' | ''>) ?? {}
  const setDevSN = (k: string, v: 'sim' | 'nao' | '') => set('dev_sn', { ...devSN, [k]: v })

  const healthChecks = (value.health as Record<string, boolean>) ?? {}
  const setHealth = (k: string, v: boolean) => set('health', { ...healthChecks, [k]: v })

  const substancias = (value.substancias as Record<string, 'sim' | 'nao' | ''>) ?? {}
  const setSubst = (k: string, v: 'sim' | 'nao' | '') => set('substancias', { ...substancias, [k]: v })

  const sintomas = (value.sintomas as Record<string, boolean>) ?? {}
  const setSint = (k: string, v: boolean) => set('sintomas', { ...sintomas, [k]: v })

  const personalidade = (value.personalidade as Record<string, number>) ?? {}
  const setPers = (k: string, v: number) => set('personalidade', { ...personalidade, [k]: v })

  const familiares = (value.familiares as Record<string, boolean>) ?? {}
  const setFam = (k: string, v: boolean) => set('familiares', { ...familiares, [k]: v })

  const escalas = (value.escalas as Record<string, number>) ?? {}
  const setEsc = (k: string, v: number) => set('escalas', { ...escalas, [k]: v })

  const linguas = useMemo(
    () => (value.linguas as Array<{ lingua: string; nivel: string }>) ?? [],
    [value.linguas],
  )
  const setLinguas = (arr: typeof linguas) => set('linguas', arr)

  return (
    <div className="grid gap-6">
      {/* 1. Identificação */}
      <Section title="1. Identificação">
        <Grid2>
          <Field label="Nome completo"><Input value={String(get(value, 'nome') ?? '')} onChange={(e) => set('nome', e.target.value)} /></Field>
          <Field label="Data de nascimento"><Input type="date" value={String(get(value, 'nascimento') ?? '')} onChange={(e) => set('nascimento', e.target.value)} /></Field>
          <Field label="Idade"><Input value={String(get(value, 'idade') ?? '')} onChange={(e) => set('idade', e.target.value)} /></Field>
          <Field label="Sexo/Gênero"><Input value={String(get(value, 'sexo') ?? '')} onChange={(e) => set('sexo', e.target.value)} /></Field>
          <Field label="Pronomes"><Input value={String(get(value, 'pronomes') ?? '')} onChange={(e) => set('pronomes', e.target.value)} /></Field>
          <Field label="Lateralidade">
            <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={String(get(value, 'lateralidade') ?? '')} onChange={(e) => set('lateralidade', e.target.value)}>
              <option value="">—</option><option>Destro</option><option>Canhoto</option><option>Ambidestro</option>
            </select>
          </Field>
          <Field label="Língua materna"><Input value={String(get(value, 'lingua_materna') ?? '')} onChange={(e) => set('lingua_materna', e.target.value)} /></Field>
          <Field label="Escolaridade (anos de estudo formal)"><Input value={String(get(value, 'escolaridade') ?? '')} onChange={(e) => set('escolaridade', e.target.value)} /></Field>
          <Field label="Profissão/Ocupação atual"><Input value={String(get(value, 'profissao') ?? '')} onChange={(e) => set('profissao', e.target.value)} /></Field>
          <Field label="Estado civil"><Input value={String(get(value, 'estado_civil') ?? '')} onChange={(e) => set('estado_civil', e.target.value)} /></Field>
          <Field label="Número de filhos"><Input value={String(get(value, 'filhos') ?? '')} onChange={(e) => set('filhos', e.target.value)} /></Field>
          <Field label="Cidade/Estado"><Input value={String(get(value, 'cidade_uf') ?? '')} onChange={(e) => set('cidade_uf', e.target.value)} /></Field>
          <Field label="Encaminhado por"><Input value={String(get(value, 'encaminhado_por') ?? '')} onChange={(e) => set('encaminhado_por', e.target.value)} /></Field>
          <Field label="Data da entrevista"><Input type="date" value={String(get(value, 'data_entrevista') ?? '')} onChange={(e) => set('data_entrevista', e.target.value)} /></Field>
          <Field label="É bilíngue?">
            <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={String(get(value, 'bilingue') ?? '')} onChange={(e) => set('bilingue', e.target.value)}>
              <option value="">—</option><option>Sim</option><option>Não</option>
            </select>
          </Field>
          <Field label="Finalidade da avaliação">
            <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={String(get(value, 'finalidade') ?? '')} onChange={(e) => set('finalidade', e.target.value)}>
              <option value="">—</option><option>Clínica</option><option>Ocupacional</option><option>Forense</option><option>Acadêmica</option>
            </select>
          </Field>
        </Grid2>
        <div className="rounded-md border p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">Línguas e nível de fluência</p>
            <button
              type="button"
              onClick={() => setLinguas([...linguas, { lingua: '', nivel: '' }])}
              className="rounded-md border px-2 py-1 text-xs hover:bg-accent"
            >+ Adicionar</button>
          </div>
          <div className="grid gap-2">
            {linguas.map((l, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Input placeholder="Língua" value={l.lingua} onChange={(e) => { const a = [...linguas]; a[i] = { ...a[i], lingua: e.target.value }; setLinguas(a) }} />
                <Input placeholder="Nível (básico/intermediário/fluente/nativo)" value={l.nivel} onChange={(e) => { const a = [...linguas]; a[i] = { ...a[i], nivel: e.target.value }; setLinguas(a) }} />
                <button type="button" className="rounded-md border px-2 text-xs hover:bg-destructive/10" onClick={() => setLinguas(linguas.filter((_, j) => j !== i))}>Remover</button>
              </div>
            ))}
            {linguas.length === 0 ? <p className="text-xs text-muted-foreground">Nenhuma língua adicionada.</p> : null}
          </div>
        </div>
      </Section>

      {/* 2. Queixa principal */}
      <Section title="2. Queixa Principal">
        <LongField label="Em suas próprias palavras, qual é a principal dificuldade que o(a) trouxe até esta avaliação?" k="qp_principal" value={value} onChange={onChange} />
        <LongField label="Há quanto tempo percebe essas dificuldades?" k="qp_tempo" value={value} onChange={onChange} />
        <LongField label="As dificuldades surgiram após algum evento específico?" k="qp_evento" value={value} onChange={onChange} />
        <LongField label="As dificuldades pioraram, melhoraram ou se mantiveram estáveis?" k="qp_evolucao" value={value} onChange={onChange} />
        <LongField label="Em quais situações do dia a dia são mais evidentes?" k="qp_contextos" value={value} onChange={onChange} />
        <LongField label="Alguém próximo também notou ou comentou essas dificuldades?" k="qp_terceiros" value={value} onChange={onChange} />
      </Section>

      {/* 3. Domínios cognitivos */}
      <Section title="3. Queixas por Domínio Cognitivo" hint="Marque se há queixa, estime o grau (1=leve, 5=severo) e descreva quando/como ocorre.">
        <div className="grid gap-3">
          {COG_DOMAINS.map((d) => {
            const row = dominios[d] ?? {}
            return (
              <div key={d} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Checkbox checked={!!row.queixa} onCheckedChange={(c) => setDom(d, { queixa: !!c })} />
                    {d}
                  </label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setDom(d, { grau: n })}
                        className={`h-8 w-8 rounded border text-sm ${row.grau === n ? 'bg-primary text-primary-foreground' : 'bg-background'}`}
                      >{n}</button>
                    ))}
                  </div>
                </div>
                <Input placeholder="Contexto / observações" className="mt-2" value={row.contexto ?? ''} onChange={(e) => setDom(d, { contexto: e.target.value })} />
              </div>
            )
          })}
        </div>
        <LongField label="Descreva com mais detalhes os domínios assinalados — exemplos concretos do cotidiano" k="dominios_obs" value={value} onChange={onChange} />
      </Section>

      {/* 4. Atenção / Memória / FE */}
      <Section title="4. Detalhamento: Atenção, Memória e Funções Executivas" hint="Avalie a frequência (1=Raramente, 5=Sempre).">
        <FreqBlock title="Atenção e Concentração" items={ATENCAO_ITEMS} data={atencao} onChange={setAtencao} minLabel="Raramente" maxLabel="Sempre" />
        <FreqBlock title="Memória" items={MEMORIA_ITEMS} data={memoria} onChange={setMemoria} minLabel="Raramente" maxLabel="Sempre" />
        <FreqBlock title="Funções Executivas" items={FE_ITEMS} data={fe} onChange={setFE} minLabel="Raramente" maxLabel="Sempre" />
        <LongField label="As dificuldades estão presentes desde a infância ou surgiram na vida adulta?" k="fe_inicio" value={value} onChange={onChange} />
        <LongField label="Essas dificuldades pioram em situações de estresse, privação de sono ou uso de substâncias?" k="fe_piora" value={value} onChange={onChange} />
        <LongField label="Você usa estratégias para compensar? Com que eficácia?" k="fe_estrategias" value={value} onChange={onChange} />
      </Section>

      {/* 5. Linguagem */}
      <Section title="5. Linguagem, Comunicação e Leitura/Escrita">
        <SimNaoBlock items={LANG_SN} data={langSN} onChange={setLangSN} />
        <LongField label="Descreva os itens assinalados com exemplos concretos" k="lang_desc" value={value} onChange={onChange} />
      </Section>

      {/* 6. Desenvolvimento */}
      <Section title="6. História do Desenvolvimento">
        <p className="text-sm font-medium">Infância e Desenvolvimento Precoce</p>
        <SimNaoBlock items={DEV_SN} data={devSN} onChange={setDevSN} />
        <LongField label="Como foi sua experiência escolar de modo geral?" k="dev_escolar" value={value} onChange={onChange} />
        <LongField label="Qual é sua escolaridade completa?" k="dev_escolaridade_completa" value={value} onChange={onChange} />
        <LongField label="Na infância/adolescência, você se sentia diferente dos colegas?" k="dev_diferenca" value={value} onChange={onChange} />
        <LongField label="Você tinha muitos amigos? Era fácil se relacionar?" k="dev_amigos" value={value} onChange={onChange} />
        <LongField label="Praticou esportes ou atividades motoras? Tinha facilidade ou dificuldade?" k="dev_esportes" value={value} onChange={onChange} />
        <p className="mt-3 text-sm font-medium">Vida Adulta</p>
        <LongField label="Como avalia seu desempenho profissional ao longo da vida?" k="ad_profissional" value={value} onChange={onChange} />
        <LongField label="Você consegue gerir sozinho finanças, documentos e rotinas?" k="ad_gestao" value={value} onChange={onChange} />
        <LongField label="Você dirige veículo? Já se envolveu em acidentes ou infrações frequentes?" k="ad_direcao" value={value} onChange={onChange} />
        <LongField label="Houve períodos específicos de maior dificuldade cognitiva?" k="ad_periodos" value={value} onChange={onChange} />
      </Section>

      {/* 7. Saúde neuro/psiq */}
      <Section title="7. Saúde Física, Neurológica e Psiquiátrica">
        <ChecklistGrid items={HEALTH} data={healthChecks} onChange={setHealth} />
        <LongField label="Descreva os diagnósticos assinalados (quando, por quem, tratamento em curso)" k="diag_desc" value={value} onChange={onChange} />
        <LongField label="Você usa ou já usou medicamentos psicotrópicos ou antiepilépticos? Quais, doses e por quanto tempo?" k="meds_desc" value={value} onChange={onChange} />
        <LongField label="Já realizou avaliação neuropsicológica, neurológica ou psiquiátrica antes?" k="aval_previas" value={value} onChange={onChange} />
        <LongField label="Já foi submetido a exames de neuroimagem (RM, TC, PET) ou EEG? Quais foram os achados?" k="neuroimagem" value={value} onChange={onChange} />
        <LongField label="Realizou ou realiza psicoterapia, reabilitação cognitiva ou outros tratamentos?" k="tratamentos" value={value} onChange={onChange} />
      </Section>

      {/* 8. Sono / saúde geral */}
      <Section title="8. Sono, Fadiga e Saúde Geral">
        <LongField label="Como é a qualidade do seu sono? Quantas horas dorme por noite?" k="sono_qualidade" value={value} onChange={onChange} />
        <LongField label="Dificuldades para adormecer, despertares, pesadelos ou sonambulismo?" k="sono_dif" value={value} onChange={onChange} />
        <LongField label="Você ronca intensamente ou para de respirar durante o sono?" k="sono_apneia" value={value} onChange={onChange} />
        <LongField label="Você sente fadiga intensa ou falta de energia que interfere no seu funcionamento?" k="fadiga" value={value} onChange={onChange} />
        <LongField label="Dores de cabeça frequentes, tonturas ou sensação de cabeça pesada?" k="cefaleia" value={value} onChange={onChange} />
        <LongField label="Como é sua alimentação e hidratação no dia a dia?" k="alimentacao" value={value} onChange={onChange} />
        <LongField label="Pratica atividade física regularmente? Qual tipo e frequência?" k="atividade_fisica" value={value} onChange={onChange} />
      </Section>

      {/* 9. Substâncias */}
      <Section title="9. Uso de Substâncias Psicoativas">
        <SimNaoBlock items={SUBSTANCIAS} data={substancias} onChange={setSubst} />
        <LongField label="Você percebe relação entre o uso de substâncias e as dificuldades cognitivas ou emocionais?" k="subst_relacao" value={value} onChange={onChange} />
      </Section>

      {/* 10. Sintomas / personalidade */}
      <Section title="10. Sintomas Emocionais, Comportamentais e Personalidade" hint="Sintomas nos últimos 6 meses.">
        <ChecklistGrid items={SINTOMAS} data={sintomas} onChange={setSint} />
        <div className="mt-3">
          <p className="mb-2 text-sm font-medium">Traços de Personalidade</p>
          <div className="grid gap-2">
            {PERSONALIDADE.map((p) => (
              <div key={p.key} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
                <span className="text-sm">{p.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{p.min}</span>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPers(p.key, n)}
                      className={`h-8 w-8 rounded border text-sm ${personalidade[p.key] === n ? 'bg-primary text-primary-foreground' : 'bg-background'}`}
                    >{n}</button>
                  ))}
                  <span className="text-xs text-muted-foreground">{p.max}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <LongField label="Como você se descreveria como pessoa?" k="pers_descricao" value={value} onChange={onChange} />
        <LongField label="Já recebeu feedback de que tem algum padrão que causa problemas?" k="pers_feedback" value={value} onChange={onChange} />
      </Section>

      {/* 11. Contexto social e afetivo */}
      <Section title="11. Contexto Social, Afetivo e Vida Sexual">
        <LongField label="Como é sua vida social atualmente? Tem amigos próximos?" k="soc_amigos" value={value} onChange={onChange} />
        <LongField label="Já teve dificuldades para fazer amizades ou entender regras sociais?" k="soc_dificuldades" value={value} onChange={onChange} />
        <LongField label="Como é sua vida amorosa atualmente?" k="soc_amor" value={value} onChange={onChange} />
        <LongField label="Você percebe padrões repetitivos nos seus relacionamentos afetivos?" k="soc_padroes" value={value} onChange={onChange} />
        <LongField label="Já viveu situações de violência doméstica, assédio ou abuso?" k="soc_violencia" value={value} onChange={onChange} />
        <LongField label="Como avalia sua capacidade de comunicar necessidades e estabelecer limites?" k="soc_limites" value={value} onChange={onChange} />
      </Section>

      {/* 12. Trabalho e finanças */}
      <Section title="12. Trabalho, Funcionamento Ocupacional e Finanças">
        <LongField label="Descreva sua trajetória profissional. Houve trocas frequentes ou dificuldades?" k="trab_trajetoria" value={value} onChange={onChange} />
        <LongField label="Principais dificuldades no trabalho atual relacionadas às queixas cognitivas" k="trab_dificuldades" value={value} onChange={onChange} />
        <LongField label="Já tirou licença médica ou afastamento por razões de saúde mental ou neurológica?" k="trab_licenca" value={value} onChange={onChange} />
        <LongField label="Consegue gerir sua rotina, finanças e obrigações de forma independente?" k="trab_independencia" value={value} onChange={onChange} />
        <LongField label="Há questões legais, trabalhistas ou previdenciárias que motivam esta avaliação?" k="trab_legal" value={value} onChange={onChange} />
      </Section>

      {/* 13. Família de origem */}
      <Section title="13. Família de Origem e Antecedentes Neuropsicológicos">
        <ChecklistGrid items={FAMILIARES} data={familiares} onChange={setFam} />
        <LongField label="Descreva os antecedentes assinalados (grau de parentesco e informações relevantes)" k="fam_desc" value={value} onChange={onChange} />
        <LongField label="Como foi o ambiente familiar em que cresceu?" k="fam_ambiente" value={value} onChange={onChange} />
        <LongField label="Houve traumas, perdas precoces, violência ou negligência na infância?" k="fam_traumas" value={value} onChange={onChange} />
        <LongField label="Qual é o nível de escolaridade dos seus pais/cuidadores?" k="fam_escolaridade" value={value} onChange={onChange} />
      </Section>

      {/* 14. Identidade */}
      <Section title="14. Identidade, Sentido de Vida e Autopercepção Cognitiva">
        <LongField label="Como você descreveria seu funcionamento cognitivo ANTES das dificuldades atuais?" k="id_pre" value={value} onChange={onChange} />
        <LongField label="Você sente que seu desempenho intelectual está abaixo do seu potencial?" k="id_potencial" value={value} onChange={onChange} />
        <LongField label="Aspectos da sua identidade que têm gerado conflito, discriminação ou impacto emocional?" k="id_identidade" value={value} onChange={onChange} />
        <LongField label="Você tem um senso de propósito e direção na vida?" k="id_proposito" value={value} onChange={onChange} />
        <LongField label="O que considera seus maiores recursos e pontos fortes?" k="id_recursos" value={value} onChange={onChange} />
        <LongField label="Quais são seus maiores medos em relação ao que a avaliação pode revelar?" k="id_medos" value={value} onChange={onChange} />
      </Section>

      {/* 15. Escalas */}
      <Section title="15. Escalas de Autopercepção Cognitiva e Funcional" hint="Avalie de 1 a 5 — funcionamento habitual nas últimas 4 semanas.">
        <div className="grid gap-2">
          {ESCALAS.map((e) => (
            <div key={e.key} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
              <span className="text-sm">{e.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{e.min}</span>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setEsc(e.key, n)}
                    className={`h-8 w-8 rounded border text-sm ${escalas[e.key] === n ? 'bg-primary text-primary-foreground' : 'bg-background'}`}
                  >{n}</button>
                ))}
                <span className="text-xs text-muted-foreground">{e.max}</span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 16. Expectativas */}
      <Section title="16. Expectativas e Questões Norteadoras">
        <LongField label="Quais são as principais perguntas que você quer que esta avaliação responda?" k="exp_perguntas" value={value} onChange={onChange} />
        <LongField label="O que você espera receber ao final (laudo, relatório, devolutiva)?" k="exp_entrega" value={value} onChange={onChange} />
        <LongField label="O laudo tem uma finalidade específica?" k="exp_finalidade" value={value} onChange={onChange} />
        <LongField label="Há algo na sua história que considera importante e que ainda não foi perguntado?" k="exp_adicional" value={value} onChange={onChange} />
      </Section>

      {/* 17. Impressões clínicas */}
      <Section title="17. Impressões Clínicas e Planejamento" hint="Preenchimento exclusivo do(a) neuropsicólogo(a) — não compartilhado com o paciente.">
        <LongField label="Hipóteses diagnósticas iniciais (CID-11/DSM-5)" k="clin_hipoteses" value={value} onChange={onChange} />
        <LongField label="Estimativa de nível cognitivo premórbido" k="clin_premorbido" value={value} onChange={onChange} />
        <LongField label="Domínios prioritários a investigar" k="clin_dominios" value={value} onChange={onChange} />
        <LongField label="Instrumentos/baterias de avaliação selecionados" k="clin_instrumentos" value={value} onChange={onChange} />
        <LongField label="Adaptações necessárias (tempo, formato, acessibilidade)" k="clin_adaptacoes" value={value} onChange={onChange} />
        <LongField label="Número de sessões planejadas e duração estimada" k="clin_sessoes" value={value} onChange={onChange} />
        <LongField label="Documentos e exames solicitados" k="clin_documentos" value={value} onChange={onChange} />
        <LongField label="Encaminhamentos indicados" k="clin_encaminhamentos" value={value} onChange={onChange} />
        <LongField label="Fatores de risco identificados" k="clin_risco" value={value} onChange={onChange} />
        <LongField label="Fatores de proteção e recursos do avaliado" k="clin_protecao" value={value} onChange={onChange} />
        <LongField label="Observações sobre comportamento, rapport e esforço" k="clin_observacoes" value={value} onChange={onChange} />
      </Section>
    </div>
  )
}

// ---------- helpers ----------
function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h3 className="font-serif text-lg font-semibold">{title}</h3>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      <div className="mt-4 grid gap-3">{children}</div>
    </section>
  )
}
function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  )
}
function LongField({ label, k, value, onChange }: { label: string; k: string; value: AdultNeuroData; onChange: (v: AdultNeuroData) => void }) {
  return (
    <div className="grid gap-1">
      <Label className="text-xs">{label}</Label>
      <Textarea rows={2} value={String((value as Record<string, unknown>)[k] ?? '')} onChange={(e) => onChange({ ...value, [k]: e.target.value })} />
    </div>
  )
}
function ChecklistGrid({ items, data, onChange }: { items: string[]; data: Record<string, boolean>; onChange: (k: string, v: boolean) => void }) {
  return (
    <div className="grid gap-1 sm:grid-cols-2">
      {items.map((it) => (
        <label key={it} className="flex items-start gap-2 rounded-md border p-2 text-sm">
          <Checkbox checked={!!data[it]} onCheckedChange={(c) => onChange(it, !!c)} />
          <span>{it}</span>
        </label>
      ))}
    </div>
  )
}
function SimNaoBlock({ items, data, onChange }: { items: string[]; data: Record<string, 'sim' | 'nao' | ''>; onChange: (k: string, v: 'sim' | 'nao' | '') => void }) {
  return (
    <div className="grid gap-2">
      {items.map((it) => (
        <div key={it} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
          <span className="text-sm">{it}</span>
          <div className="flex gap-2">
            {(['sim', 'nao'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => onChange(it, data[it] === v ? '' : v)}
                className={`h-8 rounded border px-3 text-xs capitalize ${data[it] === v ? 'bg-primary text-primary-foreground' : 'bg-background'}`}
              >{v === 'sim' ? 'Sim' : 'Não'}</button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
function FreqBlock({ title, items, data, onChange, minLabel, maxLabel }: {
  title: string; items: string[]; data: Record<string, number>;
  onChange: (k: string, v: number) => void; minLabel: string; maxLabel: string
}) {
  return (
    <div className="rounded-md border p-3">
      <p className="mb-2 text-sm font-medium">{title}</p>
      <div className="grid gap-2">
        {items.map((it) => (
          <div key={it} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
            <span className="text-sm">{it}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{minLabel}</span>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onChange(it, n)}
                  className={`h-8 w-8 rounded border text-sm ${data[it] === n ? 'bg-primary text-primary-foreground' : 'bg-background'}`}
                >{n}</button>
              ))}
              <span className="text-xs text-muted-foreground">{maxLabel}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
