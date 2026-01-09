// Tipos base do sistema PontoFlex

export type TipoRegistroPonto = 'entrada' | 'saida_almoco' | 'retorno_almoco' | 'saida';

export const TIPO_REGISTRO_LABELS: Record<TipoRegistroPonto, string> = {
    entrada: 'Entrada',
    saida_almoco: 'Saída Almoço',
    retorno_almoco: 'Retorno Almoço',
    saida: 'Saída'
};

export const TIPO_REGISTRO_COLORS: Record<TipoRegistroPonto, string> = {
    entrada: 'bg-blue-500 hover:bg-blue-600',
    saida_almoco: 'bg-orange-500 hover:bg-orange-600',
    retorno_almoco: 'bg-green-500 hover:bg-green-600',
    saida: 'bg-red-500 hover:bg-red-600'
};

export const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const MESES_EXTENSO = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
];

// Entidades do banco
export interface Empresa {
    id: string;
    nome?: string;
    cnpj?: string;
    status: 'ativo' | 'pendente' | 'bloqueado' | 'suspenso';
    bloqueado_por_atraso: boolean;
    dados_onboarding_completos: boolean;
    setup_token?: string;
    email_comprador?: string;
    nome_comprador?: string;
    funcao_comprador?: string;
    segmento_atuacao?: string;
    endereco_completo?: string;
    cep?: string;
    created_at: string;
}

export interface Setor {
    id: string;
    nome: string;
    descricao: string;
    status: 'Ativo' | 'Inativo';
    empresa_id: string;
    created_at: string;
}

export interface Funcao {
    id: string;
    nome: string;
    descricao: string;
    setor_id: string;
    nivel: 1 | 2 | 3; // 1=Gestão, 2=Técnico, 3=Operacional
    permissoes: string[];
    empresa_id: string;
    setores?: { nome: string };
}

export interface JornadaTrabalho {
    id: string;
    nome: string;
    descricao?: string;
    pe: string; // Primeira Entrada
    ps: string; // Primeira Saída
    se?: string; // Segunda Entrada
    ss: string; // Segunda Saída
    carga_horaria_diaria: number;
    tem_intervalo: boolean;
    duracao_intervalo?: number;
    status: 'Ativo' | 'Inativo';
    empresa_id: string;
    created_at: string;
}

export interface Funcionario {
    id: string;
    nome: string;
    email: string;
    telefone?: string;
    cpf: string;
    ctps?: string;
    data_admissao?: string;
    setor_id?: string;
    funcao_id?: string;
    jornada_id?: string;
    user_id?: string;
    foto_url?: string;
    status: 'Ativo' | 'Inativo' | 'Férias';
    empresa_id: string;
    created_at: string;
    // Relacionamentos
    setores?: { nome: string };
    funcoes?: { nome: string };
    jornadas_trabalho?: JornadaTrabalho;
}

export interface FuncionarioBiometria {
    id: string;
    funcionario_id: string;
    status: 'Ativo' | 'Inativo' | 'pendente_validacao' | 'link_enviado';
    face_descriptors?: Float32Array[] | object;
    token?: string;
    token_expires_at?: string;
    empresa_id: string;
    created_at: string;
    funcionarios?: { nome: string; email: string };
}

export interface LocalTrabalho {
    id: string;
    nome: string;
    endereco: string;
    latitude: number;
    longitude: number;
    raio_metros: number;
    ativo: boolean;
    empresa_id: string;
    created_at: string;
}

export interface TipoAfastamento {
    id: string;
    nome: string;
    cor: string;
    dias_maximos?: number;
    remunerado: boolean;
    documentacao_obrigatoria: boolean;
    descricao?: string;
    status: 'Ativo' | 'Inativo';
    empresa_id: string;
}

export interface TipoJustificativa {
    id: string;
    nome: string;
    cor: string;
    documentacao_obrigatoria: boolean;
    descricao?: string;
    status: 'Ativo' | 'Inativo';
    empresa_id: string;
}

export interface Afastamento {
    id: string;
    funcionario_id: string;
    tipo_afastamento_id: string;
    data_inicio: string;
    data_fim: string;
    motivo: string;
    documento_url?: string;
    status: 'pendente' | 'aprovado' | 'rejeitado' | 'cancelado';
    solicitado_por_id?: string;
    aprovado_por_id?: string;
    data_aprovacao?: string;
    observacao_aprovacao?: string;
    empresa_id: string;
    created_at: string;
    // Relacionamentos
    funcionarios?: { nome: string; email: string };
    tipos_afastamentos?: { nome: string; cor: string };
}

export interface RegistroPonto {
    id: string;
    funcionario_id: string;
    data_registro: string;
    hora_registro: string;
    timestamp_registro: string;
    tipo_registro: TipoRegistroPonto;
    ip_address?: string;
    user_agent?: string;
    localizacao_gps?: { lat: number; lng: number };
    metodo_autenticacao: 'senha' | 'facial' | 'fallback_senha';
    confianca_facial?: number;
    observacoes?: string;
    empresa_id: string;
    created_at: string;
    // Relacionamentos
    funcionarios?: Funcionario;
}

export interface ComprovantePonto {
    id: string;
    funcionario_id: string;
    registro_ponto_id: string;
    pdf_url?: string;
    pdf_data?: string; // Base64
    empresa_id: string;
    created_at: string;
}

export interface AjustePonto {
    id: string;
    registro_ponto_id: string;
    hora_original: string;
    hora_ajustada: string;
    tipo_justificativa_id?: string;
    observacoes?: string;
    ajustado_por_id: string;
    empresa_id: string;
    created_at: string;
    // Relacionamentos
    funcionarios?: { nome: string };
    tipos_justificativas_ponto?: { nome: string };
}

// Tipo para o ponto diário consolidado (visualização no controle)
export interface PontoDiario {
    data: string;
    funcionario: Funcionario;
    pe?: RegistroPonto; // Primeira Entrada
    ps?: RegistroPonto; // Primeira Saída
    se?: RegistroPonto; // Segunda Entrada (Retorno Almoço)
    ss?: RegistroPonto; // Segunda Saída
    he_inicio?: string; // Hora Extra Início
    he_fim?: string; // Hora Extra Fim
    total_horas?: number;
    status: 'Completo' | 'Incompleto' | 'Afastado' | 'Falta';
}

// Tipo para geolocalização
export interface Geolocalizacao {
    lat: number;
    lng: number;
    accuracy?: number;
    address?: string;
    timestamp: string;
}

// Tipo para informações do dispositivo
export interface DeviceInfo {
    ip_address: string;
    user_agent: string;
    platform: string;
}
