# 🔍 Documento de Homologação - PontoFlex

## Informações Gerais

| Campo | Valor |
|-------|-------|
| **Data de Início** | 2026-01-14 |
| **Versão** | 1.0.0 |
| **Ambiente** | Produção (pontoflex.vercel.app) |
| **Empresa de Teste** | INFOTECH INFORMATICA LTDA |
| **Usuário Admin** | valmirjuniordata@gmail.com (Kaio) |
| **Usuário Developer** | valmirmoreirajunior@gmail.com |

---

## Legenda de Status

| Status | Descrição | Ação |
|--------|-----------|------|
| 📝 **DRAFT** | Aguardando teste | Executar o teste conforme descrito |
| ✅ **APPROVED** | Testado e aprovado | Nenhuma ação necessária |
| ❌ **FAILED** | Teste falhou | Descrever o problema encontrado |
| 🔄 **RETESTING** | Ajuste aplicado, retestando | Testar novamente após correção |
| ⏭️ **SKIPPED** | Ignorado (não aplicável) | Justificar motivo |

---

## Como Usar Este Documento

1. **Executar o teste** conforme descrito na coluna "Passos"
2. **Atualizar o status** para APPROVED, FAILED ou SKIPPED
3. **Se FAILED**: Descrever o problema na coluna "Observações"
4. **Após correção**: Alterar para RETESTING e testar novamente
5. **Após aprovação final**: Marcar como APPROVED

---

# FASE 1: CONFIGURAÇÃO INICIAL

## 1.1 Acesso ao Sistema

| ID | Teste | Status | Passos | Resultado Esperado | Observações |
|----|-------|--------|--------|-------------------|-------------|
| 1.1.1 | Login Developer | 📝 DRAFT | Acessar /login com valmirmoreirajunior@gmail.com | Dashboard carrega com badge DEVELOPER | |
| 1.1.2 | Login Admin | 📝 DRAFT | Acessar /login com valmirjuniordata@gmail.com | Dashboard carrega com dados da empresa | |
| 1.1.3 | Logout | 📝 DRAFT | Clicar em "Sair" no menu | Redireciona para /login | |
| 1.1.4 | Acesso não autorizado | 📝 DRAFT | Tentar acessar /admin/empresas como Admin | Mensagem de acesso restrito | |

---

## 1.2 Dashboard

| ID | Teste | Status | Passos | Resultado Esperado | Observações |
|----|-------|--------|--------|-------------------|-------------|
| 1.2.1 | Carregamento | 📝 DRAFT | Acessar / após login | Cards de resumo exibidos | |
| 1.2.2 | Dados vazios | 📝 DRAFT | Verificar cards com empresa zerada | Valores zerados sem erros | |
| 1.2.3 | Tema Dark/Light | 📝 DRAFT | Alternar tema no ícone sol/lua | Interface muda de cor | |

---

# FASE 2: GESTÃO ORGANIZACIONAL

## 2.1 Setores

| ID | Teste | Status | Passos | Resultado Esperado | Observações |
|----|-------|--------|--------|-------------------|-------------|
| 2.1.1 | Listar setores | 📝 DRAFT | Acessar /setores | Lista vazia ou com setores | |
| 2.1.2 | Criar setor | 📝 DRAFT | Clicar "Novo Setor", preencher nome e salvar | Setor aparece na lista | |
| 2.1.3 | Editar setor | 📝 DRAFT | Clicar no ícone de edição, alterar nome | Nome atualizado | |
| 2.1.4 | Excluir setor | 📝 DRAFT | Clicar no ícone de lixeira, confirmar | Setor removido | |
| 2.1.5 | Setor com função vinculada | 📝 DRAFT | Tentar excluir setor com função | Mensagem de erro ou bloqueio | |

---

## 2.2 Funções

| ID | Teste | Status | Passos | Resultado Esperado | Observações |
|----|-------|--------|--------|-------------------|-------------|
| 2.2.1 | Listar funções | 📝 DRAFT | Acessar /funcoes | Lista vazia ou com funções | |
| 2.2.2 | Criar função sem setor | 📝 DRAFT | Tentar criar função sem selecionar setor | Validação obriga seleção | |
| 2.2.3 | Criar função completa | 📝 DRAFT | Selecionar setor, nome, nível e permissões | Função criada com permissões | |
| 2.2.4 | Marcar todas permissões | 📝 DRAFT | Clicar "Marcar Todos" em um módulo | Todas checkboxes marcadas | |
| 2.2.5 | Editar permissões | 📝 DRAFT | Editar função e alterar permissões | Permissões atualizadas | |
| 2.2.6 | Excluir função | 📝 DRAFT | Clicar lixeira e confirmar | Função removida | |

---

## 2.3 Locais de Trabalho

| ID | Teste | Status | Passos | Resultado Esperado | Observações |
|----|-------|--------|--------|-------------------|-------------|
| 2.3.1 | Listar locais | 📝 DRAFT | Acessar /locais-trabalho | Lista vazia ou com locais | |
| 2.3.2 | Criar local | 📝 DRAFT | Clicar "Novo Local", preencher endereço | Mapa exibe marcador | |
| 2.3.3 | Definir raio | 📝 DRAFT | Ajustar raio de geofencing | Círculo no mapa atualiza | |
| 2.3.4 | Salvar local | 📝 DRAFT | Clicar salvar | Local aparece na lista | |

---

## 2.4 Dados da Empresa

| ID | Teste | Status | Passos | Resultado Esperado | Observações |
|----|-------|--------|--------|-------------------|-------------|
| 2.4.1 | Visualizar dados | 📝 DRAFT | Acessar /dados-empresa | CNPJ e razão social exibidos | |
| 2.4.2 | Editar dados | 📝 DRAFT | Alterar endereço e salvar | Dados atualizados | |

---

# FASE 3: GESTÃO DE PESSOAL

## 3.1 Colaboradores

| ID | Teste | Status | Passos | Resultado Esperado | Observações |
|----|-------|--------|--------|-------------------|-------------|
| 3.1.1 | Listar colaboradores | 📝 DRAFT | Acessar /colaboradores | Lista com funcionários | |
| 3.1.2 | Criar sem função | 📝 DRAFT | Tentar criar sem selecionar função | Validação obriga seleção | |
| 3.1.3 | Criar colaborador | 📝 DRAFT | Preencher nome, CPF, email, função, setor | Colaborador criado | |
| 3.1.4 | CPF inválido | 📝 DRAFT | Digitar CPF com dígitos errados | Validação de CPF | |
| 3.1.5 | Email duplicado | 📝 DRAFT | Usar email já cadastrado | Mensagem de erro | |
| 3.1.6 | Enviar acesso email | 📝 DRAFT | Clicar "Enviar Acesso" → Email | Email de onboarding enviado | |
| 3.1.7 | Enviar acesso WhatsApp | 📝 DRAFT | Clicar "Enviar Acesso" → WhatsApp | WhatsApp abre com mensagem | |
| 3.1.8 | Editar colaborador | 📝 DRAFT | Alterar dados e salvar | Dados atualizados | |
| 3.1.9 | Excluir colaborador | 📝 DRAFT | Clicar excluir e confirmar | Colaborador removido | |

---

## 3.2 Importação de Colaboradores

| ID | Teste | Status | Passos | Resultado Esperado | Observações |
|----|-------|--------|--------|-------------------|-------------|
| 3.2.1 | Acessar página | 📝 DRAFT | Acessar /importar-colaboradores | Tela de upload exibida | |
| 3.2.2 | Baixar modelo | 📝 DRAFT | Clicar "Baixar Modelo" | Excel modelo baixado | |
| 3.2.3 | Upload arquivo | 📝 DRAFT | Selecionar arquivo preenchido | Preview dos dados | |
| 3.2.4 | Validação de erros | 📝 DRAFT | Arquivo com CPF inválido | Erros destacados em vermelho | |
| 3.2.5 | Importar válidos | 📝 DRAFT | Confirmar importação | Colaboradores criados | |

---

## 3.3 Biometria

| ID | Teste | Status | Passos | Resultado Esperado | Observações |
|----|-------|--------|--------|-------------------|-------------|
| 3.3.1 | Listar biometrias | 📝 DRAFT | Acessar /biometria | Lista de status biométricos | |
| 3.3.2 | Enviar link biometria | 📝 DRAFT | Clicar "Enviar Link" | Email com link enviado | |
| 3.3.3 | Auto-cadastro | 📝 DRAFT | Acessar link como colaborador | Tela de captura facial | |
| 3.3.4 | Capturar rosto | 📝 DRAFT | Posicionar rosto e capturar | Biometria salva | |

---

# FASE 4: CONTROLE DE PONTO

## 4.1 Registrar Ponto

| ID | Teste | Status | Passos | Resultado Esperado | Observações |
|----|-------|--------|--------|-------------------|-------------|
| 4.1.1 | Acessar página | 📝 DRAFT | Acessar /registro-ponto | Tela de registro exibida | |
| 4.1.2 | Selecionar tipo | 📝 DRAFT | Clicar em "Entrada" | Botão destacado | |
| 4.1.3 | Registro com biometria | 📝 DRAFT | Posicionar rosto e confirmar | Ponto registrado com sucesso | |
| 4.1.4 | Registro com senha | 📝 DRAFT | Digitar senha e confirmar | Ponto registrado com sucesso | |
| 4.1.5 | Comprovante PDF | 📝 DRAFT | Clicar "Download PDF" após registro | PDF gerado e baixado | |
| 4.1.6 | Email comprovante | 📝 DRAFT | Verificar email após registro | Email com comprovante recebido | |
| 4.1.7 | Localização | 📝 DRAFT | Verificar marcador no mapa | Localização exibida | |

---

## 4.2 Controle de Ponto (Admin)

| ID | Teste | Status | Passos | Resultado Esperado | Observações |
|----|-------|--------|--------|-------------------|-------------|
| 4.2.1 | Listar registros | 📝 DRAFT | Acessar /controle-ponto | Lista de batidas | |
| 4.2.2 | Filtrar por data | 📝 DRAFT | Selecionar período | Lista filtrada | |
| 4.2.3 | Filtrar por colaborador | 📝 DRAFT | Selecionar funcionário | Apenas seus registros | |
| 4.2.4 | Inserir ponto manual | 📝 DRAFT | Clicar "Inserir Manual" | Novo registro criado | |
| 4.2.5 | Editar ponto | 📝 DRAFT | Alterar horário de registro | Registro atualizado | |
| 4.2.6 | Excluir ponto | 📝 DRAFT | Excluir registro | Registro removido | |

---

## 4.3 Escalas de Serviço

| ID | Teste | Status | Passos | Resultado Esperado | Observações |
|----|-------|--------|--------|-------------------|-------------|
| 4.3.1 | Listar escalas | 📝 DRAFT | Acessar /escalas | Lista de escalas | |
| 4.3.2 | Criar escala | 📝 DRAFT | Preencher nome e horários | Escala criada | |
| 4.3.3 | Definir folgas | 📝 DRAFT | Marcar dias de folga | Dias marcados como folga | |
| 4.3.4 | Vincular colaborador | 📝 DRAFT | Adicionar funcionário à escala | Vínculo criado | |
| 4.3.5 | Multi-escala | 📝 DRAFT | Vincular 2 escalas ao mesmo colaborador | Ambas ativas | |

---

## 4.4 Calendário Operacional

| ID | Teste | Status | Passos | Resultado Esperado | Observações |
|----|-------|--------|--------|-------------------|-------------|
| 4.4.1 | Visualizar mês | 📝 DRAFT | Acessar /calendario-visual | Calendário exibido | |
| 4.4.2 | Navegar meses | 📝 DRAFT | Clicar setas de navegação | Mês anterior/próximo | |
| 4.4.3 | Ver folgas | 📝 DRAFT | Verificar dias marcados | Folgas destacadas | |

---

## 4.5 Banco de Horas

| ID | Teste | Status | Passos | Resultado Esperado | Observações |
|----|-------|--------|--------|-------------------|-------------|
| 4.5.1 | Visualizar saldos | 📝 DRAFT | Acessar /banco-horas | Lista de saldos | |
| 4.5.2 | Filtrar colaborador | 📝 DRAFT | Selecionar funcionário | Saldo individual | |
| 4.5.3 | Extrato detalhado | 📝 DRAFT | Clicar "Ver Extrato" | Movimentações listadas | |
| 4.5.4 | Regras de horas | 📝 DRAFT | Acessar /regras-horas | Configurações de limites | |
| 4.5.5 | Editar limites | 📝 DRAFT | Alterar limite de banco | Limite atualizado | |

---

## 4.6 Fechamento de Mês

| ID | Teste | Status | Passos | Resultado Esperado | Observações |
|----|-------|--------|--------|-------------------|-------------|
| 4.6.1 | Acessar fechamento | 📝 DRAFT | Acessar /fechamento | Tela de consolidação | |
| 4.6.2 | Selecionar período | 📝 DRAFT | Escolher mês/ano | Dados carregados | |
| 4.6.3 | Visualizar resumo | 📝 DRAFT | Verificar totais | Horas, faltas, extras | |
| 4.6.4 | Exportar relatório | 📝 DRAFT | Clicar "Exportar" | PDF ou Excel gerado | |

---

# FASE 5: AFASTAMENTOS E FÉRIAS

## 5.1 Afastamentos

| ID | Teste | Status | Passos | Resultado Esperado | Observações |
|----|-------|--------|--------|-------------------|-------------|
| 5.1.1 | Listar afastamentos | 📝 DRAFT | Acessar /afastamentos | Lista de afastamentos | |
| 5.1.2 | Criar afastamento | 📝 DRAFT | Clicar "Novo", preencher dados | Afastamento criado | |
| 5.1.3 | Tipos disponíveis | 📝 DRAFT | Abrir seletor de tipos | Férias, Atestado, Licença | |
| 5.1.4 | Período válido | 📝 DRAFT | Data fim antes de início | Validação de erro | |

---

## 5.2 Gestão de Férias

| ID | Teste | Status | Passos | Resultado Esperado | Observações |
|----|-------|--------|--------|-------------------|-------------|
| 5.2.1 | Acessar página | 📝 DRAFT | Acessar /ferias | Calendário de férias | |
| 5.2.2 | Visualizar escalados | 📝 DRAFT | Aba "Escalados" | Lista de férias programadas | |
| 5.2.3 | Agendar férias | 📝 DRAFT | Clicar "Novo Período" | Modal de agendamento | |
| 5.2.4 | Aviso CLT 30 dias | 📝 DRAFT | Agendar menos de 30 dias | Alerta de conformidade | |
| 5.2.5 | Confirmar mesmo assim | 📝 DRAFT | Aceitar aviso e continuar | Férias agendadas | |
| 5.2.6 | Email de férias | 📝 DRAFT | Verificar email após agendamento | Email recebido | |
| 5.2.7 | Tab Saldos | 📝 DRAFT | Aba "Saldos" | Dias acumulados/usados | |
| 5.2.8 | Tab Períodos | 📝 DRAFT | Aba "Períodos Aquisitivos" | Lista de períodos | |

---

# FASE 6: JUSTIFICATIVAS

## 6.1 Tipos de Justificativa

| ID | Teste | Status | Passos | Resultado Esperado | Observações |
|----|-------|--------|--------|-------------------|-------------|
| 6.1.1 | Listar tipos | 📝 DRAFT | Acessar /tipos-justificativa | Lista de tipos | |
| 6.1.2 | Criar tipo | 📝 DRAFT | Clicar "Novo Tipo" | Tipo criado | |
| 6.1.3 | Editar tipo | 📝 DRAFT | Alterar nome/descrição | Tipo atualizado | |

---

## 6.2 Minhas Solicitações (Colaborador)

| ID | Teste | Status | Passos | Resultado Esperado | Observações |
|----|-------|--------|--------|-------------------|-------------|
| 6.2.1 | Listar solicitações | 📝 DRAFT | Acessar /minhas-solicitacoes | Lista pessoal | |
| 6.2.2 | Nova solicitação | 📝 DRAFT | Clicar "Nova Solicitação" | Modal de criação | |
| 6.2.3 | Preencher dados | 📝 DRAFT | Data, tipo, justificativa | Solicitação enviada | |
| 6.2.4 | Ver status | 📝 DRAFT | Verificar status "Pendente" | Status exibido | |

---

## 6.3 Aprovação (Admin)

| ID | Teste | Status | Passos | Resultado Esperado | Observações |
|----|-------|--------|--------|-------------------|-------------|
| 6.3.1 | Listar pendentes | 📝 DRAFT | Acessar /aprovacao-justificativas | Lista de pendentes | |
| 6.3.2 | Aprovar solicitação | 📝 DRAFT | Clicar "Aprovar" | Status muda para Aprovado | |
| 6.3.3 | Rejeitar solicitação | 📝 DRAFT | Clicar "Rejeitar" | Status muda para Rejeitado | |
| 6.3.4 | Email aprovação | 📝 DRAFT | Verificar email do colaborador | Email de aprovação | |
| 6.3.5 | Email rejeição | 📝 DRAFT | Verificar email do colaborador | Email de rejeição | |

---

# FASE 7: RELATÓRIOS

## 7.1 Central de Relatórios

| ID | Teste | Status | Passos | Resultado Esperado | Observações |
|----|-------|--------|--------|-------------------|-------------|
| 7.1.1 | Acessar central | 📝 DRAFT | Acessar /relatorios | Menu de relatórios | |
| 7.1.2 | Relatório consolidado | 📝 DRAFT | Clicar "Consolidado" | Dados agregados | |
| 7.1.3 | Relatório funcionários | 📝 DRAFT | Acessar /relatorios/funcionarios | Lista de colaboradores | |

---

## 7.2 Monitoramento Live

| ID | Teste | Status | Passos | Resultado Esperado | Observações |
|----|-------|--------|--------|-------------------|-------------|
| 7.2.1 | Acessar live | 📝 DRAFT | Acessar /status-live | Painel em tempo real | |
| 7.2.2 | Atualização automática | 📝 DRAFT | Aguardar refresh | Dados atualizados | |
| 7.2.3 | Status colaboradores | 📝 DRAFT | Verificar quem entrou/saiu | Status corretos | |

---

## 7.3 Inconsistências

| ID | Teste | Status | Passos | Resultado Esperado | Observações |
|----|-------|--------|--------|-------------------|-------------|
| 7.3.1 | Listar inconsistências | 📝 DRAFT | Acessar /inconsistencias | Lista de irregularidades | |
| 7.3.2 | Filtrar por tipo | 📝 DRAFT | Selecionar "Faltas" | Apenas faltas | |
| 7.3.3 | Resolver inconsistência | 📝 DRAFT | Marcar como resolvido | Status atualizado | |

---

## 7.4 Exportação Folha

| ID | Teste | Status | Passos | Resultado Esperado | Observações |
|----|-------|--------|--------|-------------------|-------------|
| 7.4.1 | Acessar exportação | 📝 DRAFT | Acessar /exportacao-folha | Tela de exportação | |
| 7.4.2 | Selecionar período | 📝 DRAFT | Escolher mês/ano | Dados carregados | |
| 7.4.3 | Exportar arquivo | 📝 DRAFT | Clicar "Exportar" | Arquivo gerado | |

---

# RESUMO DE PROGRESSO

| Fase | Total | Draft | Approved | Failed | Progresso |
|------|-------|-------|----------|--------|-----------|
| 1. Configuração | 7 | 7 | 0 | 0 | 0% |
| 2. Organizacional | 15 | 15 | 0 | 0 | 0% |
| 3. Pessoal | 17 | 17 | 0 | 0 | 0% |
| 4. Ponto | 26 | 26 | 0 | 0 | 0% |
| 5. Afastamentos | 12 | 12 | 0 | 0 | 0% |
| 6. Justificativas | 11 | 11 | 0 | 0 | 0% |
| 7. Relatórios | 11 | 11 | 0 | 0 | 0% |
| **TOTAL** | **99** | **99** | **0** | **0** | **0%** |

---

# HISTÓRICO DE ALTERAÇÕES

| Data | Versão | Autor | Descrição |
|------|--------|-------|-----------|
| 2026-01-14 | 1.0.0 | Gemini | Criação do documento |
| | | | |

---

# PRÓXIMAS FASES (Após Homologação Web)

1. **Mobile (Capacitor)**: App Android/iOS
2. **Design & Landing Page**: Registro rápido, download APK
3. **Integração Final**: Testes de carga e segurança
