// Termo de Aceite - Proteq
// Versão 2.0

export const TERMO_ACEITE_VERSAO = '2.1';

export const TERMO_ACEITE_TITULO = 'TERMO DE ACEITE – PROTEQ';

export const TERMO_ACEITE_DECLARACAO = `
DECLARAÇÃO DE ACEITE

Declaro que li e concordo com o Regulamento da PROTEQ,
ciente de que se trata de uma associação de proteção veicular baseada no
sistema de socorro mútuo, não caracterizada como seguradora, conforme
legislação vigente.

Estou ciente de que os benefícios dependem do cumprimento das regras do
regulamento e da regularidade das contribuições.
`.trim();

// Texto curto para o app (informativo)
export const PROTEQ_APP_TEXTO_CURTO = `A PROTEQ é uma associação de proteção veicular baseada no socorro mútuo entre associados.

Não se trata de seguro. Os benefícios dependem do cumprimento do regulamento e da regularidade financeira.

Associação cadastrada junto à SUSEP.`.trim();

export interface DadosTermoAceite {
  nomeAssociado: string;
  cpfCnpj: string;
  telefone: string;
  email: string;
  placa: string;
  marcaModelo: string;
  ano: string | number;
  dataHoraAceite: string;
  ip?: string;
}

export function gerarConteudoTermoPDF(dados: DadosTermoAceite): string {
  return `
${TERMO_ACEITE_TITULO}

═══════════════════════════════════════════════════

DADOS DO ASSOCIADO

Nome: ${dados.nomeAssociado}
CPF/CNPJ: ${dados.cpfCnpj}
Telefone: ${dados.telefone}
E-mail: ${dados.email}

═══════════════════════════════════════════════════

DADOS DO VEÍCULO

Placa: ${dados.placa}
Marca/Modelo: ${dados.marcaModelo}
Ano: ${dados.ano}

═══════════════════════════════════════════════════

${TERMO_ACEITE_DECLARACAO}

═══════════════════════════════════════════════════

ASSINATURA DIGITAL

Nome: ${dados.nomeAssociado}
Data: ${dados.dataHoraAceite}
IP do dispositivo: ${dados.ip || 'Não disponível'}

Assinatura eletrônica válida conforme legislação vigente (Lei nº 14.063/2020).

═══════════════════════════════════════════════════

Documento gerado automaticamente pelo sistema Proteq.
  `.trim();
}

// Versão legada para compatibilidade
export const TERMO_ACEITE_CONTEUDO = TERMO_ACEITE_DECLARACAO;

export function gerarTextoTermoCompleto(
  nomeAssociado: string,
  cpf: string,
  placa: string,
  dataHora: string,
  ip?: string
): string {
  return gerarConteudoTermoPDF({
    nomeAssociado,
    cpfCnpj: cpf,
    telefone: '',
    email: '',
    placa,
    marcaModelo: '',
    ano: '',
    dataHoraAceite: dataHora,
    ip
  });
}
