// Dados iniciais criados na primeira execução (data/db.json ainda não existe).
'use strict';

module.exports = function criarSeed({ uid, agora, hashSenha, PERMISSOES_PADRAO }) {
  const disciplinas = [
    'Língua Portuguesa', 'Matemática', 'Ciências', 'História', 'Geografia', 'Língua Inglesa', 'Arte',
    'Educação Física', 'Física', 'Química', 'Biologia', 'Filosofia', 'Sociologia',
  ].map((nome) => ({ id: uid('d'), nome, ativo: true }));
  const D = (nome) => disciplinas.find((d) => d.nome === nome).id;

  const assuntosBase = {
    'Língua Portuguesa': ['Interpretação de texto', 'Sujeito e predicado', 'Classes de palavras', 'Ortografia'],
    Matemática: ['Frações', 'Equações do 1º grau', 'Geometria plana', 'Porcentagem'],
    Ciências: ['Célula', 'Corpo humano', 'Ecologia'],
    História: ['Brasil Império', 'Brasil Colônia', 'Antiguidade'],
    Geografia: ['Cartografia', 'Clima', 'População'],
    'Educação Física': ['Voleibol', 'Futsal', 'Atletismo', 'Saúde e nutrição'],
  };
  const assuntos = [];
  for (const [disc, nomes] of Object.entries(assuntosBase)) {
    for (const nome of nomes) assuntos.push({ id: uid('a'), disciplinaId: D(disc), nome });
  }
  // busca o assunto; se não existir, cria (as questões de exemplo trazem assuntos novos)
  const A = (disc, nome) => {
    let a = assuntos.find((x) => x.disciplinaId === D(disc) && x.nome === nome);
    if (!a) assuntos.push((a = { id: uid('a'), disciplinaId: D(disc), nome }));
    return a.id;
  };

  const series = [
    '1º ano EF', '2º ano EF', '3º ano EF', '4º ano EF', '5º ano EF', '6º ano EF', '7º ano EF', '8º ano EF', '9º ano EF',
    '1ª série EM', '2ª série EM', '3ª série EM',
  ];

  const usuario = (nome, login, senha, perfil, discs = []) => ({
    id: uid('u'), nome, login, perfil, disciplinas: discs, ativo: true, criadoEm: agora(), ...hashSenha(senha),
  });
  const direcao = usuario('Direção (demo)', 'direcao', 'direcao123', 'direcao');
  const supervisao = usuario('Supervisão (demo)', 'supervisao', 'supervisao123', 'supervisao');
  const professor = usuario('Professor(a) demo', 'professor', 'professor123', 'professor', [D('Matemática'), D('Língua Portuguesa')]);
  const ana = usuario('Ana Souza (demo)', 'ana', 'ana123', 'professor', [D('Ciências'), D('Biologia'), D('Química')]);

  let seq = 0;
  const hist = (u, acao, comentario = '') => ({ data: agora(), usuarioId: u.id, usuarioNome: u.nome, acao, comentario });
  const alt = (corretaIdx, ...textos) => textos.map((texto, i) => ({ texto, correta: i === corretaIdx }));
  const questao = (dados, autor, status, extraHist = []) => {
    seq += 1;
    return {
      id: uid('q'), codigo: 'Q' + String(seq).padStart(4, '0'), assuntoId: '', serie: '', fonte: '', origem: 'Autoral',
      alternativas: [], respostaEsperada: '', resolucao: '', linhas: 0, dificuldade: 2,
      // valor sugerido: discursiva 2 pontos; objetiva conforme a dificuldade (fácil 0,5 · média 1 · difícil 1,5)
      valor: dados.tipo === 'discursiva' ? 2 : ({ 1: 0.5, 2: 1, 3: 1.5 })[dados.dificuldade || 2],
      ...dados, autorId: autor.id, status, criadoEm: agora(), atualizadoEm: agora(),
      historico: [hist(autor, 'criou'), ...extraHist],
    };
  };

  const q1 = questao({
    disciplinaId: D('Matemática'), assuntoId: A('Matemática', 'Frações'), serie: '6º ano EF', tipo: 'objetiva', dificuldade: 1,
    enunciado: '<p>Uma pizza foi dividida em 8 pedaços iguais. João comeu 3 pedaços e Maria comeu 2 pedaços. Que fração da pizza <b>sobrou</b>?</p>',
    alternativas: alt(0, '3/8', '5/8', '2/8', '1/2', '3/5'),
    resolucao: 'Foram comidos 3 + 2 = 5 pedaços de 8. Sobraram 8 − 5 = 3 pedaços, ou seja, 3/8.',
  }, professor, 'aprovada', [hist(supervisao, 'aprovou')]);

  const q2 = questao({
    disciplinaId: D('Matemática'), assuntoId: A('Matemática', 'Equações do 1º grau'), serie: '7º ano EF', tipo: 'objetiva', dificuldade: 2,
    enunciado: '<p>Qual é o valor de <i>x</i> na equação 3<i>x</i> − 7 = 11?</p>',
    alternativas: alt(1, '4/3', '6', '18', '−6', '3'),
    resolucao: '3x = 11 + 7 → 3x = 18 → x = 6.',
  }, professor, 'aprovada', [hist(supervisao, 'aprovou')]);

  const q3 = questao({
    disciplinaId: D('Matemática'), assuntoId: A('Matemática', 'Geometria plana'), serie: '7º ano EF', tipo: 'discursiva', dificuldade: 2, linhas: 6,
    enunciado: '<p>Um terreno retangular mede 12 m de largura por 25 m de comprimento. Calcule a <b>área</b> e o <b>perímetro</b> desse terreno, mostrando os cálculos.</p>',
    respostaEsperada: '<p>Área = 12 × 25 = 300 m². Perímetro = 2 × (12 + 25) = 74 m.</p>',
  }, professor, 'aprovada', [hist(supervisao, 'aprovou')]);

  const q4 = questao({
    disciplinaId: D('Matemática'), assuntoId: A('Matemática', 'Porcentagem'), serie: '7º ano EF', tipo: 'objetiva', dificuldade: 2,
    enunciado: '<p>Uma camiseta custava R$ 80,00 e teve um desconto de 15%. Qual é o novo preço da camiseta?</p>',
    alternativas: alt(2, 'R$ 65,00', 'R$ 12,00', 'R$ 68,00', 'R$ 72,00', 'R$ 95,00'),
    resolucao: '15% de 80 = 12. 80 − 12 = 68.',
  }, professor, 'aprovada', [hist(supervisao, 'aprovou')]);

  const q5 = questao({
    disciplinaId: D('Língua Portuguesa'), assuntoId: A('Língua Portuguesa', 'Sujeito e predicado'), serie: '6º ano EF', tipo: 'objetiva', dificuldade: 1,
    enunciado: '<p>Na frase “Os alunos chegaram cedo à escola”, o sujeito é:</p>',
    alternativas: alt(1, 'cedo', 'Os alunos', 'à escola', 'chegaram', 'oculto'),
  }, professor, 'aprovada', [hist(supervisao, 'aprovou')]);

  const q6 = questao({
    disciplinaId: D('Ciências'), assuntoId: A('Ciências', 'Célula'), serie: '7º ano EF', tipo: 'objetiva', dificuldade: 2,
    enunciado: '<p>Qual organela celular é a principal responsável pela respiração celular e pela produção de energia (ATP)?</p>',
    alternativas: alt(0, 'Mitocôndria', 'Ribossomo', 'Lisossomo', 'Complexo golgiense', 'Núcleo'),
  }, supervisao, 'em_revisao', [hist(supervisao, 'enviou para revisão')]);

  const q7 = questao({
    disciplinaId: D('Educação Física'), assuntoId: A('Educação Física', 'Voleibol'), serie: '8º ano EF', tipo: 'objetiva', dificuldade: 1,
    enunciado: '<p>No voleibol, quantos toques uma equipe pode dar na bola antes de enviá-la à quadra adversária (sem contar o toque do bloqueio)?</p>',
    alternativas: alt(2, 'Um', 'Dois', 'Três', 'Quatro', 'Ilimitados, desde que a bola não caia'),
  }, supervisao, 'aprovada', [hist(supervisao, 'aprovou')]);

  const q8 = questao({
    disciplinaId: D('Geografia'), assuntoId: A('Geografia', 'Cartografia'), serie: '6º ano EF', tipo: 'objetiva', dificuldade: 1,
    enunciado: '<p>A linha imaginária que divide a Terra em hemisfério Norte e hemisfério Sul é chamada de:</p>',
    alternativas: alt(0, 'Linha do Equador', 'Meridiano de Greenwich', 'Trópico de Capricórnio', 'Círculo Polar Ártico', 'Trópico de Câncer'),
  }, supervisao, 'aprovada', [hist(supervisao, 'aprovou')]);

  const q9 = questao({
    disciplinaId: D('História'), assuntoId: A('História', 'Brasil Império'), serie: '8º ano EF', tipo: 'discursiva', dificuldade: 3, linhas: 8,
    enunciado: '<p>Explique <b>dois</b> fatores que contribuíram para o processo de Independência do Brasil em 1822.</p>',
    respostaEsperada: '<p>Exemplos: a vinda da família real (1808) e a abertura dos portos; a Revolução do Porto (1820) e a pressão das Cortes portuguesas pela recolonização; o interesse das elites locais em manter a autonomia.</p>',
  }, professor, 'rascunho');

  const q10 = questao({
    disciplinaId: D('Língua Portuguesa'), assuntoId: A('Língua Portuguesa', 'Ortografia'), serie: '6º ano EF', tipo: 'objetiva', dificuldade: 1,
    enunciado: '<p>Assinale a alternativa em que todas as palavras estão escritas corretamente.</p>',
    alternativas: alt(3, 'excessão, paralizar, análize', 'exceção, paralizar, análise', 'excessão, paralisar, análise', 'exceção, paralisar, análise'),
  }, professor, 'devolvida', [
    hist(professor, 'enviou para revisão'),
    hist(supervisao, 'devolveu para ajustes', 'Ficou com só 4 alternativas; as demais provas usam 5. Acrescente uma alternativa (ex.: "exceção, paralisar, análize").'),
  ]);

  // mais questões de Matemática do 7º ano para demonstrar a geração automática
  const mat7 = (assunto, dificuldade, enunciado, corretaIdx, alternativas, resolucao = '') => questao({
    disciplinaId: D('Matemática'), assuntoId: A('Matemática', assunto), serie: '7º ano EF', tipo: 'objetiva', dificuldade,
    enunciado: `<p>${enunciado}</p>`, alternativas: alt(corretaIdx, ...alternativas), resolucao,
  }, professor, 'aprovada', [hist(supervisao, 'aprovou')]);
  const extras = [
    mat7('Equações do 1º grau', 1, 'Qual é o valor de <i>x</i> em <i>x</i> + 5 = 12?', 2, ['5', '17', '7', '12', '−7'], '12 − 5 = 7.'),
    mat7('Equações do 1º grau', 3, 'O dobro de um número somado a 9 é igual a 31. Que número é esse?', 0, ['11', '20', '22', '9', '13'], '2x + 9 = 31 → 2x = 22 → x = 11.'),
    mat7('Porcentagem', 1, 'Quanto é 50% de 80?', 3, ['8', '16', '30', '40', '50'], 'Metade de 80 é 40.'),
    mat7('Porcentagem', 3, 'Um produto de R$ 200,00 subiu 10% e, depois, teve desconto de 10%. Qual é o preço final?', 1, ['R$ 200,00', 'R$ 198,00', 'R$ 202,00', 'R$ 180,00', 'R$ 220,00'], '200 × 1,1 = 220; 220 × 0,9 = 198.'),
    mat7('Geometria plana', 1, 'Quantos lados tem um hexágono?', 4, ['4', '5', '8', '7', '6']),
    mat7('Geometria plana', 2, 'A soma dos ângulos internos de qualquer triângulo é igual a:', 2, ['90°', '360°', '180°', '270°', '120°']),
    mat7('Frações', 2, 'Qual é o resultado de 1/2 + 1/4?', 1, ['2/6', '3/4', '1/6', '2/4', '1/8'], '1/2 = 2/4; 2/4 + 1/4 = 3/4.'),
    mat7('Frações', 3, 'Ana leu 2/5 de um livro de 150 páginas. Quantas páginas ainda faltam para ela terminar?', 0, ['90', '60', '75', '100', '50'], '2/5 de 150 = 60 lidas; faltam 150 − 60 = 90.'),
  ];
  const q11 = questao({
    disciplinaId: D('Matemática'), assuntoId: A('Matemática', 'Porcentagem'), serie: '7º ano EF', tipo: 'discursiva', dificuldade: 3, linhas: 6,
    enunciado: '<p>Uma turma tem 40 alunos e 35% deles são meninos. Quantas meninas há na turma? Mostre os cálculos.</p>',
    respostaEsperada: '<p>35% de 40 = 14 meninos; 40 − 14 = 26 meninas.</p>',
  }, professor, 'aprovada', [hist(supervisao, 'aprovou')]);

  // questões de exemplo (dados-exemplo.js)
  const autores = { professor, ana, supervisao, direcao };
  const { questoes: dadosExemplo, BNCC_POR_ASSUNTO } = require('./dados-exemplo.js');
  const exemplos = dadosExemplo.map((x) => {
    const objetiva = x[0] === 'O';
    const extra = (objetiva ? x[9] : x[8]) || {};
    const autor = autores[extra.autor] || professor;
    const status = extra.status || 'aprovada';
    const dados = {
      disciplinaId: D(x[1]), assuntoId: A(x[1], x[2]), serie: x[3], dificuldade: x[4], tipo: objetiva ? 'objetiva' : 'discursiva',
      enunciado: '<p>' + x[5] + '</p>',
      ...(extra.bncc ? { bncc: extra.bncc } : {}),
      ...(extra.valor != null ? { valor: extra.valor } : {}),
      ...(objetiva
        ? { alternativas: alt(x[7], ...x[6]), resolucao: x[8] || '' }
        : { respostaEsperada: x[6] ? '<p>' + x[6] + '</p>' : '', linhas: x[7] }),
    };
    const extraHist = status === 'aprovada' ? [hist(supervisao, 'aprovou')]
      : status === 'em_revisao' ? [hist(autor, 'enviou para revisão')]
        : status === 'devolvida' ? [hist(autor, 'enviou para revisão'), hist(supervisao, 'devolveu para ajustes', extra.comentario || 'Revise o enunciado.')]
          : [];
    return questao(dados, autor, status, extraHist);
  });

  const questoes = [q1, q2, q3, q4, q5, q6, q7, q8, q9, q10, ...extras, q11, ...exemplos];

  // habilidade BNCC padrão de cada assunto (ver BNCC_POR_ASSUNTO em dados-exemplo.js)
  const nomeDisc = (id) => disciplinas.find((d) => d.id === id).nome;
  const nomeAss = (id) => (assuntos.find((a) => a.id === id) || {}).nome || '';
  questoes.forEach((q) => {
    if (q.bncc && q.bncc.length) return;
    const base = nomeDisc(q.disciplinaId) + '|' + nomeAss(q.assuntoId);
    q.bncc = BNCC_POR_ASSUNTO[base + '|' + q.serie] || BNCC_POR_ASSUNTO[base] || [];
  });

  const prova = {
    id: uid('p'), numero: 1, titulo: 'Avaliação Bimestral de Matemática', tipo: 'Prova', disciplinaId: D('Matemática'),
    serie: '7º ano EF', turma: 'A, B', dificuldade: 'mista', modo: 'manual', auto: null,
    bimestre: '1º bimestre', data: '', valorTotal: '10',
    instrucoes: 'Leia com atenção cada questão. Use caneta azul ou preta. Não é permitido o uso de calculadora.',
    copias: 60,
    itens: [
      { questaoId: q1.id, valor: 2 }, { questaoId: q2.id, valor: 2 }, { questaoId: q4.id, valor: 2 }, { questaoId: q3.id, valor: 4 },
    ],
    opcoes: { colunas: 1, fonte: 12, versoes: 2, embaralharAlternativas: true, cartaoResposta: true },
    autorId: professor.id, status: 'aprovada', criadoEm: agora(), atualizadoEm: agora(),
    historico: [hist(professor, 'criou'), hist(professor, 'enviou para revisão'), hist(supervisao, 'aprovou')],
  };
  prova.snapshot = JSON.parse(JSON.stringify(prova.itens.map((it) => questoes.find((q) => q.id === it.questaoId))));

  // ---- provas de exemplo, uma em cada etapa do fluxo ----
  const daqui = (dias) => new Date(Date.now() + dias * 864e5).toISOString().slice(0, 10);
  const pegar = (disc, serie, n, tipo) => questoes
    .filter((q) => q.status === 'aprovada' && q.disciplinaId === D(disc) && q.serie === serie && (!tipo || q.tipo === tipo))
    .slice(0, n);
  let numero = 1;
  const novaProva = (dados, autor, status, questoesDaProva, extraHist = []) => {
    numero += 1;
    const valor = Math.round((10 / questoesDaProva.length) * 100) / 100;
    const p = {
      id: uid('p'), numero, tipo: 'Prova', turma: 'A', dificuldade: 'mista', modo: 'manual', auto: null, bimestre: '2º bimestre',
      data: '', valorTotal: '10', instrucoes: 'Leia com atenção. Use caneta azul ou preta.', copias: 35,
      opcoes: { colunas: 1, fonte: 12, versoes: 1, embaralharAlternativas: false, cartaoResposta: true },
      ...dados,
      itens: questoesDaProva.map((q) => ({ questaoId: q.id, valor })),
      autorId: autor.id, status, criadoEm: agora(), atualizadoEm: agora(),
      historico: [hist(autor, 'criou'), ...extraHist],
    };
    if (['aprovada', 'impressa'].includes(status)) p.snapshot = JSON.parse(JSON.stringify(questoesDaProva));
    return p;
  };
  const provas = [
    prova,
    novaProva({ titulo: 'Avaliação de Ciências — Corpo humano e energia', disciplinaId: D('Ciências'), serie: '8º ano EF', turma: 'A, B', data: daqui(7),
      modo: 'auto', auto: { objetivas: 6, discursivas: 1, assuntos: [], incluirSemSerie: false, evitarRepetidas: true }, opcoes: { colunas: 1, fonte: 12, versoes: 2, embaralharAlternativas: true, cartaoResposta: true } },
    ana, 'em_revisao', [...pegar('Ciências', '8º ano EF', 6, 'objetiva'), ...pegar('Ciências', '8º ano EF', 1, 'discursiva')],
    [hist(ana, 'enviou para revisão', 'Prova para a semana que vem, turmas A e B.')]),
    novaProva({ titulo: 'Simulado de Língua Portuguesa', tipo: 'Simulado', disciplinaId: D('Língua Portuguesa'), serie: '6º ano EF', turma: 'C', dificuldade: '1' },
      professor, 'devolvida', pegar('Língua Portuguesa', '6º ano EF', 4, 'objetiva').filter((q) => q.dificuldade === 1),
      [hist(professor, 'enviou para revisão'), hist(supervisao, 'devolveu para ajustes', 'Está curto para um simulado: acrescente pelo menos mais 4 questões, incluindo uma discursiva.')]),
    novaProva({ titulo: 'Prova de História — República e Guerras', disciplinaId: D('História'), serie: '9º ano EF', turma: 'A', data: daqui(-5), impressaEm: agora() },
      professor, 'impressa', pegar('História', '9º ano EF', 6),
      [hist(professor, 'enviou para revisão'), hist(supervisao, 'aprovou'), hist(direcao, 'registrou impressão', '35 cópias')]),
    novaProva({ titulo: '1ª Avaliação de Artes', disciplinaId: D('Arte'), serie: '6º ano EF', turma: 'A, B, C, D', bimestre: '1º bimestre', data: daqui(3),
      instrucoes: 'Leia com atenção as questões antes de responder e marque a opção correta em cada questão.', copias: 120 },
    professor, 'aprovada', questoes.filter((q) => q.disciplinaId === D('Arte') && q.serie === '6º ano EF'),
    [hist(professor, 'enviou para revisão'), hist(supervisao, 'aprovou')]),
    novaProva({ titulo: 'Lista de exercícios — Potenciação e geometria', tipo: 'Lista de exercícios', disciplinaId: D('Matemática'), serie: '8º ano EF', turma: 'B', copias: 0 },
      professor, 'rascunho', pegar('Matemática', '8º ano EF', 5)),
  ];
  prova.data = daqui(10);

  return {
    versao: 1,
    seq: { questao: seq, prova: provas.length },
    config: {
      escola: {
        nome: 'Escola Municipal Exemplo', endereco: 'Rua da Escola, 100 — Centro', cidade: 'Sua Cidade — UF',
        telefone: '', rodape: 'Boa prova!', logo: '', mostrarLogoPei: true, fonteProva: 'arial',
      },
      series,
      turmas: ['A', 'B', 'C', 'D', 'E', 'Única'],
      disciplinas,
      assuntos,
      permissoes: JSON.parse(JSON.stringify(PERMISSOES_PADRAO)),
    },
    usuarios: [direcao, supervisao, professor, ana],
    questoes,
    provas,
  };
};
