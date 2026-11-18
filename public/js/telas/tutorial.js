// Tutorial: passo a passo por perfil, com progresso salvo no navegador e perguntas frequentes.
import { esc, $, $$ } from '../ui.js';
import { estado, pode } from '../estado.js';
import { icone, comIcones } from '../icones.js';

// Cada passo: id único, ícone, título, itens (HTML simples) e, opcionalmente, um atalho para a tela.
const TRILHAS = {
  professor: {
    titulo: 'Professor(a)',
    cor: 'verde',
    resumo: 'Você cadastra questões com gabarito e monta as provas das suas turmas.',
    passos: [
      {
        id: 'p-painel', icone: 'casa', titulo: 'Conheça o painel',
        itens: [
          'O <b>Painel</b> mostra quantas questões você cadastrou, quantas estão aprovadas e quantas voltaram para ajuste.',
          'Os números no menu (em amarelo) avisam o que precisa da sua atenção, como questões devolvidas.',
        ],
        link: ['#/', 'Abrir o painel'],
      },
      {
        id: 'p-questao', icone: 'lapis', titulo: 'Cadastre sua primeira questão',
        itens: [
          'Clique em <b>Cadastrar questão</b>.',
          'Preencha os campos obrigatórios: <b>disciplina</b>, <b>série/ano</b> e <b>dificuldade</b>. Se quiser, informe o <b>valor</b> da questão em pontos (ex.: 0,5) — ele já entra preenchido nas provas.',
          'Em <b>Habilidades BNCC</b>, digite o código (ex.: <b>EF69AR04</b>) ou uma palavra do conteúdo (ex.: <i>cores</i>) e escolha na lista. Se você colar um enunciado que já traz o código, o sistema oferece adicioná-lo com um clique.',
          'Escreva o enunciado. Para colocar uma imagem, use o botão <b>[i:imagem] Imagem</b> ou cole com <b>Ctrl+V</b>.',
          'Questão <b>objetiva</b>: escreva as alternativas e marque o círculo da <b>correta</b> (esse é o gabarito). Se as alternativas já estão dentro de uma imagem, marque “as alternativas já estão no enunciado” e escolha só a letra.',
          'Questão <b>discursiva</b>: basta o enunciado e quantas linhas o aluno terá para responder. A <b>resposta esperada</b> é opcional — se preencher, ela aparece só no gabarito do professor.',
          'Confira a <b>pré-visualização</b> à direita e clique em <b>Salvar e enviar para revisão</b>.',
        ],
        link: ['#/questoes/nova', 'Cadastrar questão'], perm: 'questoes.criar',
      },
      {
        id: 'p-revisao', icone: 'trocar', titulo: 'Acompanhe a revisão',
        itens: [
          'Em <b>Minhas questões</b> você vê a situação de cada uma: <span class="status st-rascunho">Rascunho</span> <span class="status st-em_revisao">Em revisão</span> <span class="status st-aprovada">Aprovada</span> <span class="status st-devolvida">Devolvida</span>.',
          'Se a supervisão <b>devolver</b>, o comentário dela aparece em vermelho no cartão. Clique em <b>Editar</b>, corrija e envie de novo.',
          'Só questões <b>aprovadas</b> entram no banco para todos os professores.',
        ],
        link: ['#/banco?escopo=minhas', 'Ver minhas questões'], perm: 'questoes.criar',
      },
      {
        id: 'p-auto', icone: 'dado', titulo: 'Gere uma prova automática',
        itens: [
          'Clique em <b>Nova prova</b> e preencha <b>disciplina, série/ano, turma(s) e dificuldade</b>. Logo abaixo aparecem as <b>habilidades BNCC</b> dessa disciplina e série, com quantas questões cada uma tem no banco: marque as que a prova deve cobrir (ou nenhuma, para todas). Use o filtro para achar por código ou palavra.',
          'Escolha <b>Automática</b>, informe quantas questões <b>objetivas</b> e <b>discursivas</b> quer e, se quiser, marque os <b>assuntos</b>.',
          'A tela mostra quantas questões existem no banco com esses filtros. Clique em <b>Sortear e montar prova</b>.',
          'Não gostou de uma questão? Clique no botão <b>[i:trocar]</b> ao lado dela para trocar por outra do mesmo nível. Ou use <b>Sortear tudo de novo</b>.',
          'Na dificuldade <b>Mista</b> o sistema equilibra fáceis, médias e difíceis, da mais fácil para a mais difícil.',
        ],
        link: ['#/provas/nova', 'Nova prova'], perm: 'provas.criar',
      },
      {
        id: 'p-manual', icone: 'lista', titulo: 'Ou monte a prova manualmente',
        itens: [
          'Em <b>Nova prova</b>, escolha <b>Manual</b>. O banco abre já filtrado pela disciplina, série, dificuldade e pelas habilidades BNCC marcadas.',
          'Clique em <b>[i:mais] Adicionar à prova</b> nas questões que quiser. A barra azul-marinho embaixo mostra quantas já escolheu.',
          'Clique em <b>Abrir prova [i:avancar]</b> para organizar. Você pode misturar: sortear algumas e escolher outras à mão.',
        ],
        link: ['#/provas/nova', 'Nova prova'], perm: 'provas.criar',
      },
      {
        id: 'p-ajustar', icone: 'documento', titulo: 'Ajuste e envie a prova',
        itens: [
          'Reordene com as setas <b>[i:cima] [i:baixo]</b>. O <b>valor</b> de cada questão vem do cadastro e pode ser mudado só nesta prova. A <b>soma dos valores</b> aparece embaixo do título e avisa se não bater com o valor total.',
          'Para dividir igualmente, informe o <b>valor total</b> e clique em <b>Distribuir valor igualmente</b>. Para voltar aos valores cadastrados, use <b>Usar valor de cada questão</b>.',
          'Em <b>Impressão</b>, escolha 1 ou 2 colunas, o tamanho da fonte, até <b>4 versões</b> (A, B, C, D) com questões embaralhadas e o <b>cartão-resposta</b>.',
          'Clique em <b>Salvar e pré-visualizar</b> para ver como vai ficar no papel (aparece a marca “PRÉVIA” enquanto não for aprovada).',
          'Quando estiver pronta, clique em <b>Salvar e enviar para revisão</b>.',
        ],
        link: ['#/provas', 'Ver minhas provas'],
      },
    ],
  },
  supervisao: {
    titulo: 'Supervisão / Coordenação',
    cor: 'azul',
    resumo: 'Você garante a qualidade: revisa questões e provas antes de irem para a impressão.',
    passos: [
      {
        id: 's-fila', icone: 'entrada', titulo: 'Abra a revisão pedagógica',
        itens: [
          'O número amarelo em <b>Revisão pedagógica</b> mostra quantos itens aguardam você.',
          'A tela tem duas abas: <b>Questões</b> e <b>Provas</b>. Os mais antigos aparecem primeiro.',
        ],
        link: ['#/revisao', 'Abrir revisão'], perm: ['questoes.revisar', 'provas.revisar'],
      },
      {
        id: 's-questoes', icone: 'checkCirculo', titulo: 'Revise as questões',
        itens: [
          'Confira o enunciado, as alternativas e o <b>gabarito</b> (destacado em verde).',
          '<b>Aprovar</b>: a questão entra no banco para todos os professores.',
          '<b>Devolver</b>: escreva o que precisa ser ajustado. O professor vê seu comentário.',
          '<b>Corrigir eu mesmo</b>: para erros pequenos, edite direto sem devolver.',
        ],
        link: ['#/revisao', 'Revisar questões'], perm: 'questoes.revisar',
      },
      {
        id: 's-provas', icone: 'documento', titulo: 'Revise as provas',
        itens: [
          'Na aba <b>Provas</b>, clique em <b>Revisar</b> para abrir a prova completa com o gabarito.',
          'Use <b>Pré-visualizar</b> para ver a folha como o aluno vai receber.',
          '<b>Aprovar prova</b> envia para a fila de impressão da direção. A prova fica <b>congelada</b>: mudanças no banco depois não a alteram.',
          '<b>Devolver com comentário</b> manda de volta para o professor ajustar.',
        ],
        link: ['#/revisao', 'Revisar provas'], perm: 'provas.revisar',
      },
      {
        id: 's-reabrir', icone: 'cadeadoAberto', titulo: 'Reabra uma prova se precisar',
        itens: [
          'Achou um problema numa prova já aprovada? Abra a prova e clique em <b>Reabrir</b>, explicando o motivo.',
          'Ela volta para o professor como <span class="status st-devolvida">Devolvida</span> e sai da fila de impressão.',
        ],
        link: ['#/provas', 'Provas da escola'], perm: 'provas.revisar',
      },
      {
        id: 's-banco', icone: 'camadas', titulo: 'Acompanhe o banco inteiro',
        itens: [
          'No <b>Banco de questões</b>, as abas <b>Aprovadas / Todas / Minhas</b> mostram o banco completo, inclusive rascunhos.',
          'Use o filtro <b>Autor</b> para ver as questões de um professor específico.',
        ],
        link: ['#/banco?escopo=todas', 'Ver todas as questões'], perm: 'questoes.revisar',
      },
    ],
  },
  direcao: {
    titulo: 'Direção',
    cor: 'amarelo',
    resumo: 'Você configura o sistema, cadastra a equipe e imprime as provas aprovadas.',
    passos: [
      {
        id: 'd-escola', icone: 'escola', titulo: 'Configure a escola',
        itens: [
          'Em <b>Configurações › Escola e cabeçalho</b>, informe nome, endereço, cidade e o <b>logo da escola</b>.',
          'Esses dados aparecem no cabeçalho de todas as provas impressas.',
        ],
        link: ['#/config', 'Abrir configurações'], perm: 'config.gerenciar',
      },
      {
        id: 'd-series', icone: 'camadas', titulo: 'Séries, turmas, disciplinas e assuntos',
        itens: [
          'Em <b>Séries e turmas</b>, ajuste a lista de séries/anos e as turmas (A, B, C…).',
          'Em <b>Disciplinas e assuntos</b>, crie ou renomeie disciplinas e organize os assuntos de cada uma.',
        ],
        link: ['#/config', 'Abrir configurações'], perm: 'config.gerenciar',
      },
      {
        id: 'd-usuarios', icone: 'usuarios', titulo: 'Cadastre a equipe',
        itens: [
          'Em <b>Usuários › [i:mais] Novo usuário</b>, informe nome, login, <b>perfil</b> (Professor, Supervisão ou Direção) e uma senha inicial.',
          'Marque as <b>disciplinas</b> de cada professor: elas aparecem primeiro quando ele cadastra questões.',
          'Alguém saiu da escola? <b>Desative</b> o usuário em vez de apagar (o histórico continua).',
          'Esqueceram a senha? Edite o usuário e defina uma nova.',
          '<b>Importante:</b> troque a senha das contas de demonstração ou desative-as.',
        ],
        link: ['#/usuarios', 'Abrir usuários'], perm: 'usuarios.gerenciar',
      },
      {
        id: 'd-permissoes', icone: 'chave', titulo: 'Ajuste as permissões (opcional)',
        itens: [
          'Em <b>Configurações › Permissões por perfil</b>, marque o que cada perfil pode fazer.',
          'Exemplo: deixar o professor imprimir as próprias provas aprovadas.',
        ],
        link: ['#/config', 'Abrir configurações'], perm: 'config.gerenciar',
      },
      {
        id: 'd-imprimir', icone: 'impressora', titulo: 'Imprima as provas aprovadas',
        itens: [
          'A <b>Fila de impressão</b> lista as provas aprovadas, ordenadas pela <b>data de aplicação</b>, com o número de cópias pedido.',
          'Clique em <b>[i:impressora] Imprimir</b>. Escolha o que sai: <b>Prova</b>, <b>Cartão-resposta</b> e a versão.',
          'Para o professor, marque <b>Gabarito (cartão marcado)</b>: sai o mesmo cartão-resposta do aluno com a bolinha certa preenchida de preto — é só comparar para corrigir.',
          'Para gerar PDF, escolha <b>Salvar como PDF</b> na janela de impressão.',
          'Depois de imprimir, confirme <b>Registrar impressão</b> para tirar a prova da fila.',
        ],
        link: ['#/impressao', 'Abrir fila de impressão'], perm: 'provas.imprimir',
      },
      {
        id: 'd-backup', icone: 'disco', titulo: 'Faça backup toda semana',
        itens: [
          'Em <b>Configurações › Backup e importação</b>, clique em <b>Baixar backup</b> e guarde o arquivo fora deste computador (pendrive, nuvem).',
          'Ali também dá para <b>importar questões</b> (por exemplo, as do pendrive SmartProfessor).',
        ],
        link: ['#/config', 'Abrir configurações'], perm: 'dados.backup',
      },
    ],
  },
};

const FAQ = [
  ['O que é o código BNCC (ex.: EF69AR04)?', 'É a <b>habilidade da Base Nacional Comum Curricular</b> que a questão trabalha. <b>EF</b> = Ensino Fundamental, <b>69</b> = do 6º ao 9º ano, <b>AR</b> = Arte, <b>04</b> = número da habilidade. Ele aparece antes do enunciado na prova impressa (dá para esconder em <b>Códigos BNCC</b>) e serve de filtro no banco e na geração de provas.'],
  ['A letra está pequena. Dá para aumentar?', 'Sim. No menu lateral, em <b>Texto</b>, escolha <b>A+</b> ou <b>A++</b>. A escolha fica salva neste navegador. No celular, abra o menu pelo botão <b>[i:menu]</b>.'],
  ['Estou perdido em uma tela. Onde encontro ajuda?', 'Clique em <b>[i:ajuda] Ajuda desta tela</b> (no canto superior direito) ou no botão <b>[i:ajuda]</b> da barra de cima no celular: o tutorial abre direto no passo daquela tela.'],
  ['Esqueci minha senha. E agora?', 'Peça para a direção: em <b>Usuários</b>, ela edita sua conta e define uma nova senha. Depois troque em <b>Minha conta</b>.'],
  ['Cadastrei uma questão, mas ela não aparece no banco.', 'O banco mostra só questões <b>aprovadas</b>. Veja a situação dela em <b>Minhas questões</b>: provavelmente está <i>Em revisão</i> ou foi <i>Devolvida</i>.'],
  ['O sorteio trouxe menos questões do que pedi.', 'Não há questões aprovadas suficientes com aqueles filtros. Tente a dificuldade <b>Mista</b>, marque mais assuntos (ou nenhum, para todos) ou cadastre novas questões.'],
  ['Preciso mudar uma prova que já enviei.', 'Se ainda não foi revisada, abra a prova e clique em <b>Retirar da revisão</b>. Se já foi aprovada, peça para a supervisão <b>Reabrir</b>.'],
  ['A prova que eu estava montando sumiu?', 'Não. Ela fica guardada <b>neste navegador</b> até você salvar: clique em <b>Prova em montagem</b> no menu. Atenção: em outro computador ela não aparece até ser salva.'],
  ['Como coloco fórmulas, gráficos ou figuras?', 'Cole a imagem com <b>Ctrl+V</b> ou use o botão <b>[i:imagem] Imagem</b>. Fórmulas mais complexas: por enquanto, como imagem (um print da fórmula).'],
  ['O que são as versões A, B, C, D?', 'São cópias da mesma prova com as questões (e, se marcado, as alternativas) em ordens diferentes, para evitar cola. O gabarito do professor traz a resposta de cada versão.'],
  ['Saiu a data e o endereço do site no topo da folha. Como tiro?', 'Isso é o navegador. Na janela de impressão, abra <b>Mais configurações</b> e desmarque <b>Cabeçalhos e rodapés</b>.'],
  ['Como gero um PDF da prova?', 'Na tela de impressão, clique em <b>Imprimir</b> e, na janela do navegador, escolha a impressora <b>Salvar como PDF</b>.'],
];

// ---------------------------------------------------------------------------
// Progresso (por usuário, guardado no navegador)
// ---------------------------------------------------------------------------
const chave = () => 'tutorial:' + estado.eu.id;
function lerFeitos() {
  try { return new Set(JSON.parse(localStorage.getItem(chave())) || []); } catch { return new Set(); }
}
function salvarFeitos(set) {
  try { localStorage.setItem(chave(), JSON.stringify([...set])); } catch { /* sem armazenamento: progresso só nesta visita */ }
}
const podeAlgum = (perm) => !perm || (Array.isArray(perm) ? perm.some(pode) : pode(perm));

// perfil cuja trilha aparece primeiro
const perfilPadrao = () => (TRILHAS[estado.eu.perfil] ? estado.eu.perfil : 'professor');

// ---------------------------------------------------------------------------
// Aviso no painel
// ---------------------------------------------------------------------------
const chaveBanner = () => 'tutorial-banner-oculto:' + estado.eu.id;
export function bannerTutorial() {
  try { if (localStorage.getItem(chaveBanner())) return ''; } catch { /* mostra o aviso */ }
  const trilha = TRILHAS[perfilPadrao()];
  const feitos = lerFeitos();
  const n = trilha.passos.filter((p) => feitos.has(p.id)).length;
  if (n === trilha.passos.length) return '';
  return `
    <div class="banner-tutorial">
      <div class="bt-icone">${icone('capelo', { tamanho: '30' })}</div>
      <div class="bt-texto"><strong>Tutorial</strong>
        <span>${n} de ${trilha.passos.length} etapas concluídas</span></div>
      <div class="acoes"><a class="btn btn-caneta" href="#/tutorial">Abrir tutorial</a><button class="btn btn-fantasma" data-ocultar-banner>Agora não</button></div>
    </div>`;
}
export function ligarBannerTutorial(el) {
  const b = el.querySelector('[data-ocultar-banner]');
  if (!b) return;
  b.onclick = () => {
    try { localStorage.setItem(chaveBanner(), '1'); } catch { /* ignore */ }
    b.closest('.banner-tutorial').remove();
  };
}

// ---------------------------------------------------------------------------
// Tela
// ---------------------------------------------------------------------------
let abaAtual = null;

export async function telaTutorial(el, { query = {} } = {}) {
  if (!abaAtual) abaAtual = perfilPadrao();
  // vindo do botão "Ajuda desta tela": abre a trilha que contém o passo pedido
  const passoPedido = query.passo && Object.entries(TRILHAS).find(([, t]) => t.passos.some((p) => p.id === query.passo));
  if (passoPedido) abaAtual = passoPedido[0];
  const feitos = lerFeitos();

  const fluxo = [
    ['verde', 'Professor(a)', 'cadastra questões com gabarito'],
    ['azul', 'Supervisão', 'revisa e aprova as questões'],
    ['verde', 'Professor(a)', 'gera a prova (automática ou manual)'],
    ['azul', 'Supervisão', 'aprova a prova'],
    ['amarelo', 'Direção', 'imprime e registra'],
  ];

  el.innerHTML = `
    <div class="cabecalho-pagina">
      <div><h1>Tutorial</h1></div>
      <div class="acoes"><button class="btn btn-fantasma" id="reiniciar">Recomeçar progresso</button></div>
    </div>

    <div class="card">
      <h3>Como uma prova nasce</h3>
      <ol class="fluxo">
        ${fluxo.map(([cor, quem, oque], i) => `<li class="fluxo-passo cor-${cor}"><span class="fluxo-n">${i + 1}</span><strong>${quem}</strong><small>${oque}</small></li>`).join('')}
      </ol>
    </div>

    <div class="abas mt" role="tablist">
      ${Object.entries(TRILHAS).map(([k, t]) => `<button data-aba="${k}" class="${k === abaAtual ? 'ativa' : ''}">${t.titulo}${k === estado.eu.perfil ? ' (você)' : ''}</button>`).join('')}
    </div>
    <div id="trilha"></div>

    <div class="card mt">
      <h3>Perguntas frequentes</h3>
      <div class="faq">
        ${FAQ.map(([p, r]) => `<details><summary>${p}</summary><p>${comIcones(r)}</p></details>`).join('')}
      </div>
    </div>`;

  function desenharTrilha() {
    const t = TRILHAS[abaAtual];
    const n = t.passos.filter((p) => feitos.has(p.id)).length;
    const pct = Math.round((n / t.passos.length) * 100);
    $('#trilha', el).innerHTML = `
      <div class="trilha-topo cor-${t.cor}">
        <div class="progresso"><div class="progresso-barra" style="width:${pct}%"></div></div>
        <small>${n} de ${t.passos.length} etapas concluídas${n === t.passos.length ? ' — trilha concluída.' : ''}</small>
      </div>
      <ol class="passos">
        ${t.passos.map((p, i) => {
          const feito = feitos.has(p.id);
          const temAcesso = podeAlgum(p.perm);
          return `
          <li class="passo ${feito ? 'feito' : ''}" data-passo="${p.id}">
            <div class="passo-marca"><span class="passo-icone">${icone(p.icone, { tamanho: '26' })}</span><span class="passo-n">${i + 1}</span></div>
            <div class="passo-corpo">
              <h3>${p.titulo}</h3>
              <ul>${p.itens.map((x) => `<li>${comIcones(x)}</li>`).join('')}</ul>
              <div class="flex mt">
                ${p.link ? (temAcesso ? `<a class="btn btn-sm btn-primario" href="${p.link[0]}">${p.link[1]} ${icone('avancar')}</a>` : '<small class="suave">Esta etapa é feita por outro perfil.</small>') : ''}
                <label class="check"><input type="checkbox" data-feito ${feito ? 'checked' : ''}> Já fiz esta etapa</label>
              </div>
            </div>
          </li>`;
        }).join('')}
      </ol>`;
  }

  $$('[data-aba]', el).forEach((b) => (b.onclick = () => {
    abaAtual = b.dataset.aba;
    $$('[data-aba]', el).forEach((x) => x.classList.toggle('ativa', x === b));
    desenharTrilha();
  }));
  $('#trilha', el).addEventListener('change', (e) => {
    if (!e.target.matches('[data-feito]')) return;
    const id = e.target.closest('[data-passo]').dataset.passo;
    if (e.target.checked) feitos.add(id); else feitos.delete(id);
    salvarFeitos(feitos);
    desenharTrilha();
  });
  $('#reiniciar', el).onclick = () => {
    feitos.clear();
    salvarFeitos(feitos);
    try { localStorage.removeItem(chaveBanner()); } catch { /* ignore */ }
    desenharTrilha();
  };

  desenharTrilha();
  if (passoPedido) {
    const alvo = el.querySelector(`[data-passo="${query.passo}"]`);
    if (alvo) {
      alvo.classList.add('destacado');
      setTimeout(() => alvo.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    }
  }
}
