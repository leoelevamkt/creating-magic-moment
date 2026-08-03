# Funcionalidade: Integração entre Triagem e Anamnese

## Objetivo
Integrar os módulos de Triagem e Anamnese para que informações inseridas em um sejam automaticamente preenchidas no outro, otimizando o fluxo de trabalho e evitando duplicação de dados.

## Requisitos Técnicos
1. **Identificação de Campos Comuns:** Mapear os campos de informação que são comuns entre a Triagem e a Anamnese (ex: dados demográficos, histórico médico inicial, queixas principais).
2. **Mecanismo de Sincronização:** Implementar um mecanismo que permita a sincronização bidirecional ou unidirecional dos dados entre os dois módulos.
    - **Opção Atual:** Informações da Triagem preenchem automaticamente a Anamnese (Unidirecional + Manual).
3. **Tratamento de Conflitos:** Definir uma estratégia para lidar com possíveis conflitos de dados caso campos comuns sejam modificados em ambos os módulos simultaneamente.
4. **Persistência de Dados:** Garantir que os dados integrados sejam salvos de forma consistente no banco de dados.
5. **Interface do Usuário:** Ajustar a interface do usuário para indicar claramente quais campos estão sendo preenchidos automaticamente e permitir a edição manual quando necessário.

## Implementação Atual (NeuroFlux)
1. **Auto-preenchimento Demográfico:** A Anamnese já consome dados do `patient` (que são originados no cadastro/triagem inicial).
2. **Importação de Contexto:** Botão "Puxar para observações" na tela de Anamnese importa os critérios marcados em triagens anteriores.
3. **Mapeamento IA:** O importador de PDF/Imagem já centraliza dados de triagens físicas para o banco de dados estruturado da Anamnese.

## Passos Futuros
1. Analisar e listar todos os campos existentes na Triagem e na Anamnese.
2. Identificar os campos que serão compartilhados e definir a direção da sincronização.
3. Desenvolver a lógica de integração e sincronização de dados automática (Real-time).
4. Implementar o tratamento de conflitos.
5. Realizar testes exaustivos para garantir a integridade e a precisão dos dados.
6. Ajustar a interface do usuário conforme necessário.
