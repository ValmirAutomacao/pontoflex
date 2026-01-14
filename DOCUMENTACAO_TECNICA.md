# 📋 Documentação Técnica do Sistema PontoFlex

## Índice
1. [Visão Geral](#visão-geral)
2. [Arquitetura de Dados](#arquitetura-de-dados)
3. [Fluxo de Dependências](#fluxo-de-dependências)
4. [Módulos do Sistema](#módulos-do-sistema)
5. [Fluxo de Onboarding](#fluxo-de-onboarding)
6. [Permissões e Acessos](#permissões-e-acessos)
7. [Integrações Externas](#integrações-externas)

---

## Visão Geral

O **PontoFlex** é um sistema SaaS de controle de ponto eletrônico com as seguintes características:
- **Multi-tenant**: Cada empresa tem dados isolados
- **Controle de acesso por função**: Permissões granulares por cargo
- **Biometria facial**: Autenticação via reconhecimento facial
- **Geolocalização**: Validação de local de trabalho
- **Conformidade CLT**: Regras de banco de horas, férias e afastamentos

---

## Arquitetura de Dados

### Diagrama de Entidades Principais

```
┌─────────────────┐
│    EMPRESAS     │ ← Tenant principal
└────────┬────────┘
         │
    ┌────┴────┬────────────┬────────────┬────────────┐
    ▼         ▼            ▼            ▼            ▼
┌────────┐ ┌────────┐ ┌──────────┐ ┌─────────────┐ ┌─────────────────┐
│SETORES │ │JORNADAS│ │  LOCAIS  │ │TIPOS_AFASTA.│ │TIPOS_JUSTIFICAT.│
└───┬────┘ └───┬────┘ │ TRABALHO │ └─────────────┘ └─────────────────┘
    │          │      └──────────┘
    ▼          │
┌────────┐     │
│FUNÇÕES │     │
└───┬────┘     │
    │          │
    └────┬─────┘
         ▼
  ┌──────────────┐
  │ FUNCIONÁRIOS │ ← Colaboradores
  └──────┬───────┘
         │
    ┌────┴────┬────────────┬────────────┬────────────┐
    ▼         ▼            ▼            ▼            ▼
┌────────┐ ┌────────┐ ┌──────────┐ ┌────────────┐ ┌──────────────┐
│REGISTROS│ │BIOMETRIA│ │AFASTAMENT│ │BANCO_HORAS │ │SOLICITACOES  │
│ PONTO  │ │        │ │          │ │            │ │JUSTIFICATIVA │
└────────┘ └────────┘ └──────────┘ └────────────┘ └──────────────┘
```

### Tabelas Principais

| Tabela | Descrição | Dependências |
|--------|-----------|--------------|
| `empresas` | Tenant principal | Nenhuma |
| `setores` | Departamentos | `empresas` |
| `funcoes` | Cargos com permissões | `setores`, `empresas` |
| `jornadas` | Horários de trabalho | `empresas` |
| `funcionarios` | Colaboradores | `funcoes`, `setores`, `empresas` |
| `locais_trabalho` | Geofencing | `empresas` |
| `escalas` | Turnos de trabalho | `empresas` |
| `funcionarios_escalas` | Vínculo colaborador-escala | `funcionarios`, `escalas` |
| `registros_ponto` | Marcações | `funcionarios`, `empresas` |
| `funcionarios_biometria` | Dados faciais | `funcionarios` |
| `afastamentos` | Férias, atestados | `funcionarios`, `tipos_afastamentos` |
| `banco_horas` | Saldos de compensação | `funcionarios`, `empresas` |
| `solicitacoes_justificativa` | Pedidos de ajuste | `funcionarios`, `tipos_justificativa` |

---

## Fluxo de Dependências

### Ordem Obrigatória de Criação

```
1. EMPRESA (criada no onboarding)
      ↓
2. SETORES (mínimo 1 para criar funções)
      ↓
3. FUNÇÕES (mínimo 1 para criar colaboradores)
      ↓
4. JORNADAS (opcional, mas necessário para escalas)
      ↓
5. ESCALAS (opcional, define turnos de trabalho)
      ↓
6. LOCAIS DE TRABALHO (opcional, para geofencing)
      ↓
7. COLABORADORES (dependem de função e setor)
      ↓
8. REGISTRO DE PONTO (colaborador precisa estar ativo)
```

### Regras de Dependência

| Ação | Pré-requisitos |
|------|----------------|
| Criar Setor | Empresa ativa |
| Criar Função | Setor existente |
| Criar Jornada | Empresa ativa |
| Criar Escala | Empresa ativa, Jornada (opcional) |
| Criar Colaborador | Função + Setor obrigatórios |
| Vincular Escala ao Colaborador | Colaborador + Escala existentes |
| Registrar Ponto | Colaborador ativo + Onboarding completo |
| Aprovar Justificativa | Registro de ponto + Tipo de justificativa |
| Agendar Férias | Colaborador + Tipo de afastamento "Férias" |

---

## Módulos do Sistema

### 1. Gestão Organizacional
- **Dados da Empresa**: Configurações gerais e CNPJ
- **Setores**: Departamentos da empresa
- **Funções**: Cargos com níveis de acesso e permissões
- **Locais de Trabalho**: Pontos de geofencing

### 2. Gestão de Pessoal
- **Colaboradores**: Cadastro completo de funcionários
- **Importação Excel**: Upload em massa de colaboradores
- **Biometria**: Cadastro facial para autenticação

### 3. Controle de Ponto
- **Registro de Ponto**: Marcação com biometria/senha
- **Controle de Ponto**: Validação e ajuste de batidas
- **Calendário Operacional**: Visualização mensal de folgas
- **Escalas de Serviço**: Configuração de turnos
- **Banco de Horas**: Saldos e compensações
- **Fechamento de Mês**: Consolidação mensal

### 4. Afastamentos e Férias
- **Afastamentos**: Atestados, licenças, faltas
- **Gestão de Férias**: Agendamento com regras CLT

### 5. Justificativas
- **Minhas Solicitações**: Pedidos do colaborador
- **Aprovação**: Gestão pelo administrador
- **Tipos de Justificativa**: Configuração de motivos

### 6. Relatórios
- **Monitoramento Live**: Presença em tempo real
- **Central de Relatórios**: Consolidados e analíticos
- **Inconsistências**: Faltas e irregularidades
- **Exportação Folha**: Integração com sistemas de RH

---

## Fluxo de Onboarding

### Empresa Nova (via Super Admin)

```
1. Super Admin cria empresa no painel
      ↓
2. Sistema cria usuário admin com senha temporária
      ↓
3. Email de onboarding enviado ao admin
      ↓
4. Admin acessa link e configura senha
      ↓
5. Admin configura: Setores → Funções → Jornadas
      ↓
6. Admin cadastra Colaboradores
      ↓
7. Email de onboarding enviado ao colaborador
      ↓
8. Colaborador acessa link e configura senha + biometria
      ↓
9. Colaborador pode registrar pontos
```

### Colaborador Novo (via Admin)

```
1. Admin cadastra colaborador (nome, email, CPF)
      ↓
2. Sistema gera setup_token válido por 7 dias
      ↓
3. Admin escolhe: Enviar por Email ou WhatsApp
      ↓
4. Colaborador acessa link de setup
      ↓
5. Colaborador define senha
      ↓
6. Colaborador cadastra biometria facial (opcional)
      ↓
7. Colaborador está ativo para registrar ponto
```

---

## Permissões e Acessos

### Níveis Hierárquicos

| Nível | Role | Descrição |
|-------|------|-----------|
| 0 | `developer` | Acesso total, todas as empresas |
| 1 | `admin` | Acesso total à própria empresa |
| 2 | `manager` | Acesso gerencial (aprovar justificativas) |
| 3 | `employee` | Acesso operacional (registro de ponto) |

### Módulos de Permissão

| Chave | Módulo | Páginas Controladas |
|-------|--------|---------------------|
| `modulo_dashboard` | Dashboard | `/` |
| `modulo_setores` | Setores | `/setores`, `/dados-empresa` |
| `modulo_funcoes` | Funções | `/funcoes` |
| `modulo_colaboradores` | Pessoal | `/colaboradores`, `/importar-colaboradores` |
| `modulo_biometria` | Biometria | `/biometria` |
| `modulo_registro_ponto` | Registro | `/registro-ponto`, `/minhas-solicitacoes` |
| `modulo_ponto` | Controle | `/controle-ponto`, `/escalas`, `/fechamento` |
| `modulo_status_live` | Live | `/status-live` |
| `modulo_banco_horas` | Banco | `/banco-horas`, `/regras-horas` |
| `modulo_afastamentos` | Afastamentos | `/afastamentos`, `/ferias` |
| `modulo_relatorios` | Relatórios | `/relatorios`, `/inconsistencias` |
| `modulo_justificativas` | Config | `/tipos-justificativa` |
| `modulo_tipos_afastamento` | Config | `/tipos-afastamento` |

---

## Integrações Externas

### Resend (Email)

| Tipo | Descrição | Trigger |
|------|-----------|---------|
| `EMPLOYEE_ONBOARDING` | Boas-vindas ao colaborador | Cadastro de funcionário |
| `COMPANY_ONBOARDING` | Setup de empresa | Criação de empresa |
| `PONTO_RECEIPT` | Comprovante de ponto | Registro de ponto |
| `VACATION_SCHEDULED` | Férias agendadas | Agendamento de férias |
| `JUSTIFICATION_APPROVED` | Justificativa aprovada | Aprovação de solicitação |
| `JUSTIFICATION_REJECTED` | Justificativa rejeitada | Rejeição de solicitação |
| `MONTHLY_CLOSING` | Resumo mensal | Fechamento de mês |
| `BANK_HOURS_ALERT` | Alerta de saldo | Saldo crítico |

### Supabase

- **Auth**: Autenticação de usuários
- **Database**: PostgreSQL com RLS
- **Storage**: Armazenamento de comprovantes
- **Edge Functions**: Envio de emails

---

## Observações Importantes

1. **Dados Sensíveis**: CPF, PIS/NIS e biometria são protegidos por RLS
2. **Audit Trail**: Todas as ações de onboarding são logadas
3. **Conformidade CLT**: 
   - Férias: Aviso prévio de 30 dias obrigatório
   - Banco de horas: Limites configuráveis
   - Registro de ponto: Comprovante obrigatório
4. **Multi-escala**: Colaborador pode ter múltiplas escalas ativas
5. **Geofencing**: Validação opcional de localização no ponto
