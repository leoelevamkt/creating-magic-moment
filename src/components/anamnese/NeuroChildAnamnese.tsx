import { useMemo } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'

/**
 * Anamnese Neuropsicológica — Crianças e Adolescentes.
 * Todos os campos são armazenados em `structured_data.child_neuro`.
 */
export type ChildNeuroData = Record<string, unknown>

type Props = {
  value: ChildNeuroData
  onChange: (patch: ChildNeuroData) => void
}

// ---------- Domínios cognitivos ----------
const COG_DOMAINS = [
  'Atenção e concentração',
  'Memória (curto e longo prazo)',
  'Funções executivas',
  'Linguagem oral (compreensão e expressão)',
  'Leitura e escrita',
  'Matemática/raciocínio lógico',
  'Processamento visuoespacial',
  'Velocidade de processamento',
  'Habilidades sociais/cognição social',
  'Regulação emocional e comportamental',
  'Memória de trabalho',
  'Flexibilidade cognitiva',
]

// ---------- Marcos ----------
const MOTOR = [
  ['Sustentação da cabeça', '~3 meses'],
  ['Sentou sem apoio', '~6 meses'],
  ['Engatinhou', '~9 meses'],
  ['Ficou em pé com apoio', '~9-10 meses'],
  ['Primeiros passos', '~12 meses'],
  ['Corrida coordenada', '~18-24 meses'],
]
const LANG = [
  ['Primeiros sorrisos sociais', '~2 meses'],
  ['Balbucio/lalação', '~6 meses'],
  ['Primeiras palavras com sentido', '~12 meses'],
  ['Combinação de 2 palavras', '~18-24 meses'],
  ['Frases completas', '~3 anos'],
]
const OUTROS = [
  ['Controle esfincteriano diurno', '~2-3 anos'],
  ['Controle esfincteriano noturno', '~3-4 anos'],
  ['Dominância lateral definida', '~4-6 anos'],
]

// ---------- Condições de saúde ----------
const HEALTH = [
  'Epilepsia/convulsões febris',
  'Traumatismo cranioencefálico (TCE)',
  'Tumor cerebral/neurocirurgia',
  'AVC/malformações vasculares',
  'Meningite/encefalite',
  'Hidrocefalia/derivação',
  'Transtorno do Espectro Autista (TEA)',
  'TDAH',
  'Deficiência Intelectual',
  'Paralisia Cerebral',
  'Síndromes genéticas (Down, Williams, Frágil X)',
  'Transtornos de ansiedade/depressão/humor',
  'Transtornos do sono diagnosticados',
  'Deficiências sensoriais (visão/audição)',
  'Doenças crônicas (diabetes, cardiopatia)',
]

// ---------- Aprendizagem ----------
const APRENDIZAGEM = [
  'Inverte letras ou números ao escrever',
  'Troca letras semelhantes (b/d, p/q)',
  'Leitura muito lenta ou silabada',
  'Dificuldade em compreender o que lê',
  'Erros ortográficos frequentes e atípicos',
  'Caligrafia muito irregular/ilegível',
  'Dificuldade em copiar da lousa',
  'Não consegue escrever o que pensa/fala',
  'Dificuldade com tabuada/algoritmos',
  'Não compreende problemas matemáticos',
  'Dificuldade em sequenciar e ordenar',
  'Confunde direita/esquerda, cima/baixo',
]

// ---------- Funções executivas (frequência) ----------
const FE_ITEMS = [
  'Dificuldade em manter atenção em tarefas longas',
  'Distrai-se facilmente com estímulos externos',
  'Comete erros por descuido/falta de atenção aos detalhes',
  'Não segue instruções até o fim/não conclui tarefas',
  'Dificuldade em organizar tarefas e atividades',
  'Evita ou resiste a tarefas que exigem esforço mental',
  'Perde materiais necessários para tarefas',
  'Age impulsivamente antes de pensar',
  'Dificuldade em esperar a vez ou aguardar',
  'Agitação motora excessiva/inquietação',
  'Dificuldade em planejar e iniciar tarefas sozinho',
  'Transições entre atividades são difíceis/inflexibilidade',
]

// ---------- Linguagem sim/não ----------
const LANG_SN = [
  'Dificuldade em encontrar palavras ao falar (anomia)',
  'Vocabulário reduzido para a idade',
  'Dificuldade em compreender instruções verbais longas',
  'Troca ou omite sons nas palavras (dislalia)',
  'Gagueira ou disfluência na fala',
  'Dificuldade em narrar histórias ou sequenciar eventos oralmente',
  'Dificuldade em compreender piadas, ironias ou linguagem figurada',
  'Já realizou ou realiza acompanhamento fonoaudiológico',
]

// ---------- Comportamento ----------
const COMPORT = [
  'Crises de choro/irritabilidade frequente',
  'Agressividade física ou verbal',
  'Ansiedade/preocupação excessiva',
  'Medos intensos/fobias',
  'Tristeza persistente/apatia',
  'Humor instável',
  'Comportamentos repetitivos/estereotipias',
  'Rituais ou compulsões',
  'Dificuldade em fazer ou manter amizades',
  'Preferência por brincadeiras solitárias',
  'Dificuldade em reconhecer emoções alheias',
  'Pouco contato visual',
  'Hipersensibilidade sensorial (sons, toque, luz, texturas)',
  'Hiposensibilidade sensorial',
  'Comportamento opositor/desafiador frequente',
  'Mentiras frequentes/furtos',
  'Automutilação/pensamentos de se machucar',
  'Uso excessivo de telas',
]

// ---------- Antecedentes familiares ----------
const FAMILIARES = [
  'TDAH/dificuldades de atenção',
  'Dislexia/dificuldades de leitura e escrita',
  'Discalculia/dificuldades com matemática',
  'TEA/características autistas',
  'Deficiência intelectual',
  'Epilepsia/convulsões',
  'Transtornos de ansiedade',
  'Depressão/transtorno bipolar',
  'Esquizofrenia/psicoses',
  'Dependência química/alcoolismo',
  'Doenças neurológicas degenerativas',
  'Dificuldades escolares não diagnosticadas',
]

// ---------- Escalas responsáveis ----------
const ESCALAS = [
  { key: 'gravidade_dificuldades', label: 'Gravidade das dificuldades cognitivas no dia a dia', min: 'Mínima', max: 'Severa' },
  { key: 'impacto_escolar', label: 'Impacto das dificuldades no desempenho escolar', min: 'Nenhum', max: 'Muito alto' },
  { key: 'impacto_social', label: 'Impacto na vida social e familiar', min: 'Nenhum', max: 'Muito alto' },
  { key: 'qualidade_sono', label: 'Qualidade do sono da criança', min: 'Muito ruim', max: 'Excelente' },
  { key: 'estresse_crianca', label: 'Nível de estresse emocional da criança', min: 'Muito baixo', max: 'Muito alto' },
  { key: 'motivacao', label: 'Motivação da criança para atividades acadêmicas', min: 'Nenhuma', max: 'Muito alta' },
  { key: 'suporte_familiar', label: 'Suporte familiar disponível para o processo de avaliação', min: 'Mínimo', max: 'Total' },
  { key: 'ansiedade_resp', label: 'Nível de ansiedade dos responsáveis em relação às dificuldades', min: 'Baixo', max: 'Muito alto' },
]

function get(obj: ChildNeuroData, path: string): unknown {
  return (obj as Record<string, unknown>)[path]
}

export function NeuroChildAnamnese({ value, onChange }: Props) {
  const set = (k: string, v: unknown) => onChange({ ...value, [k]: v })

  const dominios = (value.dominios as Record<string, { queixa?: boolean; grau?: number; contexto?: string }>) ?? {}
  const setDom = (label: string, patch: Partial<{ queixa: boolean; grau: number; contexto: string }>) => {
    const cur = dominios[label] ?? {}
    set('dominios', { ...dominios, [label]: { ...cur, ...patch } })
  }

  const marcos = (value.marcos as Record<string, string>) ?? {}
  const setMarco = (k: string, v: string) => set('marcos', { ...marcos, [k]: v })

  const healthChecks = (value.health as Record<string, boolean>) ?? {}
  const setHealth = (k: string, v: boolean) => set('health', { ...healthChecks, [k]: v })

  const aprend = (value.aprendizagem as Record<string, boolean>) ?? {}
  const setAprend = (k: string, v: boolean) => set('aprendizagem', { ...aprend, [k]: v })

  const feFreq = (value.fe_frequencia as Record<string, number>) ?? {}
  const setFE = (k: string, v: number) => set('fe_frequencia', { ...feFreq, [k]: v })

  const langSN = (value.lang_sn as Record<string, 'sim' | 'nao' | ''>) ?? {}
  const setLangSN = (k: string, v: 'sim' | 'nao' | '') => set('lang_sn', { ...langSN, [k]: v })

  const compChecks = (value.comportamentos as Record<string, boolean>) ?? {}
  const setComp = (k: string, v: boolean) => set('comportamentos', { ...compChecks, [k]: v })

  const familiares = (value.familiares as Record<string, boolean>) ?? {}
  const setFam = (k: string, v: boolean) => set('familiares', { ...familiares, [k]: v })

  const escalas = (value.escalas as Record<string, number>) ?? {}
  const setEsc = (k: string, v: number) => set('escalas', { ...escalas, [k]: v })

  const composicao = useMemo(
    () => (value.composicao_familiar as Array<{ nome: string; relacao: string; idade: string; ocupacao: string }>) ?? [],
    [value.composicao_familiar],
  )
  const setComp2 = (arr: typeof composicao) => set('composicao_familiar', arr)

  return (
    <div className="grid gap-6">
      {/* 1. Identificação */}
      <Section title="1. Identificação da Criança e dos Responsáveis">
        <Grid2>
          <Field label="Nome completo da criança"><Input value={String(get(value, 'nome') ?? '')} onChange={(e) => set('nome', e.target.value)} /></Field>
          <Field label="Data de nascimento"><Input type="date" value={String(get(value, 'nascimento') ?? '')} onChange={(e) => set('nascimento', e.target.value)} /></Field>
          <Field label="Idade"><Input value={String(get(value, 'idade') ?? '')} onChange={(e) => set('idade', e.target.value)} /></Field>
          <Field label="Sexo/Gênero"><Input value={String(get(value, 'sexo') ?? '')} onChange={(e) => set('sexo', e.target.value)} /></Field>
          <Field label="Lateralidade">
            <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={String(get(value, 'lateralidade') ?? '')} onChange={(e) => set('lateralidade', e.target.value)}>
              <option value="">—</option><option>Destra</option><option>Canhota</option><option>Ambidestra</option><option>Em definição</option>
            </select>
          </Field>
          <Field label="Escola / Ano escolar"><Input value={String(get(value, 'escola') ?? '')} onChange={(e) => set('escola', e.target.value)} /></Field>
          <Field label="Cidade / Estado"><Input value={String(get(value, 'cidade_uf') ?? '')} onChange={(e) => set('cidade_uf', e.target.value)} /></Field>
          <Field label="Nome do(s) responsável(is)"><Input value={String(get(value, 'responsaveis') ?? '')} onChange={(e) => set('responsaveis', e.target.value)} /></Field>
          <Field label="Relação com a criança"><Input value={String(get(value, 'relacao') ?? '')} onChange={(e) => set('relacao', e.target.value)} /></Field>
          <Field label="Telefone / Email"><Input value={String(get(value, 'contato_resp') ?? '')} onChange={(e) => set('contato_resp', e.target.value)} /></Field>
          <Field label="Encaminhado por"><Input value={String(get(value, 'encaminhado_por') ?? '')} onChange={(e) => set('encaminhado_por', e.target.value)} /></Field>
          <Field label="Hipótese diagnóstica do encaminhante"><Input value={String(get(value, 'hipotese_encaminhante') ?? '')} onChange={(e) => set('hipotese_encaminhante', e.target.value)} /></Field>
          <Field label="Data da entrevista"><Input type="date" value={String(get(value, 'data_entrevista') ?? '')} onChange={(e) => set('data_entrevista', e.target.value)} /></Field>
        </Grid2>
      </Section>

      {/* 2. Queixa Principal */}
      <Section title="2. Queixa Principal">
        <LongField label="Qual é a principal queixa ou dificuldade que motivou a busca pela avaliação?" k="qp_principal" value={value} onChange={onChange} />
        <LongField label="Há quanto tempo essa dificuldade está presente?" k="qp_tempo" value={value} onChange={onChange} />
        <LongField label="Em quais situações ou contextos a dificuldade é mais evidente?" k="qp_contextos" value={value} onChange={onChange} />
        <LongField label="O que aconteceu recentemente que motivou buscar a avaliação agora?" k="qp_recente" value={value} onChange={onChange} />
        <LongField label="Algum profissional já sugeriu ou diagnosticou algo anteriormente?" k="qp_prev_diag" value={value} onChange={onChange} />
      </Section>

      {/* 3. Domínios cognitivos */}
      <Section title="3. Queixas por Domínio Cognitivo" hint="Marque se há queixa, defina o grau (1=leve, 5=severo) e descreva o contexto.">
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
        <LongField label="Observações adicionais sobre os domínios assinalados" k="dominios_obs" value={value} onChange={onChange} />
      </Section>

      {/* 4. Gestação */}
      <Section title="4. Gestação, Parto e Período Neonatal">
        <LongField label="A gestação foi planejada? Como foi recebida pela família?" k="gest_planejada" value={value} onChange={onChange} />
        <LongField label="Houve uso de álcool, tabaco, medicamentos ou outras substâncias durante a gestação?" k="gest_substancias" value={value} onChange={onChange} />
        <LongField label="Houve infecções, doenças ou complicações durante a gestação?" k="gest_complicacoes" value={value} onChange={onChange} />
        <LongField label="Qual foi o tipo de parto? Houve complicações?" k="parto_tipo" value={value} onChange={onChange} />
        <LongField label="Qual foi o peso ao nascer e a idade gestacional?" k="peso_ig" value={value} onChange={onChange} />
        <LongField label="A criança precisou de UTI neonatal, incubadora ou oxigenoterapia?" k="neo_uti" value={value} onChange={onChange} />
        <LongField label="Houve icterícia neonatal grave, convulsões neonatais ou outras intercorrências?" k="neo_intercorrencias" value={value} onChange={onChange} />
        <LongField label="Como foi o aleitamento materno?" k="aleitamento" value={value} onChange={onChange} />
      </Section>

      {/* 5. Marcos */}
      <Section title="5. Marcos do Desenvolvimento Neuropsicomotor" hint="Registre a idade em que cada marco foi atingido.">
        <MarcoGrid title="Marcos Motores" items={MOTOR} data={marcos} onChange={setMarco} />
        <MarcoGrid title="Marcos de Linguagem" items={LANG} data={marcos} onChange={setMarco} />
        <MarcoGrid title="Outros Marcos" items={OUTROS} data={marcos} onChange={setMarco} />
        <LongField label="Houve regressões em algum marco já adquirido? Quando e em que contexto?" k="regressoes" value={value} onChange={onChange} />
      </Section>

      {/* 6. Saúde / neuro / psiq */}
      <Section title="6. Histórico de Saúde, Neurológico e Psiquiátrico">
        <ChecklistGrid items={HEALTH} data={healthChecks} onChange={setHealth} />
        <LongField label="Descreva os diagnósticos assinalados (data, profissional, evolução)" k="diag_desc" value={value} onChange={onChange} />
        <LongField label="A criança usa ou já usou medicamentos psicotrópicos ou antiepilépticos?" k="meds_psiq" value={value} onChange={onChange} />
        <LongField label="Houve hospitalização, cirurgia ou procedimento relevante?" k="hospitalizacoes" value={value} onChange={onChange} />
        <LongField label="A criança realizou fisioterapia, fonoaudiologia, TO, psicoterapia, reforço escolar ou ABA?" k="terapias" value={value} onChange={onChange} />
        <LongField label="Já realizou avaliação neuropsicológica, neuropediátrica ou psiquiátrica antes?" k="aval_previas" value={value} onChange={onChange} />
      </Section>

      {/* 7. Sono e alimentação */}
      <Section title="7. Sono, Alimentação e Saúde Geral">
        <LongField label="Como é a rotina de sono? Quantas horas dorme por noite? Tem hora regular?" k="sono_rotina" value={value} onChange={onChange} />
        <LongField label="Apresenta dificuldades para dormir, despertares noturnos, pesadelos, terror noturno, sonambulismo ou ronco?" k="sono_dif" value={value} onChange={onChange} />
        <LongField label="Como é a alimentação? Há seletividade alimentar, recusas ou rituais alimentares?" k="alimentacao" value={value} onChange={onChange} />
        <LongField label="A criança pratica atividade física? Com que frequência?" k="atividade_fisica" value={value} onChange={onChange} />
        <LongField label="Queixa-se de dores de cabeça frequentes, tonturas ou fadiga?" k="dor_fadiga" value={value} onChange={onChange} />
        <LongField label="Faz acompanhamento oftalmológico e audiológico regular?" k="oftalmo_audio" value={value} onChange={onChange} />
      </Section>

      {/* 8. Escolar */}
      <Section title="8. Histórico Escolar e Aprendizagem">
        <LongField label="Com que idade a criança iniciou a educação infantil? Como foi a adaptação?" k="esc_inicio" value={value} onChange={onChange} />
        <LongField label="Já houve reprovação, retenção ou indicação de retenção? Em qual série?" k="esc_retencao" value={value} onChange={onChange} />
        <LongField label="Já houve troca de escola? Motivada por quê?" k="esc_troca" value={value} onChange={onChange} />
        <LongField label="Como é o desempenho atual nas disciplinas? Quais as maiores dificuldades?" k="esc_desempenho" value={value} onChange={onChange} />
        <LongField label="A escola já fez alguma queixa formal ou relatório sobre a criança?" k="esc_queixa" value={value} onChange={onChange} />
        <LongField label="A criança recebe ou já recebeu apoio especializado ou adaptação curricular?" k="esc_apoio" value={value} onChange={onChange} />
        <LongField label="Como a criança se sente em relação à escola? Há recusa ou resistência?" k="esc_sentimento" value={value} onChange={onChange} />
        <LongField label="Como é a organização com materiais, tarefas e agenda?" k="esc_organizacao" value={value} onChange={onChange} />
        <LongField label="Quantas horas por dia dedica a tarefas de casa? Com ajuda ou sozinha?" k="esc_tarefas" value={value} onChange={onChange} />
        <div className="mt-3">
          <p className="mb-2 text-sm font-medium">Indicadores de Dificuldades Específicas de Aprendizagem</p>
          <ChecklistGrid items={APRENDIZAGEM} data={aprend} onChange={setAprend} />
        </div>
      </Section>

      {/* 9. Atenção / FE (frequência) */}
      <Section title="9. Atenção, Funções Executivas e Regulação" hint="Avalie a frequência (1=Raramente, 5=Sempre).">
        <div className="grid gap-2">
          {FE_ITEMS.map((it) => (
            <div key={it} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
              <span className="text-sm">{it}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Raramente</span>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setFE(it, n)}
                    className={`h-8 w-8 rounded border text-sm ${feFreq[it] === n ? 'bg-primary text-primary-foreground' : 'bg-background'}`}
                  >{n}</button>
                ))}
                <span className="text-xs text-muted-foreground">Sempre</span>
              </div>
            </div>
          ))}
        </div>
        <LongField label="Os comportamentos acima ocorrem em mais de um ambiente (escola E casa)?" k="fe_ambientes" value={value} onChange={onChange} />
        <LongField label="Desde quando esses comportamentos são observados? Houve algum evento que os desencadeou?" k="fe_inicio" value={value} onChange={onChange} />
      </Section>

      {/* 10. Linguagem */}
      <Section title="10. Linguagem, Comunicação e Aspectos Fonoaudiológicos">
        <div className="grid gap-2">
          {LANG_SN.map((it) => (
            <div key={it} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
              <span className="text-sm">{it}</span>
              <div className="flex gap-2">
                {(['sim', 'nao'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setLangSN(it, langSN[it] === v ? '' : v)}
                    className={`h-8 rounded border px-3 text-xs capitalize ${langSN[it] === v ? 'bg-primary text-primary-foreground' : 'bg-background'}`}
                  >{v === 'sim' ? 'Sim' : 'Não'}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <LongField label="Descreva em detalhes as queixas de linguagem/comunicação marcadas acima" k="lang_desc" value={value} onChange={onChange} />
      </Section>

      {/* 11. Comportamento */}
      <Section title="11. Comportamento, Emoções e Habilidades Sociais" hint="Marque os sintomas observados de forma frequente.">
        <ChecklistGrid items={COMPORT} data={compChecks} onChange={setComp} />
        <LongField label="Descreva os comportamentos assinalados (frequência, intensidade, contexto)" k="comp_desc" value={value} onChange={onChange} />
        <LongField label="Como a criança expressa e lida com frustração, raiva e tristeza?" k="comp_regulacao" value={value} onChange={onChange} />
        <LongField label="Quais são os pontos fortes, talentos e interesses da criança?" k="pontos_fortes" value={value} onChange={onChange} />
      </Section>

      {/* 12. Familiar */}
      <Section title="12. Histórico Familiar e Contexto Psicossocial">
        <div className="rounded-md border p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">Composição Familiar</p>
            <button
              type="button"
              onClick={() => setComp2([...composicao, { nome: '', relacao: '', idade: '', ocupacao: '' }])}
              className="rounded-md border px-2 py-1 text-xs hover:bg-accent"
            >+ Adicionar</button>
          </div>
          <div className="grid gap-2">
            {composicao.map((m, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                <Input placeholder="Nome" value={m.nome} onChange={(e) => { const a = [...composicao]; a[i] = { ...a[i], nome: e.target.value }; setComp2(a) }} />
                <Input placeholder="Relação" value={m.relacao} onChange={(e) => { const a = [...composicao]; a[i] = { ...a[i], relacao: e.target.value }; setComp2(a) }} />
                <Input placeholder="Idade" value={m.idade} onChange={(e) => { const a = [...composicao]; a[i] = { ...a[i], idade: e.target.value }; setComp2(a) }} />
                <Input placeholder="Ocupação" value={m.ocupacao} onChange={(e) => { const a = [...composicao]; a[i] = { ...a[i], ocupacao: e.target.value }; setComp2(a) }} />
                <button type="button" className="rounded-md border px-2 text-xs hover:bg-destructive/10" onClick={() => setComp2(composicao.filter((_, j) => j !== i))}>Remover</button>
              </div>
            ))}
            {composicao.length === 0 ? <p className="text-xs text-muted-foreground">Nenhum membro adicionado.</p> : null}
          </div>
        </div>

        <div className="mt-3">
          <p className="mb-2 text-sm font-medium">Antecedentes Familiares</p>
          <ChecklistGrid items={FAMILIARES} data={familiares} onChange={setFam} />
        </div>
        <LongField label="Descreva os antecedentes assinalados" k="fam_desc" value={value} onChange={onChange} />
        <LongField label="Como é a dinâmica familiar? Os pais/responsáveis são separados? Como é a coparentalidade?" k="fam_dinamica" value={value} onChange={onChange} />
        <LongField label="Houve eventos estressores significativos na família?" k="fam_estressores" value={value} onChange={onChange} />
        <LongField label="Qual é o nível de escolaridade e profissão dos responsáveis principais?" k="fam_escolaridade" value={value} onChange={onChange} />
        <LongField label="Qual é o idioma falado em casa? A criança é bilíngue?" k="fam_idioma" value={value} onChange={onChange} />
      </Section>

      {/* 13. Rotina */}
      <Section title="13. Rotina, Uso de Tecnologia e Atividades">
        <LongField label="Descreva a rotina diária da criança (horários de sono, escola, atividades, telas)" k="rotina" value={value} onChange={onChange} />
        <LongField label="Quantas horas por dia a criança usa telas?" k="telas_horas" value={value} onChange={onChange} />
        <LongField label="A criança tem dificuldade em interromper o uso de telas/jogos?" k="telas_dif" value={value} onChange={onChange} />
        <LongField label="Quais são as atividades favoritas da criança?" k="ativ_favoritas" value={value} onChange={onChange} />
        <LongField label="A criança prefere brincar sozinha ou acompanhada?" k="brincar" value={value} onChange={onChange} />
      </Section>

      {/* 14. Escalas */}
      <Section title="14. Escalas de Percepção dos Responsáveis" hint="Avalie de 1 a 5.">
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

      {/* 15. Expectativas */}
      <Section title="15. Expectativas e Questões Norteadoras">
        <LongField label="Quais são as principais perguntas que você quer que a avaliação responda?" k="exp_perguntas" value={value} onChange={onChange} />
        <LongField label="O que você espera receber ao final da avaliação?" k="exp_resultado" value={value} onChange={onChange} />
        <LongField label="Há necessidade de laudo para escola, INSS, plano de saúde ou processo judicial?" k="exp_laudo" value={value} onChange={onChange} />
        <LongField label="Existe algum tema sensível que não gostaria que constasse no laudo?" k="exp_sensivel" value={value} onChange={onChange} />
        <LongField label="Há alguma informação adicional que considera importante?" k="exp_adicional" value={value} onChange={onChange} />
      </Section>

      {/* 16. Impressões clínicas */}
      <Section title="16. Impressões Clínicas e Planejamento" hint="Preenchimento exclusivo do(a) neuropsicólogo(a) — não compartilhado com o paciente.">
        <LongField label="Hipóteses diagnósticas iniciais (CID-11/DSM-5)" k="clin_hipoteses" value={value} onChange={onChange} />
        <LongField label="Domínios prioritários a investigar" k="clin_dominios" value={value} onChange={onChange} />
        <LongField label="Instrumentos/baterias de avaliação selecionados" k="clin_instrumentos" value={value} onChange={onChange} />
        <LongField label="Adaptações necessárias (tempo extra, intervalos, recursos de acessibilidade)" k="clin_adaptacoes" value={value} onChange={onChange} />
        <LongField label="Número de sessões planejadas e estimativa de duração" k="clin_sessoes" value={value} onChange={onChange} />
        <LongField label="Documentos e relatórios solicitados (escola, médicos, laudos anteriores)" k="clin_documentos" value={value} onChange={onChange} />
        <LongField label="Encaminhamentos indicados concomitantes à avaliação" k="clin_encaminhamentos" value={value} onChange={onChange} />
        <LongField label="Observações gerais da entrevista (comportamento, colaboração, rapport)" k="clin_observacoes" value={value} onChange={onChange} />
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
function LongField({ label, k, value, onChange }: { label: string; k: string; value: ChildNeuroData; onChange: (v: ChildNeuroData) => void }) {
  return (
    <div className="grid gap-1">
      <Label className="text-xs">{label}</Label>
      <Textarea rows={2} value={String((value as Record<string, unknown>)[k] ?? '')} onChange={(e) => onChange({ ...value, [k]: e.target.value })} />
    </div>
  )
}
function MarcoGrid({ title, items, data, onChange }: { title: string; items: string[][]; data: Record<string, string>; onChange: (k: string, v: string) => void }) {
  return (
    <div className="rounded-md border p-3">
      <p className="mb-2 text-sm font-medium">{title}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map(([lbl, ref]) => (
          <div key={lbl} className="grid gap-1">
            <Label className="text-xs">{lbl} <span className="text-muted-foreground">· ref: {ref}</span></Label>
            <Input placeholder="Idade em que atingiu" value={data[lbl] ?? ''} onChange={(e) => onChange(lbl, e.target.value)} />
          </div>
        ))}
      </div>
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
