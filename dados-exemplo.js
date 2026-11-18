// Questões de exemplo (mock) para testar o sistema. Conteúdo original, escrito para demonstração.
// Formato compacto:
//   objetiva:   ['O', disciplina, assunto, série, dificuldade(1-3), enunciado, [alternativas], índiceCorreta, resolução?]
// Habilidades BNCC: vêm de BNCC_POR_ASSUNTO (no fim do arquivo) ou do campo extra { bncc: [...] }.
//   discursiva: ['D', disciplina, assunto, série, dificuldade(1-3), enunciado, respostaEsperada, linhas]
// Campo extra opcional no fim: { status, autor, comentario, bncc, valor }  (padrão: aprovada, autor "professor")
'use strict';

const LP = 'Língua Portuguesa', MAT = 'Matemática', CIE = 'Ciências', HIS = 'História', GEO = 'Geografia';
const ING = 'Língua Inglesa', BIO = 'Biologia', FIS = 'Física', QUI = 'Química', EF = 'Educação Física', ARTE = 'Arte';

const questoes = [
  // ---------------- Língua Portuguesa — 6º ano EF ----------------
  ['O', LP, 'Classes de palavras', '6º ano EF', 1, 'Na frase “O menino comprou uma bola nova”, a palavra “nova” é um:', ['substantivo', 'adjetivo', 'verbo', 'advérbio', 'pronome'], 1, '“Nova” caracteriza o substantivo “bola”: é um adjetivo.'],
  ['O', LP, 'Classes de palavras', '6º ano EF', 1, 'Qual das palavras abaixo é um verbo?', ['mesa', 'bonito', 'correr', 'rapidamente', 'nós'], 2],
  ['O', LP, 'Ortografia', '6º ano EF', 1, 'Assinale a palavra escrita corretamente.', ['cachorro', 'caxorro', 'cachoro', 'caxoro', 'cachorru'], 0],
  ['O', LP, 'Ortografia', '6º ano EF', 2, 'Em qual alternativa todas as palavras estão acentuadas corretamente?', ['café, sofá, você', 'cafe, sofá, você', 'café, sofa, voce', 'cafe, sofa, você', 'café, sófa, você'], 0],
  ['O', LP, 'Sujeito e predicado', '6º ano EF', 2, 'Na oração “Choveu muito ontem”, o sujeito é:', ['muito', 'ontem', 'oculto', 'inexistente', 'simples'], 3, 'Verbos que indicam fenômenos da natureza não têm sujeito (oração sem sujeito).'],
  ['O', LP, 'Interpretação de texto', '6º ano EF', 2, 'Leia: “Lucas acordou cedo, tomou café às pressas e correu para o ponto de ônibus.” Pela atitude de Lucas, podemos concluir que ele:', ['estava doente', 'estava com pressa', 'não gostava de café', 'perdeu o ônibus', 'estava de férias'], 1],
  ['O', LP, 'Classes de palavras', '6º ano EF', 2, 'Na frase “Eles chegaram cedo”, a palavra “eles” é um:', ['pronome', 'substantivo', 'adjetivo', 'artigo', 'numeral'], 0],
  ['O', LP, 'Interpretação de texto', '6º ano EF', 3, 'Na frase “A notícia caiu como uma bomba na cidade”, a expressão “caiu como uma bomba” indica que a notícia:', ['destruiu prédios', 'causou grande impacto', 'foi muito barulhenta', 'era sobre uma guerra', 'foi esquecida rapidamente'], 1, 'É linguagem figurada (comparação): a notícia causou grande espanto.'],
  ['O', LP, 'Sujeito e predicado', '6º ano EF', 3, 'Na oração “Maria e Joana estudaram juntas”, o sujeito é:', ['simples', 'composto', 'oculto', 'indeterminado', 'inexistente'], 1, 'Há dois núcleos (Maria e Joana): sujeito composto.'],
  ['O', LP, 'Ortografia', '6º ano EF', 3, 'Complete corretamente: “Ele não veio ______ estava doente.”', ['porque', 'por que', 'porquê', 'por quê', 'porquer'], 0, '“Porque” (junto e sem acento) introduz uma explicação/causa.', { status: 'em_revisao' }],
  ['D', LP, 'Interpretação de texto', '6º ano EF', 2, 'Escreva um pequeno parágrafo (3 a 5 linhas) explicando a diferença entre linguagem formal e informal. Dê um exemplo de cada.', 'Linguagem formal segue a norma-padrão e é usada em situações oficiais (ex.: “Bom dia, senhor diretor”). A informal é espontânea, usada entre amigos e familiares (ex.: “E aí, beleza?”).', 6, { bncc: ['EF69LP55'] }],
  ['D', LP, 'Classes de palavras', '6º ano EF', 3, 'Crie uma frase com pelo menos um substantivo, um adjetivo e um verbo. Depois, identifique cada um deles.', '', 5],

  // ---------------- Ciências — 8º ano EF ----------------
  ['O', CIE, 'Corpo humano', '8º ano EF', 1, 'Qual órgão bombeia o sangue para todo o corpo?', ['pulmão', 'fígado', 'coração', 'rim', 'estômago'], 2, null, { autor: 'ana' }],
  ['O', CIE, 'Corpo humano', '8º ano EF', 1, 'Os pulmões fazem parte do sistema:', ['digestório', 'respiratório', 'nervoso', 'urinário', 'esquelético'], 1, null, { autor: 'ana' }],
  ['O', CIE, 'Corpo humano', '8º ano EF', 2, 'A digestão química dos alimentos começa:', ['no estômago', 'na boca', 'no intestino grosso', 'no esôfago', 'no fígado'], 1, 'A saliva contém amilase, que começa a digerir o amido ainda na boca.', { autor: 'ana' }],
  ['O', CIE, 'Corpo humano', '8º ano EF', 2, 'Qual é a principal função dos rins?', ['produzir bile', 'filtrar o sangue e formar a urina', 'bombear o sangue', 'produzir o hormônio do crescimento', 'digerir proteínas'], 1, null, { autor: 'ana' }],
  ['O', CIE, 'Energia', '8º ano EF', 1, 'Qual destas é uma fonte de energia renovável?', ['petróleo', 'carvão mineral', 'gás natural', 'energia solar', 'urânio'], 3, null, { autor: 'ana' }],
  ['O', CIE, 'Energia', '8º ano EF', 2, 'Uma usina hidrelétrica transforma principalmente a energia:', ['química em elétrica', 'do movimento da água em elétrica', 'térmica em luminosa', 'nuclear em elétrica', 'elétrica em mecânica'], 1, null, { autor: 'ana' }],
  ['O', CIE, 'Reprodução', '8º ano EF', 2, 'Os gametas masculinos humanos são chamados de:', ['óvulos', 'espermatozoides', 'zigotos', 'embriões', 'ovários'], 1, null, { autor: 'ana' }],
  ['O', CIE, 'Reprodução', '8º ano EF', 3, 'As mudanças do corpo na puberdade são causadas principalmente pela ação de:', ['vitaminas', 'hormônios', 'enzimas digestivas', 'anticorpos', 'sais minerais'], 1, null, { autor: 'ana' }],
  ['O', CIE, 'Corpo humano', '8º ano EF', 3, 'As células do sangue responsáveis pela defesa do organismo são:', ['hemácias', 'plaquetas', 'leucócitos', 'neurônios', 'células epiteliais'], 2, null, { autor: 'ana' }],
  ['O', CIE, 'Energia', '8º ano EF', 3, 'Ao esfregar as mãos em um dia frio, elas esquentam. Isso acontece porque a energia do movimento se transforma em:', ['energia luminosa', 'energia química', 'energia térmica', 'energia elétrica', 'energia nuclear'], 2, 'O atrito transforma energia cinética em energia térmica (calor).',
    { autor: 'ana', status: 'devolvida', comentario: 'Boa questão! Só troque “energia do movimento” por “energia cinética” no enunciado, que é o termo usado no livro do 8º ano.' }],
  ['D', CIE, 'Corpo humano', '8º ano EF', 2, 'Explique o caminho do ar desde o nariz até os pulmões, citando os órgãos envolvidos.', 'Nariz (fossas nasais) → faringe → laringe → traqueia → brônquios → bronquíolos → alvéolos pulmonares, onde ocorrem as trocas gasosas.', 6, { autor: 'ana' }],
  ['D', CIE, 'Energia', '8º ano EF', 3, 'Cite duas vantagens e uma desvantagem da energia solar.', 'Vantagens: é renovável; não emite poluentes ao gerar energia; pode ser instalada nas casas. Desvantagens: depende da luz do sol; custo inicial alto; ocupa área.', 6, { autor: 'ana' }],

  // ---------------- História — 9º ano EF ----------------
  ['O', HIS, 'República', '9º ano EF', 1, 'Em que ano foi proclamada a República no Brasil?', ['1822', '1888', '1889', '1930', '1964'], 2],
  ['O', HIS, 'República', '9º ano EF', 2, 'O período conhecido como “Era Vargas” começou com a:', ['Proclamação da República', 'Revolução de 1930', 'Independência do Brasil', 'Abolição da escravatura', 'Guerra do Paraguai'], 1],
  ['O', HIS, 'Guerras mundiais', '9º ano EF', 1, 'A Primeira Guerra Mundial ocorreu entre:', ['1914 e 1918', '1939 e 1945', '1500 e 1530', '1889 e 1894', '1964 e 1985'], 0],
  ['O', HIS, 'Guerras mundiais', '9º ano EF', 2, 'Qual país foi governado por Adolf Hitler durante a Segunda Guerra Mundial?', ['Itália', 'Japão', 'Alemanha', 'Rússia', 'França'], 2],
  ['O', HIS, 'Guerras mundiais', '9º ano EF', 3, 'O ataque japonês a Pearl Harbor, em 1941, levou à entrada de qual país na Segunda Guerra Mundial?', ['Brasil', 'Estados Unidos', 'Alemanha', 'Inglaterra', 'China'], 1],
  ['O', HIS, 'Ditadura militar', '9º ano EF', 2, 'O regime militar no Brasil durou de:', ['1930 a 1945', '1945 a 1964', '1964 a 1985', '1985 a 1990', '1889 a 1930'], 2],
  ['O', HIS, 'Ditadura militar', '9º ano EF', 3, 'O movimento “Diretas Já” (1983–1984) reivindicava:', ['a volta da monarquia', 'eleições diretas para presidente', 'o fim do voto feminino', 'a independência do Brasil', 'a construção de Brasília'], 1],
  ['O', HIS, 'República', '9º ano EF', 3, 'A chamada “política do café com leite” referia-se à alternância no poder entre as elites de:', ['Rio de Janeiro e Bahia', 'São Paulo e Minas Gerais', 'Pernambuco e Ceará', 'Rio Grande do Sul e Paraná', 'Goiás e Mato Grosso'], 1, null, { status: 'em_revisao' }],
  ['D', HIS, 'Guerras mundiais', '9º ano EF', 3, 'Explique o que foi a Guerra Fria e cite os dois países que lideraram os blocos rivais.', 'Disputa política, econômica, ideológica e militar, sem confronto direto entre as potências, entre o bloco capitalista (liderado pelos EUA) e o socialista (liderado pela URSS), de 1947 a 1991.', 7],
  ['D', HIS, 'Ditadura militar', '9º ano EF', 2, 'Cite duas características do período da ditadura militar no Brasil.', 'Censura à imprensa e às artes; Atos Institucionais (como o AI-5); cassação de direitos políticos; perseguição a opositores; eleições indiretas para presidente.', 6],

  // ---------------- Geografia — 6º ano EF ----------------
  ['O', GEO, 'Cartografia', '6º ano EF', 1, 'Os quatro pontos cardeais são:', ['norte, sul, leste e oeste', 'nordeste, noroeste, sudeste e sudoeste', 'direita, esquerda, frente e trás', 'equador, trópicos, polos e meridianos', 'latitude, longitude, altitude e escala'], 0, null, { autor: 'supervisao' }],
  ['O', GEO, 'Cartografia', '6º ano EF', 2, 'Em um mapa com escala 1:100.000, 1 cm no mapa corresponde a quanto na realidade?', ['1 km', '10 km', '100 km', '100 m', '1.000 km'], 0, '100.000 cm = 1.000 m = 1 km.', { autor: 'supervisao' }],
  ['O', GEO, 'Clima', '6º ano EF', 1, 'O instrumento usado para medir a temperatura do ar é o:', ['barômetro', 'termômetro', 'pluviômetro', 'anemômetro', 'bússola'], 1, null, { autor: 'supervisao' }],
  ['O', GEO, 'Clima', '6º ano EF', 2, 'A camada de ar que envolve a Terra é chamada de:', ['litosfera', 'hidrosfera', 'atmosfera', 'biosfera', 'crosta'], 2, null, { autor: 'supervisao' }],
  ['O', GEO, 'Relevo', '6º ano EF', 2, 'Uma forma de relevo plana, de baixa altitude e geralmente próxima a rios, é a:', ['montanha', 'planalto', 'planície', 'serra', 'cordilheira'], 2, null, { autor: 'supervisao' }],
  ['O', GEO, 'Relevo', '6º ano EF', 3, 'Os agentes externos que modificam o relevo, como a chuva e o vento, provocam:', ['terremotos', 'vulcanismo', 'erosão', 'tectonismo', 'falhas geológicas'], 2, null, { autor: 'supervisao' }],
  ['O', GEO, 'População', '6º ano EF', 3, 'O deslocamento de pessoas do campo para a cidade é chamado de:', ['imigração', 'êxodo rural', 'emigração', 'transumância', 'migração pendular'], 1, null, { autor: 'supervisao' }],
  ['D', GEO, 'Cartografia', '6º ano EF', 2, 'Explique a diferença entre latitude e longitude.', 'Latitude é a distância, em graus, de um ponto até a Linha do Equador (norte ou sul, de 0° a 90°). Longitude é a distância até o Meridiano de Greenwich (leste ou oeste, de 0° a 180°).', 6, { autor: 'supervisao' }],

  // ---------------- Matemática — 8º ano EF ----------------
  ['O', MAT, 'Potenciação', '8º ano EF', 1, 'Quanto é 2³?', ['6', '8', '9', '5', '16'], 1, '2 × 2 × 2 = 8.'],
  ['O', MAT, 'Potenciação', '8º ano EF', 2, 'Qual é o valor de 5⁰?', ['0', '5', '1', '50', 'não existe'], 2, 'Todo número diferente de zero elevado a zero é igual a 1.'],
  ['O', MAT, 'Geometria plana', '8º ano EF', 2, 'A área de um quadrado de lado 7 cm é:', ['14 cm²', '28 cm²', '49 cm²', '21 cm²', '70 cm²'], 2, '7 × 7 = 49 cm².'],
  ['O', MAT, 'Equações do 1º grau', '8º ano EF', 2, 'Resolva 4x + 2 = 2x + 10. O valor de x é:', ['2', '3', '4', '6', '8'], 2, '4x − 2x = 10 − 2 → 2x = 8 → x = 4.'],
  ['O', MAT, 'Porcentagem', '8º ano EF', 3, 'R$ 1.000,00 foram aplicados a juros simples de 5% ao mês, durante 3 meses. Qual foi o rendimento total?', ['R$ 50,00', 'R$ 100,00', 'R$ 150,00', 'R$ 157,63', 'R$ 300,00'], 2, '5% de 1.000 = 50 por mês; 3 × 50 = 150.'],
  ['O', MAT, 'Geometria plana', '8º ano EF', 3, 'Um triângulo retângulo tem catetos de 6 cm e 8 cm. Quanto mede a hipotenusa?', ['10 cm', '12 cm', '14 cm', '48 cm', '100 cm'], 0, 'Pitágoras: h² = 36 + 64 = 100 → h = 10 cm.', { bncc: ['EF09MA14'] }],
  ['D', MAT, 'Potenciação', '8º ano EF', 3, 'Calcule (−3)² e −3². Explique por que os resultados são diferentes.', '(−3)² = (−3)·(−3) = 9; −3² = −(3·3) = −9. O sinal só faz parte da base quando está dentro dos parênteses.', 6],

  // ---------------- Língua Inglesa — 6º ano EF ----------------
  ['O', ING, 'Greetings', '6º ano EF', 1, 'Qual expressão é usada para dizer “Bom dia” em inglês?', ['Good night', 'Good morning', 'Goodbye', 'Good afternoon', 'See you'], 1],
  ['O', ING, 'Vocabulary', '6º ano EF', 1, 'Como se diz “livro” em inglês?', ['pen', 'table', 'book', 'door', 'bag'], 2],
  ['O', ING, 'Vocabulary', '6º ano EF', 1, 'A cor “blue” significa:', ['vermelho', 'verde', 'azul', 'amarelo', 'preto'], 2],
  ['O', ING, 'Verb to be', '6º ano EF', 2, 'Complete: “She ___ my teacher.”', ['am', 'is', 'are', 'be', 'were'], 1],
  ['O', ING, 'Verb to be', '6º ano EF', 2, 'Complete: “We ___ students.”', ['is', 'am', 'are', 'be', 'was'], 2],
  ['O', ING, 'Vocabulary', '6º ano EF', 3, 'Qual palavra NÃO é um dia da semana?', ['Monday', 'Friday', 'Sunday', 'January', 'Tuesday'], 3, '“January” é um mês (janeiro).'],

  // ---------------- Biologia — 1ª série EM ----------------
  ['O', BIO, 'Citologia', '1ª série EM', 1, 'A estrutura que controla a entrada e a saída de substâncias da célula é a:', ['parede celular', 'membrana plasmática', 'núcleo', 'mitocôndria', 'ribossomo'], 1, null, { autor: 'ana' }],
  ['O', BIO, 'Citologia', '1ª série EM', 2, 'Qual organela realiza a fotossíntese nas células vegetais?', ['mitocôndria', 'cloroplasto', 'lisossomo', 'centríolo', 'vacúolo'], 1, null, { autor: 'ana' }],
  ['O', BIO, 'Citologia', '1ª série EM', 3, 'Organismos procariontes, como as bactérias, NÃO possuem:', ['membrana plasmática', 'ribossomos', 'material genético', 'núcleo delimitado por carioteca', 'citoplasma'], 3, null, { autor: 'ana' }],
  ['O', BIO, 'Genética', '1ª série EM', 2, 'Nas células eucariontes, o DNA está localizado principalmente no:', ['citoplasma', 'núcleo', 'ribossomo', 'complexo golgiense', 'lisossomo'], 1, null, { autor: 'ana' }],
  ['O', BIO, 'Genética', '1ª série EM', 3, 'Do cruzamento Aa × Aa, qual a proporção esperada de descendentes aa?', ['0%', '25%', '50%', '75%', '100%'], 1, 'Quadro de Punnett: AA, Aa, Aa, aa → 1/4 = 25%.', { autor: 'ana' }],
  ['O', BIO, 'Ecologia', '1ª série EM', 2, 'Em uma cadeia alimentar, as plantas são classificadas como:', ['consumidores primários', 'decompositores', 'produtores', 'consumidores secundários', 'parasitas'], 2, null, { autor: 'ana' }],
  ['D', BIO, 'Ecologia', '1ª série EM', 3, 'Explique a importância dos decompositores para os ecossistemas.', 'Fungos e bactérias decompõem a matéria orgânica morta e devolvem os nutrientes ao solo, que são reaproveitados pelos produtores (ciclagem de nutrientes).', 6, { autor: 'ana', status: 'em_revisao' }],

  // ---------------- Física — 1ª série EM ----------------
  ['O', FIS, 'Cinemática', '1ª série EM', 1, 'Um carro percorre 120 km em 2 horas. Sua velocidade média é:', ['240 km/h', '60 km/h', '120 km/h', '30 km/h', '100 km/h'], 1, '120 ÷ 2 = 60 km/h.'],
  ['O', FIS, 'Cinemática', '1ª série EM', 2, 'Quanto vale 72 km/h em m/s?', ['10 m/s', '20 m/s', '36 m/s', '72 m/s', '259 m/s'], 1, 'Divide-se por 3,6: 72 ÷ 3,6 = 20 m/s.'],
  ['O', FIS, 'Leis de Newton', '1ª série EM', 1, 'A tendência de um corpo manter seu estado de repouso ou de movimento é explicada pela:', ['Lei da Inércia (1ª Lei de Newton)', 'Lei da Ação e Reação', 'Lei da Gravitação Universal', 'Lei de Ohm', 'Lei de Hooke'], 0],
  ['O', FIS, 'Leis de Newton', '1ª série EM', 2, 'Uma força resultante de 20 N atua sobre um corpo de 4 kg. A aceleração do corpo é:', ['80 m/s²', '5 m/s²', '16 m/s²', '24 m/s²', '0,2 m/s²'], 1, 'F = m·a → a = 20 ÷ 4 = 5 m/s².'],
  ['O', FIS, 'Leis de Newton', '1ª série EM', 3, 'Ao empurrar uma parede, a pessoa recebe da parede uma força de mesma intensidade e sentido oposto. Isso ilustra a:', ['1ª Lei de Newton', '2ª Lei de Newton', '3ª Lei de Newton (ação e reação)', 'Lei de Kepler', 'Princípio de Pascal'], 2],
  ['D', FIS, 'Cinemática', '1ª série EM', 3, 'Um móvel parte do repouso com aceleração constante de 2 m/s². Calcule sua velocidade após 5 s e a distância percorrida nesse tempo.', 'v = a·t = 2·5 = 10 m/s; d = a·t²/2 = 2·25/2 = 25 m.', 6],

  // ---------------- Química — 2ª série EM ----------------
  ['O', QUI, 'Soluções', '2ª série EM', 1, 'Em uma mistura de água com sal de cozinha, o sal é o:', ['solvente', 'soluto', 'precipitado', 'catalisador', 'reagente limitante'], 1, null, { autor: 'ana' }],
  ['O', QUI, 'Soluções', '2ª série EM', 2, 'Uma solução contém 20 g de soluto em 500 mL de solução. Sua concentração é:', ['10 g/L', '20 g/L', '40 g/L', '100 g/L', '0,04 g/L'], 2, '500 mL = 0,5 L; 20 ÷ 0,5 = 40 g/L.', { autor: 'ana' }],
  ['O', QUI, 'Estequiometria', '2ª série EM', 2, 'Qual é a massa molar da água (H₂O)? Dados: H = 1; O = 16.', ['17 g/mol', '18 g/mol', '32 g/mol', '34 g/mol', '16 g/mol'], 1, '2·1 + 16 = 18 g/mol.', { autor: 'ana' }],
  ['O', QUI, 'Estequiometria', '2ª série EM', 3, 'Na reação 2 H₂ + O₂ → 2 H₂O, quantos mols de água se formam a partir de 4 mols de H₂ (com O₂ suficiente)?', ['2', '4', '6', '8', '1'], 1, 'A proporção H₂ : H₂O é 2 : 2 = 1 : 1.', { autor: 'ana' }],

  // ---------------- Educação Física — 8º ano EF ----------------
  ['O', EF, 'Futsal', '8º ano EF', 1, 'Quantos jogadores de cada equipe ficam em quadra no futsal, contando o goleiro?', ['5', '6', '7', '11', '4'], 0, null, { autor: 'supervisao' }],
  ['O', EF, 'Atletismo', '8º ano EF', 2, 'Qual prova do atletismo combina corrida com saltos sobre obstáculos?', ['maratona', 'corrida com barreiras', 'arremesso de peso', 'salto em altura', 'lançamento de dardo'], 1, null, { autor: 'supervisao' }],
  ['O', EF, 'Saúde e nutrição', '8º ano EF', 2, 'Antes de praticar exercícios intensos, é importante:', ['comer bastante', 'fazer aquecimento', 'ficar parado', 'tomar refrigerante', 'dormir'], 1, null, { autor: 'supervisao' }],
  ['O', EF, 'Voleibol', '8º ano EF', 3, 'No voleibol, o jogador especialista em defesa, que usa camisa de cor diferente da equipe, é o:', ['levantador', 'oposto', 'central', 'líbero', 'ponteiro'], 3, null, { autor: 'supervisao' }],

  // ---------------- Arte — 6º ano EF (avaliação de exemplo do 1º bimestre, com os códigos BNCC do documento) ----------------
  ['O', ARTE, 'Cores', '6º ano EF', 1, 'Quanto à combinação: complementares, concordantes, acordantes e discordantes, monocromáticas, policromáticas e as diferentes harmonias obtidas a partir de combinações com o disco cromático: assinale a alternativa correta dizendo quais são as cores primárias.', ['Vermelho, amarelo e azul', 'Roxo ou púrpura', 'Amarelo-esverdeado, limão', 'Azul-esverdeado, turquesa'], 0, null, { bncc: ['EF69AR04'], valor: 2 }],
  ['O', ARTE, 'Cores', '6º ano EF', 1, 'As cores podem ser classificadas em diferentes categorias. Assinale a alternativa correta dizendo como é a classificação mais comum das cores.', ['Cores primárias, secundárias e terciárias', 'Cromáticas e acromáticas', 'Complementares e concordantes', 'Derivadas do marrom'], 0, null, { bncc: ['EF69AR04'], valor: 2 }],
  ['O', ARTE, 'Cores', '6º ano EF', 2, 'As misturas básicas entre cores primárias resultam em cores secundárias. Assinale a alternativa correta com as cores secundárias.', ['Amarelo-alaranjado', 'Laranja, verde e roxo (ou púrpura)', 'Vermelho-arroxeado', 'Violeta-azulado'], 1, null, { bncc: ['EF69AR04'], valor: 2 }],
  ['O', ARTE, 'Cores', '6º ano EF', 2, 'Harmonia é a combinação entre duas ou mais cores, e há muitas maneiras de combinar as cores. Assinale a alternativa correta sobre a MONOCROMIA.', ['É uma harmonia que conseguimos quando utilizamos somente uma cor com suas variações de tons.', 'É a combinação entre duas ou mais cores.', 'Há muitas maneiras de combinar as cores.', 'A monocromia, a isocromia e a policromia.'], 0, null, { bncc: ['EF15AR02'], valor: 2 }],
  ['O', ARTE, 'Cores', '6º ano EF', 2, 'Há muitas maneiras de combinar as cores. Assinale a alternativa correta sobre a harmonia de POLICROMIA.', ['Uma só cor, chamada de tom sobre tom.', 'É a harmonia conseguida através de várias cores.', 'São colorações obtidas a partir de uma só cor.', 'É a harmonia conseguida através de uma cor e suas matrizes.'], 1, null, { bncc: ['EF15AR02'], valor: 2 }],

  // ---------------- Arte — 7º ano EF ----------------
  ['O', ARTE, 'Artes visuais', '7º ano EF', 1, 'As cores primárias são:', ['azul, amarelo e vermelho', 'verde, laranja e roxo', 'preto, branco e cinza', 'rosa, marrom e bege', 'verde, azul e branco'], 0, null, { bncc: ['EF69AR04'] }],
  ['O', ARTE, 'Artes visuais', '7º ano EF', 2, 'A pintora brasileira Tarsila do Amaral é autora da obra:', ['Abaporu', 'Mona Lisa', 'Guernica', 'A Noite Estrelada', 'O Grito'], 0],
  ['O', ARTE, 'Música', '7º ano EF', 2, 'Qual instrumento musical possui teclas brancas e pretas?', ['violão', 'piano', 'flauta', 'tambor', 'violino'], 1, null, { status: 'rascunho' }],
];

// Habilidade BNCC padrão de cada assunto (chave "Disciplina|Assunto" ou "Disciplina|Assunto|Série").
// Assuntos sem entrada ficam sem habilidade (ex.: Corpo humano no 8º ano), como acontece no dia a dia.
const BNCC_POR_ASSUNTO = {
  'Língua Portuguesa|Classes de palavras': ['EF06LP04'],
  'Língua Portuguesa|Ortografia': ['EF67LP32'],
  'Língua Portuguesa|Sujeito e predicado': ['EF06LP08'],
  'Língua Portuguesa|Interpretação de texto': ['EF67LP06'],
  'Matemática|Frações|6º ano EF': ['EF06MA07'],
  'Matemática|Frações|7º ano EF': ['EF07MA08'],
  'Matemática|Equações do 1º grau': ['EF07MA18'],
  'Matemática|Porcentagem|7º ano EF': ['EF07MA02'],
  'Matemática|Porcentagem|8º ano EF': ['EF08MA04'],
  'Matemática|Geometria plana|7º ano EF': ['EF07MA31'],
  'Matemática|Geometria plana|8º ano EF': ['EF08MA19'],
  'Matemática|Potenciação': ['EF08MA01'],
  'Ciências|Energia': ['EF08CI01'],
  'Ciências|Reprodução': ['EF08CI08'],
  'Ciências|Célula': ['EF06CI05'],
  'História|República': ['EF09HI01'],
  'História|Guerras mundiais': ['EF09HI10'],
  'História|Ditadura militar': ['EF09HI19'],
  'História|Brasil Império': ['EF08HI12'],
  'Geografia|Cartografia': ['EF06GE08'],
  'Geografia|Clima': ['EF06GE03'],
  'Geografia|Relevo': ['EF06GE05'],
  'Geografia|População': ['EF06GE07'],
  'Língua Inglesa|Verb to be': ['EF06LI19'],
  'Língua Inglesa|Vocabulary': ['EF06LI10'],
  'Língua Inglesa|Greetings': ['EF06LI01'],
  'Educação Física|Voleibol': ['EF89EF01'],
  'Educação Física|Futsal': ['EF67EF03'],
  'Educação Física|Atletismo': ['EF67EF03'],
  'Educação Física|Saúde e nutrição': ['EF89EF07'],
  'Arte|Artes visuais': ['EF69AR01'],
  'Arte|Música': ['EF69AR16'],
};

module.exports = { questoes, BNCC_POR_ASSUNTO };
