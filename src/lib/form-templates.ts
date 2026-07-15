export type FormField = {
  key: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'choice' | 'scale' | 'date' | 'checklist'
  options?: string[]
  min?: number
  max?: number
  required?: boolean
  help?: string
}

export type FormTemplate = {
  id: string
  title: string
  description: string
  fields: FormField[]
  /** Quando true, o formulário pode ser criado sem paciente vinculado; o paciente é gerado no envio a partir das respostas. */
  createsPatient?: boolean
}

/** ID especial: template de pré-cadastro cria o paciente ao ser respondido. */
export const PRE_CADASTRO_TEMPLATE_ID = 'pre-cadastro-agendamento'

export const formTemplates: FormTemplate[] = [
  {
    id: 'anamnese-breve',
    title: 'Anamnese breve',
    description:
      'Formulário inicial de anamnese para o paciente preencher antes do primeiro atendimento.',
    fields: [
      { key: 'queixa', label: 'Qual a principal queixa ou motivo da avaliação?', type: 'textarea', required: true },
      { key: 'historia_atual', label: 'Descreva brevemente sua história atual (últimos meses)', type: 'textarea' },
      { key: 'historia_medica', label: 'Histórico médico relevante (doenças, cirurgias, medicações em uso)', type: 'textarea' },
      { key: 'historia_escolar', label: 'Trajetória escolar / acadêmica', type: 'textarea' },
      { key: 'historia_familiar', label: 'Composição familiar e relacionamentos importantes', type: 'textarea' },
      { key: 'historia_social', label: 'Vida social e atividades de lazer', type: 'textarea' },
      { key: 'medicacoes', label: 'Medicações em uso (nome e dose)', type: 'text' },
      { key: 'expectativas', label: 'O que espera da avaliação?', type: 'textarea' },
    ],
  },
  {
    id: 'rastreio-dsm5tr',
    title: 'Rastreio de sintomas (DSM-5-TR autorrelato)',
    description:
      'Avalie a intensidade dos sintomas nas últimas 2 semanas em uma escala de 0 (nunca) a 4 (quase todos os dias).',
    fields: [
      { key: 'humor_deprimido', label: 'Humor deprimido, tristeza ou desesperança', type: 'scale', min: 0, max: 4, required: true },
      { key: 'anedonia', label: 'Pouco interesse ou prazer nas atividades', type: 'scale', min: 0, max: 4, required: true },
      { key: 'ansiedade', label: 'Ansiedade, preocupação excessiva ou tensão', type: 'scale', min: 0, max: 4, required: true },
      { key: 'panico', label: 'Ataques de pânico ou medo intenso repentino', type: 'scale', min: 0, max: 4 },
      { key: 'sono', label: 'Dificuldade para dormir ou dormir demais', type: 'scale', min: 0, max: 4 },
      { key: 'apetite', label: 'Mudança significativa de apetite ou peso', type: 'scale', min: 0, max: 4 },
      { key: 'concentracao', label: 'Dificuldade de concentração ou memória', type: 'scale', min: 0, max: 4 },
      { key: 'irritabilidade', label: 'Irritabilidade ou explosões de raiva', type: 'scale', min: 0, max: 4 },
      { key: 'isolamento', label: 'Isolamento social ou evitação de pessoas', type: 'scale', min: 0, max: 4 },
      { key: 'ideacao', label: 'Pensamentos de morte ou de se machucar', type: 'scale', min: 0, max: 4 },
      { key: 'observacoes', label: 'Observações adicionais', type: 'textarea' },
    ],
  },
  {
    id: 'escala-generica',
    title: 'Escala genérica de sintomas',
    description: 'Escala breve de autorrelato de funcionamento cotidiano.',
    fields: [
      { key: 'sono_qualidade', label: 'Como avalia a qualidade do seu sono?', type: 'choice', options: ['Ótima', 'Boa', 'Regular', 'Ruim', 'Péssima'], required: true },
      { key: 'energia', label: 'Nível de energia no dia a dia (0-10)', type: 'number', min: 0, max: 10 },
      { key: 'humor', label: 'Humor predominante na última semana', type: 'choice', options: ['Muito bom', 'Bom', 'Neutro', 'Baixo', 'Muito baixo'] },
      { key: 'estresse', label: 'Nível de estresse percebido (0-10)', type: 'number', min: 0, max: 10 },
      { key: 'funcionamento_trabalho', label: 'Impacto dos sintomas no trabalho/estudos', type: 'choice', options: ['Nenhum', 'Leve', 'Moderado', 'Grave'] },
      { key: 'funcionamento_social', label: 'Impacto dos sintomas nas relações sociais', type: 'choice', options: ['Nenhum', 'Leve', 'Moderado', 'Grave'] },
      { key: 'comentarios', label: 'Comentários livres', type: 'textarea' },
    ],
  },
  {
    id: 'anamnese-neuropsi-adultos',
    title: 'Avaliação Neuropsicológica — Adultos',
    description:
      'Anamnese estruturada e ampla para avaliação neuropsicológica de adultos. Cobre identificação, queixas por domínio cognitivo, história de desenvolvimento, saúde física e psiquiátrica, uso de substâncias, sintomas emocionais, contexto social, ocupacional, história familiar e escalas de autopercepção. Pode ser respondida pelo paciente antes da entrevista ou usada como roteiro clínico.',
    fields: [
      // 1. Identificação
      { key: 'sec_1', label: '1. Identificação', type: 'textarea', help: 'Preencha os dados básicos abaixo.' },
      { key: 'nome_completo', label: 'Nome completo', type: 'text', required: true },
      { key: 'data_nascimento', label: 'Data de nascimento', type: 'text' },
      { key: 'idade', label: 'Idade', type: 'number', min: 0, max: 120 },
      { key: 'sexo_genero', label: 'Sexo / Gênero', type: 'text' },
      { key: 'pronomes', label: 'Pronomes', type: 'text' },
      { key: 'lateralidade', label: 'Lateralidade', type: 'choice', options: ['Destro', 'Canhoto', 'Ambidestro'] },
      { key: 'lingua_materna', label: 'Língua materna', type: 'text' },
      { key: 'escolaridade_anos', label: 'Escolaridade (anos de estudo formal)', type: 'number', min: 0, max: 40 },
      { key: 'profissao', label: 'Profissão / Ocupação atual', type: 'text' },
      { key: 'estado_civil', label: 'Estado civil', type: 'text' },
      { key: 'num_filhos', label: 'Número de filhos', type: 'number', min: 0, max: 30 },
      { key: 'cidade_estado', label: 'Cidade / Estado', type: 'text' },
      { key: 'encaminhado_por', label: 'Encaminhado por', type: 'text' },
      { key: 'data_entrevista', label: 'Data da entrevista', type: 'text' },
      { key: 'bilingue', label: 'É bilíngue?', type: 'choice', options: ['Sim', 'Não'] },
      { key: 'linguas_fluencia', label: 'Línguas e nível de fluência', type: 'textarea' },
      { key: 'finalidade_avaliacao', label: 'Finalidade da avaliação', type: 'choice', options: ['Clínica', 'Ocupacional', 'Forense', 'Acadêmica'] },

      // 2. Queixa Principal
      { key: 'sec_2', label: '2. Queixa Principal', type: 'textarea', help: 'Descreva as queixas atuais.' },
      { key: 'queixa_palavras', label: 'Em suas próprias palavras, qual é a principal dificuldade que o(a) trouxe até esta avaliação?', type: 'textarea', required: true },
      { key: 'tempo_dificuldades', label: 'Há quanto tempo percebe essas dificuldades?', type: 'text' },
      { key: 'evento_desencadeador', label: 'As dificuldades surgiram após algum evento específico?', type: 'textarea' },
      { key: 'curso_dificuldades', label: 'As dificuldades pioraram, melhoraram ou se mantiveram estáveis?', type: 'choice', options: ['Pioraram', 'Melhoraram', 'Estáveis', 'Flutuantes'] },
      { key: 'situacoes_evidentes', label: 'Em quais situações do dia a dia são mais evidentes?', type: 'textarea' },
      { key: 'terceiros_notaram', label: 'Alguém próximo também notou ou comentou essas dificuldades?', type: 'textarea' },

      // 3. Queixas por Domínio Cognitivo
      { key: 'sec_3', label: '3. Queixas por Domínio Cognitivo', type: 'textarea', help: 'Grau: 1 = leve, 5 = severo. Marque 0 se não houver queixa.' },
      { key: 'dom_atencao', label: 'Atenção e concentração', type: 'scale', min: 0, max: 5 },
      { key: 'dom_mem_curto', label: 'Memória de curto prazo', type: 'scale', min: 0, max: 5 },
      { key: 'dom_mem_longo', label: 'Memória de longo prazo', type: 'scale', min: 0, max: 5 },
      { key: 'dom_mem_trabalho', label: 'Memória de trabalho', type: 'scale', min: 0, max: 5 },
      { key: 'dom_velocidade', label: 'Velocidade de processamento', type: 'scale', min: 0, max: 5 },
      { key: 'dom_linguagem', label: 'Linguagem (encontrar palavras, nomear, compreensão)', type: 'scale', min: 0, max: 5 },
      { key: 'dom_leitura_escrita', label: 'Leitura e escrita', type: 'scale', min: 0, max: 5 },
      { key: 'dom_calculo', label: 'Cálculo e raciocínio matemático', type: 'scale', min: 0, max: 5 },
      { key: 'dom_executivas', label: 'Funções executivas (planejamento, organização, decisão)', type: 'scale', min: 0, max: 5 },
      { key: 'dom_inibitorio', label: 'Controle inibitório', type: 'scale', min: 0, max: 5 },
      { key: 'dom_flexibilidade', label: 'Flexibilidade cognitiva', type: 'scale', min: 0, max: 5 },
      { key: 'dom_espacial', label: 'Orientação espacial', type: 'scale', min: 0, max: 5 },
      { key: 'dom_reconhecimento', label: 'Reconhecimento de faces ou objetos', type: 'scale', min: 0, max: 5 },
      { key: 'dom_visuoconstrutivo', label: 'Habilidades visuoconstrutivas', type: 'scale', min: 0, max: 5 },
      { key: 'dom_cognicao_social', label: 'Cognição social', type: 'scale', min: 0, max: 5 },
      { key: 'dom_regulacao_emo', label: 'Regulação emocional', type: 'scale', min: 0, max: 5 },
      { key: 'dominios_detalhes', label: 'Descreva com mais detalhes os domínios assinalados — exemplos concretos do cotidiano', type: 'textarea' },

      // 4. Detalhamento: Atenção, Memória e Funções Executivas
      { key: 'sec_4', label: '4. Detalhamento: Atenção, Memória e Funções Executivas', type: 'textarea', help: 'Frequência: 1 = raramente, 5 = sempre.' },
      { key: 'at_fio_meada', label: 'Perco o fio da meada no meio de conversas ou tarefas', type: 'scale', min: 1, max: 5 },
      { key: 'at_distrai_ambiente', label: 'Me distraio com estímulos do ambiente', type: 'scale', min: 1, max: 5 },
      { key: 'at_reler', label: 'Preciso reler parágrafos várias vezes', type: 'scale', min: 1, max: 5 },
      { key: 'at_nao_termina', label: 'Começo tarefas mas não consigo terminá-las', type: 'scale', min: 1, max: 5 },
      { key: 'at_descuido', label: 'Cometo erros por descuido em tarefas rotineiras', type: 'scale', min: 1, max: 5 },
      { key: 'at_conversas_simultaneas', label: 'Tenho dificuldade em acompanhar conversas simultâneas', type: 'scale', min: 1, max: 5 },
      { key: 'mem_objetos', label: 'Esqueço onde coloquei objetos de uso cotidiano', type: 'scale', min: 1, max: 5 },
      { key: 'mem_compromissos', label: 'Esqueço compromissos, datas e recados recentes', type: 'scale', min: 1, max: 5 },
      { key: 'mem_repete', label: 'Repito histórias ou perguntas sem perceber', type: 'scale', min: 1, max: 5 },
      { key: 'mem_nomes', label: 'Tenho dificuldade em lembrar nomes de pessoas conhecidas', type: 'scale', min: 1, max: 5 },
      { key: 'mem_comodo', label: 'Esqueço o que ia fazer ao entrar em um cômodo', type: 'scale', min: 1, max: 5 },
      { key: 'mem_lacunas', label: 'Tenho lacunas em memórias de períodos específicos', type: 'scale', min: 1, max: 5 },
      { key: 'mem_aprender', label: 'Tenho dificuldade em aprender informações novas', type: 'scale', min: 1, max: 5 },
      { key: 'fe_planejar', label: 'Tenho dificuldade em planejar e organizar tarefas complexas', type: 'scale', min: 1, max: 5 },
      { key: 'fe_procrastinar', label: 'Procrastino excessivamente ou tenho dificuldade em iniciar tarefas', type: 'scale', min: 1, max: 5 },
      { key: 'fe_impulsivo', label: 'Ajo impulsivamente antes de pensar nas consequências', type: 'scale', min: 1, max: 5 },
      { key: 'fe_mudar_plano', label: 'Tenho dificuldade em mudar de plano quando algo muda', type: 'scale', min: 1, max: 5 },
      { key: 'fe_decisoes', label: 'Tenho dificuldade em tomar decisões mesmo simples', type: 'scale', min: 1, max: 5 },
      { key: 'fe_emocional', label: 'Perco o controle emocional em situações de frustração', type: 'scale', min: 1, max: 5 },
      { key: 'fe_tempo', label: 'Tenho dificuldade em gerir o tempo e cumprir prazos', type: 'scale', min: 1, max: 5 },
      { key: 'fe_desde_infancia', label: 'As dificuldades estão presentes desde a infância ou surgiram na vida adulta?', type: 'textarea' },
      { key: 'fe_pioram_stress', label: 'Essas dificuldades pioram em situações de estresse, privação de sono ou uso de substâncias?', type: 'textarea' },
      { key: 'fe_estrategias', label: 'Você usa estratégias para compensar? Com que eficácia?', type: 'textarea' },

      // 5. Linguagem
      { key: 'sec_5', label: '5. Linguagem, Comunicação e Leitura/Escrita', type: 'textarea', help: 'Responda Sim ou Não.' },
      { key: 'ling_encontrar_palavras', label: 'Tenho dificuldade em encontrar palavras durante a fala', type: 'choice', options: ['Sim', 'Não'] },
      { key: 'ling_palavras_erradas', label: 'Falo ou escrevo palavras erradas sem perceber', type: 'choice', options: ['Sim', 'Não'] },
      { key: 'ling_compreender_textos', label: 'Tenho dificuldade em compreender textos longos ou complexos', type: 'choice', options: ['Sim', 'Não'] },
      { key: 'ling_leitura_lenta', label: 'Leio com lentidão ou preciso reler para compreender', type: 'choice', options: ['Sim', 'Não'] },
      { key: 'ling_ortografia', label: 'Cometo erros ortográficos frequentes na escrita', type: 'choice', options: ['Sim', 'Não'] },
      { key: 'ling_ironias', label: 'Tenho dificuldade em acompanhar piadas, ironias ou linguagem figurada', type: 'choice', options: ['Sim', 'Não'] },
      { key: 'ling_grupo_barulho', label: 'Tenho dificuldade em acompanhar conversas em grupo ou ambientes barulhentos', type: 'choice', options: ['Sim', 'Não'] },
      { key: 'ling_fala_confusa', label: 'Minha fala é descrita como rápida demais, arrastada ou confusa', type: 'choice', options: ['Sim', 'Não'] },
      { key: 'ling_organizar_discurso', label: 'Tenho dificuldade em organizar o discurso ao contar histórias', type: 'choice', options: ['Sim', 'Não'] },
      { key: 'ling_fono', label: 'Já realizei ou realizo acompanhamento fonoaudiológico', type: 'choice', options: ['Sim', 'Não'] },
      { key: 'ling_detalhes', label: 'Descreva os itens assinalados com exemplos concretos', type: 'textarea' },

      // 6. História do Desenvolvimento
      { key: 'sec_6', label: '6. História do Desenvolvimento', type: 'textarea', help: 'Infância, adolescência e vida adulta.' },
      { key: 'dev_prematuro', label: 'Fui prematuro(a) ou tive intercorrências no nascimento', type: 'choice', options: ['Sim', 'Não'] },
      { key: 'dev_motor', label: 'Tive atrasos no desenvolvimento motor', type: 'choice', options: ['Sim', 'Não'] },
      { key: 'dev_fala', label: 'Tive atrasos no desenvolvimento da fala ou linguagem', type: 'choice', options: ['Sim', 'Não'] },
      { key: 'dev_alfabetizacao', label: 'Tive dificuldades na alfabetização', type: 'choice', options: ['Sim', 'Não'] },
      { key: 'dev_matematica', label: 'Tive dificuldades com matemática desde criança', type: 'choice', options: ['Sim', 'Não'] },
      { key: 'dev_dx_aprendizagem', label: 'Recebi diagnóstico de dificuldade de aprendizagem na infância', type: 'choice', options: ['Sim', 'Não'] },
      { key: 'dev_avaliado_infancia', label: 'Fui avaliado por psicólogo ou neuropediatra na infância', type: 'choice', options: ['Sim', 'Não'] },
      { key: 'dev_medicacao', label: 'Tomei ou tomo medicação para atenção, humor ou comportamento', type: 'choice', options: ['Sim', 'Não'] },
      { key: 'dev_repetiu', label: 'Repeti algum ano escolar', type: 'choice', options: ['Sim', 'Não'] },
      { key: 'dev_agitado_escola', label: 'Fui descrito como agitado, distraído ou difícil na escola', type: 'choice', options: ['Sim', 'Não'] },
      { key: 'dev_experiencia_escolar', label: 'Como foi sua experiência escolar de modo geral?', type: 'textarea' },
      { key: 'dev_escolaridade_completa', label: 'Qual é sua escolaridade completa?', type: 'text' },
      { key: 'dev_diferente_colegas', label: 'Na infância/adolescência, você se sentia diferente dos colegas?', type: 'textarea' },
      { key: 'dev_amigos_infancia', label: 'Você tinha muitos amigos? Era fácil se relacionar?', type: 'textarea' },
      { key: 'dev_esportes', label: 'Praticou esportes ou atividades motoras? Tinha facilidade ou dificuldade?', type: 'textarea' },
      { key: 'adulto_profissional', label: 'Como avalia seu desempenho profissional ao longo da vida?', type: 'textarea' },
      { key: 'adulto_autonomia', label: 'Você consegue gerir sozinho finanças, documentos e rotinas?', type: 'textarea' },
      { key: 'adulto_direcao', label: 'Você dirige veículo? Já se envolveu em acidentes ou infrações frequentes?', type: 'textarea' },
      { key: 'adulto_periodos_dificuldade', label: 'Houve períodos específicos de maior dificuldade cognitiva?', type: 'textarea' },

      // 7. Saúde
      { key: 'sec_7', label: '7. Saúde Física, Neurológica e Psiquiátrica', type: 'textarea', help: 'Liste condições ao lado. Detalhes abaixo.' },
      { key: 'saude_condicoes', label: 'Marque as condições que se aplicam (separe por vírgula)', type: 'textarea', help: 'Ex.: Epilepsia, TCE, AVC, Tumor cerebral, Meningite, Hidrocefalia, Parkinson, Esclerose múltipla, Alzheimer/demência, Enxaqueca crônica, TDAH, TEA, T. Bipolar, Esquizofrenia, T. Depressivo Maior, TAG, TEPT, TOC, T. de Personalidade, T. do sono, Hipo/hipertireoidismo, Diabetes, HIV, Doenças autoimunes.' },
      { key: 'saude_detalhes_dx', label: 'Descreva os diagnósticos assinalados (quando, por quem, tratamento em curso)', type: 'textarea' },
      { key: 'saude_medicacoes_psico', label: 'Você usa ou já usou medicamentos psicotrópicos ou antiepilépticos? Quais, doses e por quanto tempo?', type: 'textarea' },
      { key: 'saude_aval_anterior', label: 'Já realizou avaliação neuropsicológica, neurológica ou psiquiátrica antes?', type: 'textarea' },
      { key: 'saude_neuroimagem', label: 'Já foi submetido a exames de neuroimagem (RM, TC, PET) ou EEG? Quais foram os achados?', type: 'textarea' },
      { key: 'saude_psicoterapia', label: 'Realizou ou realiza psicoterapia, reabilitação cognitiva ou outros tratamentos?', type: 'textarea' },

      // 8. Sono e Saúde Geral
      { key: 'sec_8', label: '8. Sono, Fadiga e Saúde Geral', type: 'textarea' },
      { key: 'sono_qualidade', label: 'Como é a qualidade do seu sono? Quantas horas dorme por noite?', type: 'textarea' },
      { key: 'sono_padrao', label: 'Você tem dificuldades para adormecer, acorda várias vezes, tem pesadelos ou sonambulismo?', type: 'textarea' },
      { key: 'sono_ronco', label: 'Você ronca intensamente ou para de respirar durante o sono?', type: 'choice', options: ['Sim', 'Não', 'Não sei'] },
      { key: 'fadiga', label: 'Você sente fadiga intensa ou falta de energia que interfere no seu funcionamento?', type: 'textarea' },
      { key: 'cefaleia', label: 'Você tem queixas de dores de cabeça frequentes, tonturas ou sensação de cabeça pesada?', type: 'textarea' },
      { key: 'alimentacao', label: 'Como é sua alimentação e hidratação no dia a dia?', type: 'textarea' },
      { key: 'atividade_fisica', label: 'Você pratica atividade física regularmente? Qual tipo e frequência?', type: 'textarea' },

      // 9. Substâncias
      { key: 'sec_9', label: '9. Uso de Substâncias Psicoativas', type: 'textarea' },
      { key: 'sub_alcool', label: 'Álcool — uso atual?', type: 'choice', options: ['Sim', 'Não'] },
      { key: 'sub_alcool_qt', label: 'Álcool — frequência e quantidade habitual', type: 'text' },
      { key: 'sub_tabaco', label: 'Tabaco / nicotina', type: 'choice', options: ['Sim', 'Não'] },
      { key: 'sub_maconha', label: 'Maconha / cannabis', type: 'choice', options: ['Sim', 'Não'] },
      { key: 'sub_cocaina', label: 'Cocaína / crack', type: 'choice', options: ['Sim', 'Não'] },
      { key: 'sub_estimulantes', label: 'Estimulantes (anfetaminas, MDMA, metilfenidato sem receita)', type: 'choice', options: ['Sim', 'Não'] },
      { key: 'sub_bzd', label: 'Benzodiazepínicos / sedativos sem prescrição ou além da dose', type: 'choice', options: ['Sim', 'Não'] },
      { key: 'sub_opioides', label: 'Opioides / analgésicos sem prescrição', type: 'choice', options: ['Sim', 'Não'] },
      { key: 'sub_outras', label: 'Outras substâncias — quais?', type: 'text' },
      { key: 'sub_dx_dependencia', label: 'Já tive ou tenho diagnóstico de dependência química', type: 'choice', options: ['Sim', 'Não'] },
      { key: 'sub_tratamento', label: 'Já realizei tratamento para dependência química', type: 'choice', options: ['Sim', 'Não'] },
      { key: 'sub_relacao_cognitiva', label: 'Você percebe relação entre o uso de substâncias e as dificuldades cognitivas ou emocionais?', type: 'textarea' },

      // 10. Sintomas Emocionais e Personalidade
      { key: 'sec_10', label: '10. Sintomas Emocionais, Comportamentais e Personalidade', type: 'textarea' },
      { key: 'emo_sintomas_6m', label: 'Sintomas nos últimos 6 meses (marque os que se aplicam, separando por vírgula)', type: 'textarea', help: 'Ex.: Humor deprimido, Anedonia, Ansiedade, Ataques de pânico, Irritabilidade, Instabilidade de humor, Euforia, Impulsividade, Comportamentos de risco, Obsessões, Compulsões, Evitação por medo, Flashbacks, Hipervigilância, Despersonalização, Desrealização, Paranoia, Isolamento social, Automutilação, Pensamentos sobre morte/suicídio.' },
      { key: 'per_perfeccionista', label: 'Sou perfeccionista e me cobro excessivamente', type: 'scale', min: 1, max: 5 },
      { key: 'per_incerteza', label: 'Tenho dificuldade em tolerar incerteza e ambiguidade', type: 'scale', min: 1, max: 5 },
      { key: 'per_conflitos', label: 'Evito conflitos e tenho dificuldade em dizer não', type: 'scale', min: 1, max: 5 },
      { key: 'per_rigido', label: 'Tenho padrões rígidos de pensamento', type: 'scale', min: 1, max: 5 },
      { key: 'per_emocoes_intensas', label: 'Sinto que minhas emoções são mais intensas do que as da maioria', type: 'scale', min: 1, max: 5 },
      { key: 'per_alexitimia', label: 'Tenho dificuldade em identificar o que estou sentindo', type: 'scale', min: 1, max: 5 },
      { key: 'per_rel_instaveis', label: 'Minhas relações tendem a ser intensas e instáveis', type: 'scale', min: 1, max: 5 },
      { key: 'per_solitude', label: 'Preciso de muito tempo sozinho(a) para recuperar energia', type: 'scale', min: 1, max: 5 },
      { key: 'per_mudancas', label: 'Me adapto com dificuldade a mudanças de rotina', type: 'scale', min: 1, max: 5 },
      { key: 'per_sensorial', label: 'Tenho sensibilidade sensorial elevada', type: 'scale', min: 1, max: 5 },
      { key: 'per_autodescricao', label: 'Como você se descreveria como pessoa?', type: 'textarea' },
      { key: 'per_feedback', label: 'Já recebeu feedback de que tem algum padrão que causa problemas?', type: 'textarea' },

      // 11. Contexto Social e Afetivo
      { key: 'sec_11', label: '11. Contexto Social, Afetivo e Vida Sexual', type: 'textarea' },
      { key: 'social_atual', label: 'Como é sua vida social atualmente? Tem amigos próximos?', type: 'textarea' },
      { key: 'social_regras', label: 'Você tem ou já teve dificuldades para fazer amizades ou entender regras sociais?', type: 'textarea' },
      { key: 'afetivo_atual', label: 'Como é sua vida amorosa atualmente?', type: 'textarea' },
      { key: 'afetivo_padroes', label: 'Você percebe padrões repetitivos nos seus relacionamentos afetivos?', type: 'textarea' },
      { key: 'violencia', label: 'Já viveu situações de violência doméstica, assédio ou abuso?', type: 'textarea' },
      { key: 'limites', label: 'Como avalia sua capacidade de comunicar necessidades e estabelecer limites?', type: 'textarea' },

      // 12. Trabalho e Finanças
      { key: 'sec_12', label: '12. Trabalho, Funcionamento Ocupacional e Finanças', type: 'textarea' },
      { key: 'trab_trajetoria', label: 'Descreva sua trajetória profissional. Houve trocas frequentes ou dificuldades?', type: 'textarea' },
      { key: 'trab_dificuldades_atuais', label: 'Quais são as principais dificuldades no seu trabalho atual relacionadas às queixas cognitivas?', type: 'textarea' },
      { key: 'trab_licenca', label: 'Já tirou licença médica ou afastamento por razões de saúde mental ou neurológica?', type: 'textarea' },
      { key: 'trab_autonomia', label: 'Você consegue gerir sua rotina, finanças e obrigações de forma independente?', type: 'textarea' },
      { key: 'trab_legal', label: 'Há questões legais, trabalhistas ou previdenciárias que motivam esta avaliação?', type: 'textarea' },

      // 13. Família e Antecedentes
      { key: 'sec_13', label: '13. Família de Origem e Antecedentes Neuropsicológicos', type: 'textarea' },
      { key: 'fam_antecedentes', label: 'Antecedentes familiares (marque os que se aplicam, separando por vírgula)', type: 'textarea', help: 'Ex.: TDAH, Dislexia, TEA, Deficiência intelectual, Demência/Alzheimer precoce, Epilepsia, Parkinson, T. Bipolar, Esquizofrenia, Depressão/ansiedade grave, Dependência química, Síndromes genéticas, AVC precoce, Dificuldades escolares sem diagnóstico.' },
      { key: 'fam_detalhes', label: 'Descreva os antecedentes assinalados (grau de parentesco e informações relevantes)', type: 'textarea' },
      { key: 'fam_ambiente', label: 'Como foi o ambiente familiar em que cresceu?', type: 'textarea' },
      { key: 'fam_traumas', label: 'Houve traumas, perdas precoces, violência ou negligência na infância?', type: 'textarea' },
      { key: 'fam_escolaridade_pais', label: 'Qual é o nível de escolaridade dos seus pais/cuidadores?', type: 'text' },

      // 14. Identidade e Autopercepção
      { key: 'sec_14', label: '14. Identidade, Sentido de Vida e Autopercepção Cognitiva', type: 'textarea' },
      { key: 'id_antes', label: 'Como você descreveria seu funcionamento cognitivo ANTES das dificuldades atuais?', type: 'textarea' },
      { key: 'id_potencial', label: 'Você sente que seu desempenho intelectual está abaixo do seu potencial?', type: 'textarea' },
      { key: 'id_identidade', label: 'Há aspectos da sua identidade que têm gerado conflito, discriminação ou impacto emocional?', type: 'textarea' },
      { key: 'id_proposito', label: 'Você tem um senso de propósito e direção na vida?', type: 'textarea' },
      { key: 'id_recursos', label: 'O que você considera seus maiores recursos e pontos fortes?', type: 'textarea' },
      { key: 'id_medos', label: 'Quais são seus maiores medos em relação ao que a avaliação pode revelar?', type: 'textarea' },

      // 15. Escalas de Autopercepção
      { key: 'sec_15', label: '15. Escalas de Autopercepção Cognitiva e Funcional', type: 'textarea', help: 'Refira-se ao seu funcionamento nas últimas 4 semanas. 1 = muito prejudicada, 5 = excelente.' },
      { key: 'esc_concentracao', label: 'Capacidade de concentração durante trabalho ou estudo', type: 'scale', min: 1, max: 5 },
      { key: 'esc_memoria_recentes', label: 'Qualidade da memória para eventos recentes', type: 'scale', min: 1, max: 5 },
      { key: 'esc_organizacao', label: 'Organização e capacidade de planejamento', type: 'scale', min: 1, max: 5 },
      { key: 'esc_velocidade', label: 'Velocidade com que processo informações novas', type: 'scale', min: 1, max: 5 },
      { key: 'esc_controle_emo', label: 'Controle emocional no dia a dia', type: 'scale', min: 1, max: 5 },
      { key: 'esc_sono', label: 'Qualidade do sono nas últimas 4 semanas', type: 'scale', min: 1, max: 5 },
      { key: 'esc_energia', label: 'Nível de energia e disposição geral', type: 'scale', min: 1, max: 5 },
      { key: 'esc_social', label: 'Funcionamento social', type: 'scale', min: 1, max: 5 },
      { key: 'esc_profissional', label: 'Funcionamento profissional / acadêmico', type: 'scale', min: 1, max: 5 },
      { key: 'esc_autocuidado', label: 'Capacidade de autocuidado e vida independente', type: 'scale', min: 1, max: 5 },
      { key: 'esc_sofrimento', label: 'Nível de sofrimento causado pelas dificuldades cognitivas (1 = nenhum, 5 = insuportável)', type: 'scale', min: 1, max: 5 },
      { key: 'esc_motivacao', label: 'Motivação para realizar a avaliação e seguir recomendações', type: 'scale', min: 1, max: 5 },

      // 16. Expectativas
      { key: 'sec_16', label: '16. Expectativas e Questões Norteadoras', type: 'textarea' },
      { key: 'exp_perguntas', label: 'Quais são as principais perguntas que você quer que esta avaliação responda?', type: 'textarea' },
      { key: 'exp_entrega', label: 'O que você espera receber ao final (laudo, relatório, devolutiva)?', type: 'textarea' },
      { key: 'exp_finalidade', label: 'O laudo tem uma finalidade específica?', type: 'textarea' },
      { key: 'exp_algo_mais', label: 'Há algo na sua história que considera importante e que ainda não foi perguntado?', type: 'textarea' },

      // 17. Impressões Clínicas (uso do profissional)
      { key: 'sec_17', label: '17. Impressões Clínicas e Planejamento (uso exclusivo do profissional)', type: 'textarea', help: 'Preenchimento exclusivo do(a) neuropsicólogo(a) — não compartilhado com o paciente.' },
      { key: 'clin_hipoteses', label: 'Hipóteses diagnósticas iniciais (CID-11 / DSM-5)', type: 'textarea' },
      { key: 'clin_premorbido', label: 'Estimativa de nível cognitivo premórbido', type: 'text' },
      { key: 'clin_dominios_prioritarios', label: 'Domínios prioritários a investigar', type: 'textarea' },
      { key: 'clin_instrumentos', label: 'Instrumentos / baterias de avaliação selecionados', type: 'textarea' },
      { key: 'clin_adaptacoes', label: 'Adaptações necessárias (tempo, formato, acessibilidade)', type: 'textarea' },
      { key: 'clin_sessoes', label: 'Número de sessões planejadas e duração estimada', type: 'text' },
      { key: 'clin_documentos', label: 'Documentos e exames solicitados', type: 'textarea' },
      { key: 'clin_encaminhamentos', label: 'Encaminhamentos indicados', type: 'textarea' },
      { key: 'clin_risco', label: 'Fatores de risco identificados', type: 'textarea' },
      { key: 'clin_protecao', label: 'Fatores de proteção e recursos do avaliado', type: 'textarea' },
      { key: 'clin_observacoes', label: 'Observações sobre comportamento, rapport e esforço', type: 'textarea' },
    ],
  },
]

export const templateById = (id: string) => formTemplates.find((t) => t.id === id)
