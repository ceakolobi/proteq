import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import logoHarmony from '@/assets/logo-harmony-colorida.png';

// Política de Privacidade — página pública estática (sem banco, sem lógica).
// Todo o texto vive neste arquivo para facilitar edição posterior.
// Última atualização: ajuste esta data sempre que revisar o conteúdo.
const ULTIMA_ATUALIZACAO = '23 de julho de 2026';

// Contato do Encarregado/DPO — ajuste para o canal oficial.
const CONTATO_DPO = 'markahagro@gmail.com';

export default function Privacidade() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50">
        <div className="container mx-auto max-w-3xl px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoHarmony} alt="Harmony" className="h-9 object-contain" />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao site
          </Link>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-bold mb-2">Política de Privacidade</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Última atualização: {ULTIMA_ATUALIZACAO}
        </p>

        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">1. Controlador dos dados</h2>
            <p>
              O tratamento dos dados pessoais coletados neste site é realizado pela{' '}
              <strong>Harmony Clube de Benefícios</strong>, associação de proteção veicular,
              inscrita no CNPJ sob o nº 39.583.767/0001-26, na condição de controladora dos dados. Para dúvidas, solicitações ou exercício de
              direitos relativos aos seus dados, entre em contato com o nosso Encarregado pelo
              Tratamento de Dados (DPO) pelo e-mail{' '}
              <a href={`mailto:${CONTATO_DPO}`} className="text-primary font-medium hover:underline">
                {CONTATO_DPO}
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">2. Dados que coletamos</h2>
            <p>
              No formulário de cotação deste site coletamos apenas os dados que você informa
              voluntariamente:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Nome completo;</li>
              <li>Telefone / WhatsApp;</li>
              <li>E-mail;</li>
              <li>Cidade e estado;</li>
              <li>
                Dados do veículo informados para a cotação (como tipo, marca, modelo, ano, placa e
                valor de referência).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">3. Finalidade do uso</h2>
            <p>
              Utilizamos esses dados para <strong>elaborar a cotação de proteção veicular</strong>{' '}
              que você solicitou e para <strong>entrar em contato</strong> a respeito dessa cotação,
              esclarecendo dúvidas e apresentando as condições de participação como associado.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">4. Base legal</h2>
            <p>
              O tratamento tem como fundamento o seu <strong>consentimento</strong>, manifestado ao
              marcar a opção de aceite no formulário, e a <strong>execução de procedimentos
              preliminares a pedido do titular</strong> — ou seja, os passos necessários para
              preparar a cotação que você mesmo requisitou. Os dados de navegação e origem de
              campanha (UTM) são tratados com base no consentimento e no legítimo interesse em medir
              a eficácia de nossas comunicações.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">5. Compartilhamento</h2>
            <p>
              Seus dados podem ser compartilhados com os consultores da associação responsáveis
              pelo atendimento da sua cotação e com prestadores de serviço que atuam como operadores
              em nosso nome, exclusivamente para viabilizar os serviços solicitados:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Infraestrutura de hospedagem e banco de dados;</li>
              <li>Processamento de pagamentos e cobranças;</li>
              <li>Plataformas de comunicação e mensageria, para envio de cotações e atendimento;</li>
              <li>
                Ferramentas de inteligência artificial, utilizadas para atendimento automatizado e
                leitura de documentos enviados por você;
              </li>
              <li>
                Plataformas de publicidade e análise, que recebem dados de navegação e origem de
                campanha.
              </li>
            </ul>
            <p className="mt-2">
              Não vendemos, alugamos nem cedemos seus dados pessoais a terceiros para fins comerciais
              próprios desses terceiros.
            </p>
            <p className="mt-2">
              Transferência internacional: alguns desses operadores mantêm servidores fora do Brasil.
              Nesses casos, a transferência ocorre nos termos dos arts. 33 e seguintes da LGPD,
              mediante cláusulas contratuais que exigem do operador nível de proteção compatível com
              a legislação brasileira.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">6. Prazo de retenção</h2>
            <p>
              Mantemos seus dados pelo tempo necessário às finalidades desta Política:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>
                Cotações e leads não convertidos: até 24 meses a partir do último contato, salvo
                revogação anterior do consentimento;
              </li>
              <li>
                Associados: durante toda a vigência do vínculo e por até 5 anos após o encerramento,
                para cumprimento de obrigações legais, contábeis e de eventual defesa em processo;
              </li>
              <li>Dados de navegação e origem de campanha: até 12 meses.</li>
            </ul>
            <p className="mt-2">
              Encerrados esses prazos, os dados são eliminados ou anonimizados, ressalvadas as
              hipóteses de guarda obrigatória previstas em lei.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">7. Seus direitos</h2>
            <p>
              Nos termos da Lei Geral de Proteção de Dados (LGPD), você pode a qualquer momento
              solicitar:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>confirmação da existência de tratamento;</li>
              <li>acesso aos dados;</li>
              <li>correção de dados incompletos, inexatos ou desatualizados;</li>
              <li>
                anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados
                em desconformidade com a lei;
              </li>
              <li>portabilidade dos dados a outro fornecedor, mediante requisição expressa;</li>
              <li>eliminação dos dados tratados com base no consentimento;</li>
              <li>
                informação sobre as entidades públicas e privadas com as quais compartilhamos seus
                dados;
              </li>
              <li>
                informação sobre a possibilidade de não fornecer consentimento e sobre as
                consequências da negativa;
              </li>
              <li>revogação do consentimento a qualquer momento;</li>
              <li>
                revisão de decisões tomadas unicamente com base em tratamento automatizado.
              </li>
            </ul>
            <p className="mt-2">
              Para exercer qualquer desses direitos, basta enviar uma solicitação para{' '}
              <a href={`mailto:${CONTATO_DPO}`} className="text-primary font-medium hover:underline">
                {CONTATO_DPO}
              </a>
              , que será respondida no prazo legal aplicável.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">8. Cookies e parâmetros de origem (UTM)</h2>
            <p>
              Podemos registrar parâmetros de campanha (UTM) presentes no link de acesso e utilizar
              cookies para <strong>identificar a origem do seu contato</strong> e entender por qual
              canal você chegou até nós. Essas informações ajudam a melhorar nossa comunicação e não
              são usadas para identificá-lo individualmente além do necessário ao atendimento da
              cotação.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">9. Atualizações desta política</h2>
            <p>
              Esta Política de Privacidade pode ser revisada periodicamente. A data da última
              revisão está indicada no topo desta página.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
