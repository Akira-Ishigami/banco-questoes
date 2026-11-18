// Revisão pedagógica: supervisão aprova ou devolve questões e provas.
import { api } from '../api.js';
import { esc, $, $$, toast, erro, pedirTexto, dataHoraBR } from '../ui.js';
import { pode, cartaoQuestao, nomeDisciplina, nomeUsuario } from '../estado.js';
import { icone } from '../icones.js';

let aba = null;

export async function telaRevisao(el) {
  const revQ = pode('questoes.revisar');
  const revP = pode('provas.revisar');
  if (!revQ && !revP) {
    el.innerHTML = '<div class="vazio"><strong>Sem acesso</strong>Seu perfil não revisa questões nem provas.</div>';
    return;
  }
  const [qs, ps] = await Promise.all([revQ ? api.get('/questoes') : [], revP ? api.get('/provas') : []]);
  let questoes = qs.filter((q) => q.status === 'em_revisao').sort((a, b) => a.atualizadoEm.localeCompare(b.atualizadoEm));
  const provas = ps.filter((p) => p.status === 'em_revisao').sort((a, b) => a.atualizadoEm.localeCompare(b.atualizadoEm));
  if (!aba || (aba === 'questoes' && !revQ) || (aba === 'provas' && !revP)) aba = revQ && (questoes.length || !provas.length) ? 'questoes' : 'provas';

  el.innerHTML = `
    <div class="cabecalho-pagina"><div><h1>Revisão pedagógica</h1></div></div>
    <div class="abas">
      ${revQ ? `<button data-aba="questoes">Questões (${questoes.length})</button>` : ''}
      ${revP ? `<button data-aba="provas">Provas (${provas.length})</button>` : ''}
    </div>
    <div id="corpo"></div>`;

  const desenhar = () => {
    $$('[data-aba]', el).forEach((b) => b.classList.toggle('ativa', b.dataset.aba === aba));
    const corpo = $('#corpo', el);
    if (aba === 'questoes') {
      corpo.innerHTML = questoes.length
        ? questoes.map((q, i) => cartaoQuestao(q, {
          numero: i + 1, mostrarStatus: false,
          acoes: `<a class="btn btn-sm btn-fantasma" href="#/questoes/${q.id}/editar">Corrigir eu mesmo</a>
                  <button class="btn btn-sm btn-perigo" data-a="devolver">Devolver</button>
                  <button class="btn btn-sm btn-ok" data-a="aprovar">Aprovar</button>`,
        })).join('')
        : `<div class="vazio"><strong>${icone('checkCirculo')} Tudo revisado</strong>Nenhuma questão aguardando revisão.</div>`;
    } else {
      corpo.innerHTML = provas.length ? `
        <div class="tabela-wrap"><table class="tabela tabela-cartoes"><thead><tr><th>Prova</th><th>Disciplina</th><th>Série</th><th>Professor(a)</th><th>Questões</th><th>Enviada em</th><th></th></tr></thead>
        <tbody>${provas.map((p) => {
          const envio = [...p.historico].reverse().find((h) => h.acao.startsWith('enviou'));
          return `<tr>
            <td class="td-titulo"><a class="titulo-linha" href="#/provas/${p.id}">${esc(p.titulo)}</a>${envio && envio.comentario ? `<br><small>“${esc(envio.comentario)}”</small>` : ''}</td>
            <td data-label="Disciplina">${esc(nomeDisciplina(p.disciplinaId))}</td><td data-label="Série">${esc(p.serie)}</td><td data-label="Professor(a)">${esc(nomeUsuario(p.autorId))}</td>
            <td data-label="Questões">${p.itens.length}</td><td data-label="Enviada em"><small>${envio ? dataHoraBR(envio.data) : ''}</small></td>
            <td class="td-acoes"><div class="acoes"><a class="btn btn-sm btn-primario" href="#/provas/${p.id}">Revisar</a></div></td></tr>`;
        }).join('')}</tbody></table></div>`
        : `<div class="vazio"><strong>${icone('checkCirculo')} Tudo revisado</strong>Nenhuma prova aguardando revisão.</div>`;
    }
  };

  $$('[data-aba]', el).forEach((b) => (b.onclick = () => { aba = b.dataset.aba; desenhar(); }));

  $('#corpo', el).addEventListener('click', async (e) => {
    const b = e.target.closest('[data-a]');
    if (!b) return;
    const id = b.closest('.questao').dataset.id;
    try {
      if (b.dataset.a === 'aprovar') {
        await api.post(`/questoes/${id}/revisar`, { decisao: 'aprovar' });
        toast('Questão aprovada — já está no banco.', 'ok');
      } else {
        const c = await pedirTexto('Devolver questão', 'O que precisa ser ajustado?', { obrigatorio: true, textoOk: 'Devolver', classe: 'btn-caneta' });
        if (!c) return;
        await api.post(`/questoes/${id}/revisar`, { decisao: 'devolver', comentario: c });
        toast('Questão devolvida ao autor.');
      }
      questoes = questoes.filter((q) => q.id !== id);
      $('[data-aba="questoes"]', el).textContent = `Questões (${questoes.length})`;
      desenhar();
    } catch (er) {
      erro(er);
    }
  });

  desenhar();
}
