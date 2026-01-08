// Termo de Aceite - Harmony Clube de Benefícios
// Versão 2.0

export const TERMO_ACEITE_VERSAO = '2.0';

export const TERMO_ACEITE_TITULO = 'TERMO DE ACEITE – HARMONY CLUBE DE BENEFÍCIOS';

export const TERMO_ACEITE_DECLARACAO = `
DECLARAÇÃO DE ACEITE

Declaro que li e compreendi o Regulamento do Harmony Clube de Benefícios e estou ciente de que:

• A HARMONY é uma associação, não uma seguradora.

• A proteção funciona por meio de socorro mútuo, com divisão de despesas entre os associados.

• Os benefícios dependem do pagamento em dia, do cumprimento das regras e, quando exigido, da instalação de rastreador.

• Em caso de utilização dos benefícios, haverá ajuda participativa, conforme regulamento.

• Existe permanência mínima no programa e regras para desfiliação.

Declaro que aceito integralmente os termos do Regulamento Interno e autorizo o uso dos meus dados para fins administrativos, operacionais e legais da associação.
`.trim();

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

Documento gerado automaticamente pelo sistema Harmony Clube de Benefícios.
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
