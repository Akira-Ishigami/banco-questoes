# Banco de Questões · PEI

Sistema web para a escola manter um banco de questões compartilhado e produzir avaliações, com fluxo de trabalho entre professores, supervisão/coordenação e direção.

```
Professor(a) cadastra a questão ──► Supervisão revisa ──► questão aprovada entra no banco
                                                              │
Professor(a) monta a prova (automática ou manual) ◄───────────┘
        │
        └──► Supervisão aprova a prova ──► Direção imprime e registra
```

Desenvolvido sem frameworks nem dependências externas: servidor em **Node.js** (apenas módulos nativos) e interface em **HTML, CSS e JavaScript**. Os dados ficam em um único arquivo (`data/db.json`), o que facilita instalação, backup e manutenção na escola.

---

## Sumário

1. [Funcionalidades](#funcionalidades)
2. [Requisitos](#requisitos)
3. [Instalação e execução](#instalação-e-execução)
4. [Primeiro acesso](#primeiro-acesso)
5. [Perfis e permissões](#perfis-e-permissões)
6. [Importação de questões](#importação-de-questões)
7. [Backup](#backup)
8. [Segurança e privacidade](#segurança-e-privacidade)
9. [Estrutura do projeto](#estrutura-do-projeto)
10. [Limitações conhecidas e próximos passos](#limitações-conhecidas-e-próximos-passos)
11. [Licenças e créditos](#licenças-e-créditos)

---

## Funcionalidades

### Questões
- Questões **objetivas** (2 a 6 alternativas, com a alternativa correta marcada) e **discursivas** (enunciado e número de linhas para resposta; a resposta esperada é opcional).
- Classificação obrigatória por **disciplina, série/ano e dificuldade**; assunto, origem, fonte e **valor em pontos** opcionais.
- **Habilidades da BNCC** (ex.: `EF69AR04`) com busca por código ou palavra-chave em um catálogo de **1.397 habilidades** da Educação Infantil e do Ensino Fundamental. Códigos do Ensino Médio (ex.: `EM13LGG101`) são aceitos por digitação. Ao colar um enunciado que já contém o código, o sistema oferece cadastrá-lo.
- Editor com negrito, itálico, sobrescrito, subscrito, listas e **imagens** (inclusive colagem com Ctrl+V). Suporte a questões cujas alternativas estão dentro de uma imagem.
- Banco com filtros por disciplina, assunto, série, tipo, dificuldade, origem, autor, situação, **habilidade BNCC** e texto.

### Provas
- **Geração automática:** sorteio entre questões aprovadas da disciplina, série e dificuldade escolhidas, com filtro opcional por assuntos e **habilidades BNCC**. A dificuldade "Mista" equilibra questões fáceis, médias e difíceis. O sorteio prioriza questões ainda não usadas em outras provas da mesma série. Cada questão pode ser trocada individualmente por outra equivalente.
- **Montagem manual:** o banco abre filtrado para a prova e o professor seleciona as questões.
- Organização da ordem, valor de cada questão com soma automática e verificação contra o valor total, até **4 versões embaralhadas** (A–D) e embaralhamento de alternativas.

### Revisão e fluxo
- Supervisão aprova ou devolve questões e provas com comentário; tudo fica registrado no histórico.
- Prova aprovada fica **congelada**: alterações posteriores no banco não a modificam.
- Fila de impressão para a direção, ordenada pela data de aplicação, com registro da impressão.

### Impressão
- Folha A4 com cabeçalho da escola (logo da escola e do PEI), campos do aluno, marcação de turma quando a prova atende várias turmas e código BNCC antes de cada questão.
- **Fonte configurável** (Arial por padrão; também Times New Roman, Verdana e Public Sans) e tamanho de 11 a 14 pt.
- **Cartão-resposta** e **gabarito do professor** no mesmo formato do cartão, com a alternativa correta preenchida.
- Exportação em PDF pela janela de impressão do navegador ("Salvar como PDF").

### Uso e acessibilidade
- Interface responsiva para computador, tablet e celular.
- Ajuste do tamanho do texto (A / A+ / A++), navegação por teclado e respeito à preferência de "reduzir animações".
- **Tutorial** com passo a passo por perfil, perguntas frequentes e link "Ajuda desta tela" em todas as telas.

---

## Requisitos

- **Node.js 22** ou superior ([nodejs.org](https://nodejs.org)).
- Um computador da escola para atuar como servidor, acessível pelos demais na rede local.
- Navegador atualizado (Chrome, Edge ou Firefox) nos computadores dos usuários.

Não é necessário acesso à internet: fontes, ícones e catálogo da BNCC são servidos pelo próprio sistema.

---

## Instalação e execução

```bash
npm install      # opcional — o projeto não possui dependências
npm start        # inicia o servidor (equivale a: node server.js)
```

No Windows também é possível iniciar com duplo clique em `iniciar.bat`.

O terminal exibe os endereços de acesso:

```
Neste computador:   http://localhost:3000
Na rede da escola:  http://192.168.0.10:3000
```

| Comando | Uso |
|---|---|
| `npm start` | Execução normal. |
| `npm run dev` | Desenvolvimento: reinicia ao salvar `server.js` ou `seed.js`. |
| `npm run reset` | Apaga os dados (com o servidor parado). O próximo início recria o banco com os dados de exemplo. |

Para usar outra porta: `PORT=8080 npm start` (PowerShell: `$env:PORT=8080; npm start`).

---

## Primeiro acesso

Na primeira execução o sistema cria o banco com contas e dados de demonstração:

| Perfil | Usuário | Senha |
|---|---|---|
| Direção | `direcao` | `direcao123` |
| Supervisão / Coordenação | `supervisao` | `supervisao123` |
| Professor(a) | `professor` | `professor123` |
| Professora (Ciências, Biologia, Química) | `ana` | `ana123` |

> **Importante:** antes do uso real, cadastre os usuários da escola e **desative ou troque a senha das contas de demonstração** em *Usuários*.

**Dados de exemplo:** 103 questões em 11 disciplinas (do 6º ano ao ensino médio), 80 delas com habilidade BNCC, e 6 provas em todas as etapas do fluxo. Há questões suficientes para testar o sorteio em Língua Portuguesa (6º ano), Ciências (8º), História (9º) e Matemática (7º e 8º). Para incluir os exemplos em um banco já em uso, importe `importacao/questoes_exemplo.json`.

Recomenda-se configurar, nesta ordem: **Configurações › Escola e cabeçalho** (nome, logo, fonte das provas), **Séries e turmas**, **Disciplinas e assuntos** e **Usuários**.

---

## Perfis e permissões

Configuração padrão (ajustável pela direção em *Configurações › Permissões por perfil*):

| Ação | Professor(a) | Supervisão | Direção |
|---|:---:|:---:|:---:|
| Cadastrar questões | ✔ | ✔ | ✔ |
| Montar provas | ✔ | ✔ | ✔ |
| Aprovar ou devolver questões e provas | | ✔ | ✔ |
| Editar questões de outros usuários | | ✔ | ✔ |
| Imprimir provas aprovadas | | | ✔ |
| Usuários, configurações e backup | | | ✔ |

A direção sempre mantém o acesso a usuários e configurações, para que o sistema não fique sem administrador.

---

## Importação de questões

Em *Configurações › Backup e importação › Importar questões*, o sistema aceita um arquivo JSON no formato:

```json
{
  "questoes": [
    {
      "disciplina": "Arte", "assunto": "Cores", "serie": "6º ano EF", "dificuldade": 1,
      "tipo": "objetiva", "enunciado": "<p>Quais são as cores primárias?</p>",
      "alternativas": [{ "texto": "Vermelho, amarelo e azul", "correta": true }, { "texto": "Roxo" }],
      "bncc": ["EF69AR04"], "valor": 2
    }
  ]
}
```

Disciplinas e assuntos inexistentes são criados automaticamente, e as questões importadas entram como aprovadas.

**Pendrive SmartProfessor.** O script `tools/importar_smartprof.py` converte o banco do pendrive (SQLite + arquivos RTF, com conversão das imagens WMF) para esse formato. O arquivo convertido (`importacao/questoes_smartprof.json`, 698 questões) é gerado localmente e **não é publicado no repositório**, por ser material licenciado.

```bash
python tools/importar_smartprof.py D:\MOD2\DB questoes_smartprof.json
```

**Catálogo da BNCC.** O arquivo `public/dados/bncc.json` foi gerado a partir do documento oficial da BNCC pelo script `tools/extrair_bncc.py` e pode ser regenerado com uma versão mais recente do documento.

---

## Backup

Todo o conteúdo do sistema (usuários, questões, provas e configurações) está em `data/db.json`.

- **Pelo sistema:** *Configurações › Backup e importação › Baixar backup*. Recomenda-se fazer semanalmente e guardar fora do servidor.
- **Restauração:** na mesma tela. Antes de restaurar, o sistema salva uma cópia do estado atual em `data/`.
- O arquivo é gravado de forma atômica (arquivo temporário + renomeação), o que evita corrompê-lo em caso de queda de energia durante a gravação.

---

## Segurança e privacidade

- Senhas armazenadas com **scrypt** e sal individual; nunca são guardadas em texto.
- Sessão por cookie `HttpOnly` e `SameSite=Lax`, com validade de 12 horas.
- **Bloqueio temporário** de 15 minutos após 8 tentativas de senha incorretas seguidas no mesmo computador.
- Todas as permissões são verificadas no servidor, não apenas na interface.
- Conteúdo das questões é sanitizado antes de ser exibido (sem scripts ou atributos perigosos).
- Cabeçalhos de segurança (Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy).
- Nenhum recurso é carregado de serviços externos: o sistema não envia dados de uso a terceiros.

**Recomendação:** utilize o sistema apenas na rede interna da escola. Para acesso pela internet, publique-o atrás de um proxy reverso com HTTPS.

---

## Estrutura do projeto

```
server.js                 servidor HTTP, API, regras de negócio e permissões
seed.js                   criação do banco na primeira execução
dados-exemplo.js          questões de exemplo e habilidades BNCC por assunto
data/db.json              banco de dados (criado automaticamente)
public/
  index.html
  css/app.css             interface (identidade visual do PEI)
  css/impressao.css       folhas A4: prova, cartão-resposta e gabarito
  fonts/                  Public Sans (hospedada localmente) e licença
  dados/bncc.json         catálogo de habilidades da BNCC
  img/                    logo e ícone do PEI
  js/app.js               login, navegação, menu por perfil e painel
  js/estado.js            estado global, componentes compartilhados e prova em montagem
  js/ui.js                utilitários: modal, avisos, editor de texto, sanitização
  js/icones.js            conjunto de ícones SVG
  js/bncc.js              catálogo, busca e campo de habilidades BNCC
  js/sorteio.js           algoritmo de geração automática de provas
  js/telas/               telas: banco, questão, provas, revisão, impressão, administração, tutorial
tools/
  importar_smartprof.py   conversor do pendrive SmartProfessor
  extrair_bncc.py         gerador do catálogo da BNCC
importacao/               arquivos prontos para importar
```

---

## Limitações conhecidas e próximos passos

| Limitação atual | Evolução sugerida |
|---|---|
| Banco em arquivo JSON, adequado a uma escola | Migrar para SQLite ou PostgreSQL ao atender várias escolas |
| Sessões em memória: reiniciar o servidor desconecta os usuários | Persistir sessões no banco |
| Sem HTTPS nativo | Proxy reverso com certificado (ex.: Caddy, Nginx) |
| Imagens armazenadas dentro do banco (reduzidas a 900 px) | Armazenamento de arquivos separado |
| Fórmulas matemáticas apenas como imagem | Editor de fórmulas (ex.: MathML/LaTeX) |

---

## Licenças e créditos

- **Public Sans** — fonte de uso livre (SIL Open Font License 1.1), desenvolvida pela GSA/USWDS. Licença em `public/fonts/LICENCA-PublicSans.md`.
- **BNCC** — Base Nacional Comum Curricular, documento público do Ministério da Educação.
- **Logo do PEI** — Programa de Educação Integral; utilizado para identificação institucional das escolas participantes.
- **Conteúdo do SmartProfessor** — material licenciado pela Smart Editora; uso restrito à escola detentora da licença.
