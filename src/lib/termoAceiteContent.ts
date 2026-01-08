// Termo de Aceite - Harmony Clube de Benefícios
// Versão 1.0

export const TERMO_ACEITE_VERSAO = '1.0';

export const TERMO_ACEITE_TITULO = 'TERMO DE ACEITE – HARMONY CLUBE DE BENEFÍCIOS';

export const TERMO_ACEITE_CONTEUDO = `
TERMO DE ACEITE E CONDIÇÕES DE PARTICIPAÇÃO
HARMONY CLUBE DE BENEFÍCIOS

1. OBJETO
O presente Termo estabelece as condições de participação no HARMONY CLUBE DE BENEFÍCIOS, doravante denominado "Clube", que oferece serviços de proteção veicular e benefícios aos seus associados.

2. ACEITE E ADESÃO
2.1. Ao aceitar este termo, o ASSOCIADO declara estar ciente e de acordo com todas as condições aqui estabelecidas.
2.2. O aceite digital tem a mesma validade jurídica de um contrato físico assinado, conforme Lei nº 14.063/2020 e Medida Provisória nº 2.200-2/2001.

3. COBERTURA E PROTEÇÃO
3.1. O Clube oferece proteção veicular nos termos do plano contratado.
3.2. A proteção será ativada após aprovação da vistoria do veículo e pagamento da primeira mensalidade.
3.3. Os detalhes da cobertura serão especificados no Regulamento Interno do Clube.

4. OBRIGAÇÕES DO ASSOCIADO
4.1. Manter os dados cadastrais atualizados.
4.2. Pagar a mensalidade na data de vencimento acordada.
4.3. Comunicar imediatamente qualquer sinistro ou ocorrência.
4.4. Manter o veículo em boas condições de uso.
4.5. Fornecer documentos e informações verídicas.

5. MENSALIDADE E PAGAMENTOS
5.1. O valor da mensalidade será calculado de acordo com o valor FIPE do veículo.
5.2. O dia de vencimento escolhido no cadastro será respeitado.
5.3. O atraso no pagamento pode gerar suspensão da proteção.

6. VISTORIA
6.1. O veículo passará por vistoria prévia para ingresso no Clube.
6.2. A vistoria poderá ser presencial ou remota, conforme determinação do Clube.
6.3. A aprovação na vistoria é condição para ativação da proteção.

7. RESCISÃO
7.1. O associado pode solicitar desligamento a qualquer momento.
7.2. A rescisão se efetivará ao final do período já pago.

8. PROTEÇÃO DE DADOS
8.1. Os dados pessoais serão tratados conforme a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
8.2. O associado autoriza o uso de seus dados para fins de gestão do Clube e comunicações relacionadas.

9. DISPOSIÇÕES FINAIS
9.1. Este termo é regido pelas leis da República Federativa do Brasil.
9.2. Eventuais dúvidas serão esclarecidas pelo canal de atendimento do Clube.
9.3. Ao assinar digitalmente, o associado confirma ter lido e compreendido integralmente este Termo.

---

Ao aceitar este termo, declaro que:
✓ Li e compreendi todas as condições acima.
✓ Concordo em participar do Harmony Clube de Benefícios.
✓ Autorizo o tratamento dos meus dados pessoais conforme descrito.
✓ Reconheço que esta assinatura digital tem validade jurídica.
`;

export function gerarTextoTermoCompleto(
  nomeAssociado: string,
  cpf: string,
  placa: string,
  dataHora: string,
  ip?: string
): string {
  return `
${TERMO_ACEITE_TITULO}

IDENTIFICAÇÃO DO ASSOCIADO:
Nome: ${nomeAssociado}
CPF: ${cpf}
Placa do Veículo: ${placa}
Data e Hora do Aceite: ${dataHora}
${ip ? `IP do Dispositivo: ${ip}` : ''}

${TERMO_ACEITE_CONTEUDO}

---
Documento gerado automaticamente pelo sistema Harmony Clube de Benefícios.
Este documento possui validade jurídica conforme Lei nº 14.063/2020.
  `.trim();
}
