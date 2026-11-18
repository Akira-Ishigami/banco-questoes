"""
Converte o banco de questões do pendrive SmartProfessor (MOD2/DB) para o formato
de importação do Banco de Questões ({"questoes": [...]}).

Uso:
    python tools/importar_smartprof.py D:\\MOD2\\DB questoes_smartprof.json

Depois, no sistema: Configurações -> Backup e importação -> Importar questões.

Estrutura lida (engenharia reversa do SmartProfessor):
    Dados.s3db  -> tabelas tborigens, tbdisciplinas, tbassuntos, tbtipos, tbquestoes
    {origem}/{disciplina}/{assunto}/{tipo}/{id}_questao.rtf   enunciado + alternativas
    {origem}/{disciplina}/{assunto}/{tipo}/{id}_resposta.rtf  gabarito (letra ou texto)

Atenção: o conteúdo do pendrive é material licenciado da Smart Editora. Importe apenas
para uso interno da escola que adquiriu a licença.
"""
import base64
import difflib
import html
import json
import os
import re
import sqlite3
import sys

# --------------------------------------------------------------------------
# RTF -> texto (com imagens PNG/JPEG embutidas)
# --------------------------------------------------------------------------
TOKEN = re.compile(
    # o 7º grupo pega blocos longos de hexadecimal (dados de imagem) de uma vez — muito mais rápido
    r"\\([a-z]{1,32})(-?\d{1,10})?[ ]?|\\'([0-9a-f]{2})|\\([^a-z])|([{}])|([0-9a-f][0-9a-f\r\n]{31,})|[\r\n]+|(.)",
    re.I | re.S,
)
DESTINOS_IGNORADOS = {
    "aftncn", "aftnsep", "aftnsepc", "annotation", "atnauthor", "atndate", "atnicn", "atnid", "atnparent", "atnref",
    "atntime", "atrfend", "atrfstart", "author", "background", "bkmkend", "bkmkstart", "blipuid", "buptim", "category",
    "colorschememapping", "colortbl", "comment", "company", "creatim", "datafield", "datastore", "defchp", "defpap",
    "do", "doccomm", "docvar", "dptxbxtext", "ebcend", "ebcstart", "factoidname", "falt", "fchars", "ffdeftext",
    "ffentrymcr", "ffexitmcr", "ffformat", "ffhelptext", "ffl", "ffname", "ffstattext", "file", "filetbl", "fldinst",
    "fldtype", "fname", "fontemb", "fontfile", "fonttbl", "footer", "footerf", "footerl", "footerr", "footnote",
    "formfield", "ftncn", "ftnsep", "ftnsepc", "g", "generator", "gridtbl", "header", "headerf", "headerl", "headerr",
    "hl", "hlfr", "hlinkbase", "hlloc", "hlsrc", "hsv", "htmltag", "info", "keycode", "keywords", "latentstyles",
    "lchars", "levelnumbers", "leveltext", "lfolevel", "linkval", "list", "listlevel", "listname", "listoverride",
    "listoverridetable", "listpicture", "liststylename", "listtable", "listtext", "lsdlockedexcept", "macc", "maccPr",
    "mailmerge", "maln", "malnScr", "manager", "margPr", "mbar", "mbarPr", "mbaseJc", "mbegChr", "mborderBox",
    "mborderBoxPr", "mbox", "mboxPr", "mchr", "mcount", "mctrlPr", "md", "mdeg", "mdegHide", "mden", "mdiff", "mdPr",
    "me", "mendChr", "meqArr", "meqArrPr", "mf", "mfName", "mfPr", "mfunc", "mfuncPr", "mgroupChr", "mgroupChrPr",
    "mgrow", "mhideBot", "mhideLeft", "mhideRight", "mhideTop", "mhtmltag", "mlim", "mlimloc", "mlimlow",
    "mlimlowPr", "mlimupp", "mlimuppPr", "mm", "mmaddfieldname", "mmath", "mmathPict", "mmathPr", "mmaxdist", "mmc",
    "mmcJc", "mmconnectstr", "mmconnectstrdata", "mmcPr", "mmcs", "mmdatasource", "mmheadersource", "mmmailsubject",
    "mmodso", "mmodsofilter", "mmodsofldmpdata", "mmodsomappedname", "mmodsoname", "mmodsorecipdata", "mmodsosort",
    "mmodsosrc", "mmodsotable", "mmodsoudl", "mmodsoudldata", "mmodsouniquetag", "mmPr", "mmquery", "mmr", "mnary",
    "mnaryPr", "mnoBreak", "mnum", "mobjDist", "moMath", "moMathPara", "moMathParaPr", "mopEmu", "mphant", "mphantPr",
    "mplcHide", "mpos", "mr", "mrad", "mradPr", "mrPr", "msepChr", "mshow", "mshp", "msPre", "msPrePr", "msSub",
    "msSubPr", "msSubSup", "msSubSupPr", "msSup", "msSupPr", "mstrikeBLTR", "mstrikeH", "mstrikeTLBR", "mstrikeV",
    "msub", "msubHide", "msup", "msupHide", "mtransp", "mtype", "mvertJc", "mvfmf", "mvfml", "mvtof", "mvtol",
    "mzeroAsc", "mzeroDesc", "mzeroWid", "nesttableprops", "nextfile", "nonesttables", "objalias", "objclass",
    "objdata", "object", "objname", "objsect", "objtime", "oldcprops", "oldpprops", "oldsprops", "oldtprops",
    "oleclsid", "operator", "panose", "password", "passwordhash", "pgp", "pgptbl", "picprop", "pn", "pnseclvl",
    "pntext", "pntxta", "pntxtb", "printim", "private", "propname", "protend", "protstart", "protusertbl", "pxe",
    "result", "revtbl", "revtim", "rsidtbl", "rxe", "shp", "shpgrp", "shpinst", "shppict", "shprslt", "shptxt",
    "sn", "sp", "staticval", "stylesheet", "subject", "sv", "svb", "tc", "template", "themedata", "title", "txe", "ud",
    "upr", "userprops", "wgrffmtfilter", "windowcaption", "writereservation", "writereservhash", "xe", "xform",
    "xmlattrname", "xmlattrvalue", "xmlclose", "xmlname", "xmlnstbl", "xmlopen",
}
ESPECIAIS = {
    "par": "\n", "sect": "\n\n", "page": "\n\n", "line": "\n", "tab": " ", "emdash": "\u2014", "endash": "\u2013",
    "emspace": "\u2003", "enspace": "\u2002", "qmspace": "\u2005", "bullet": "\u2022", "lquote": "\u2018",
    "rquote": "\u2019", "ldblquote": "\u201c", "rdblquote": "\u201d", "row": "\n", "cell": " ", "nestcell": " ",
}


def wmf_para_data_uri(dados, dim, dpi=110):
    """Converte Windows Metafile (sem cabeçalho) em PNG/JPEG. Precisa do Pillow no Windows."""
    try:
        import io
        import struct
        from PIL import Image
    except ImportError:
        return None
    # tamanho desejado em twips (1/1440 pol.); sem ele, usa HIMETRIC (0,01 mm) convertido
    w = dim.get("picwgoal") or int(dim.get("picw", 7620) * 1440 / 2540)
    h = dim.get("pichgoal") or int(dim.get("pich", 5080) * 1440 / 2540)
    w, h = max(1, min(w, 32000)), max(1, min(h, 32000))
    # cabeçalho "placeable WMF" (Aldus) que o RTF não guarda
    cab = struct.pack("<IHhhhhHI", 0x9AC6CDD7, 0, 0, 0, w, h, 1440, 0)
    soma = 0
    for (palavra,) in struct.iter_unpack("<H", cab):
        soma ^= palavra
    cab += struct.pack("<H", soma)
    try:
        im = Image.open(io.BytesIO(cab + dados))
        im.load(dpi=dpi)
        im = im.convert("RGB")
        if max(im.size) > 900:
            im.thumbnail((900, 900))
        png, jpg = io.BytesIO(), io.BytesIO()
        im.save(png, "PNG", optimize=True)
        im.save(jpg, "JPEG", quality=82)
        if png.tell() <= jpg.tell() * 1.3:
            return "data:image/png;base64," + base64.b64encode(png.getvalue()).decode()
        return "data:image/jpeg;base64," + base64.b64encode(jpg.getvalue()).decode()
    except Exception:
        return None


def rtf_para_partes(rtf):
    """Retorna lista de strings e dicts {'img': dataURI}. Quebras de linha são '\\n'."""
    pilha = []
    ignorar = False
    uc = 1
    pular = 0
    saida = []
    pict = None  # {'tipo': 'png'|'jpeg'|None, 'hex': [], 'nivel': n}
    for m in TOKEN.finditer(rtf):
        palavra, arg, hexa, char, chave, bloco, txt = m.groups()
        if bloco:
            if pict is not None:
                pict["hex"].append(bloco.replace("\r", "").replace("\n", ""))
                continue
            txt = bloco.replace("\r", "").replace("\n", "")  # texto comum que parece hex (ex.: número longo)
            if pular > 0:
                pular, txt = 0, txt[pular:]
            if not ignorar:
                saida.append(txt)
            continue
        if chave:
            pular = 0
            if chave == "{":
                pilha.append((uc, ignorar, pict is not None))
            elif chave == "}":
                if pict is not None and len(pilha) == pict["nivel"]:
                    if pict["tipo"] and pict["hex"]:
                        try:
                            dados = bytes.fromhex("".join(pict["hex"]))
                            if pict["tipo"] == "wmf":
                                uri = wmf_para_data_uri(dados, pict["dim"])
                            else:
                                uri = f"data:image/{pict['tipo']};base64," + base64.b64encode(dados).decode()
                            saida.append({"img": uri} if uri else {"img_falhou": True})
                        except ValueError:
                            saida.append({"img_falhou": True})
                    pict = None
                if pilha:
                    uc, ignorar, _ = pilha.pop()
        elif char:
            pular = 0
            if char == "~":
                if not ignorar:
                    saida.append("\u00a0")
            elif char in "{}\\":
                if not ignorar:
                    saida.append(char)
            elif char == "*":
                ignorar = True
            elif char == "_":
                if not ignorar:
                    saida.append("-")
            elif char in "\r\n":
                if not ignorar:
                    saida.append("\n")
        elif palavra:
            pular = 0
            if palavra == "pict":
                pict = {"tipo": None, "hex": [], "nivel": len(pilha), "dim": {}}
                ignorar = False
                continue
            if pict is not None:
                if palavra == "pngblip":
                    pict["tipo"] = "png"
                elif palavra == "jpegblip":
                    pict["tipo"] = "jpeg"
                elif palavra == "wmetafile":
                    pict["tipo"] = "wmf"
                elif palavra in ("picwgoal", "pichgoal", "picw", "pich") and arg:
                    pict["dim"][palavra] = int(arg)
                continue
            if palavra in DESTINOS_IGNORADOS:
                ignorar = True
            elif ignorar:
                pass
            elif palavra in ESPECIAIS:
                saida.append(ESPECIAIS[palavra])
            elif palavra == "uc":
                uc = int(arg)
            elif palavra == "u":
                c = int(arg)
                if c < 0:
                    c += 0x10000
                saida.append(chr(c))
                pular = uc
        elif hexa:
            if pular > 0:
                pular -= 1
            elif not ignorar:
                saida.append(bytes([int(hexa, 16)]).decode("cp1252", errors="replace"))
        elif txt:
            if pict is not None:
                if txt.strip():
                    pict["hex"].append(txt)
            elif pular > 0:
                pular -= 1
            elif not ignorar:
                saida.append(txt)
    # junta strings adjacentes
    partes = []
    for p in saida:
        if isinstance(p, str) and partes and isinstance(partes[-1], str):
            partes[-1] += p
        else:
            partes.append(p)
    return partes


def ler_rtf(caminho):
    with open(caminho, "rb") as f:
        # os arquivos do SmartProfessor terminam com um byte nulo depois do "}"
        return rtf_para_partes(f.read().decode("latin-1").replace("\x00", ""))


def partes_para_linhas(partes):
    """Converte em lista de linhas; cada linha é lista de strings/imagens."""
    linhas = [[]]
    for p in partes:
        if isinstance(p, dict):
            linhas[-1].append(p)
            continue
        pedacos = p.split("\n")
        for i, pedaco in enumerate(pedacos):
            if i > 0:
                linhas.append([])
            if pedaco:
                linhas[-1].append(pedaco)
    return linhas


def texto_da_linha(linha):
    return "".join(x for x in linha if isinstance(x, str)).strip()


def linhas_para_html(linhas):
    paragrafos = []
    for linha in linhas:
        trechos = []
        for x in linha:
            if isinstance(x, dict):
                if "img" in x:
                    trechos.append(f'<img src="{x["img"]}">')
            else:
                trechos.append(html.escape(x))
        conteudo = "".join(trechos).strip()
        if conteudo:
            paragrafos.append(f"<p>{conteudo}</p>")
    return "".join(paragrafos)


ALT = re.compile(r"^\s*\(?\s*([a-eA-E])\s*[\)\.\-\u2013]\s*(.*)$", re.S)


def separar_alternativas(linhas):
    """Procura a sequência final a) b) c) ... nas linhas. Retorna (linhas_enunciado, [textos])."""
    marcas = []
    for i, linha in enumerate(linhas):
        m = ALT.match(texto_da_linha(linha))
        if m:
            marcas.append((i, m.group(1).lower(), m.group(2).strip()))
    # procura, de trás para frente, um "a" seguido de b, c, ... em ordem
    for k in range(len(marcas) - 1, -1, -1):
        if marcas[k][1] != "a":
            continue
        seq = [marcas[k]]
        for prox in marcas[k + 1:]:
            if ord(prox[1]) == ord(seq[-1][1]) + 1:
                seq.append(prox)
        if len(seq) >= 2:
            alts = []
            for j, (idx, _, texto) in enumerate(seq):
                fim = seq[j + 1][0] if j + 1 < len(seq) else len(linhas)
                extra = [texto_da_linha(l) for l in linhas[idx + 1:fim]]
                alts.append(" ".join([texto] + [e for e in extra if e]).strip())
            return linhas[: seq[0][0]], alts
    return linhas, []


# --------------------------------------------------------------------------
# Mapeamentos do SmartProfessor -> Banco de Questões
# --------------------------------------------------------------------------
NOMES_DISCIPLINA = {
    "ED FÍSICA": "Educação Física",
    "ED FISICA": "Educação Física",
}


def nome_disciplina(nome):
    nome = nome.strip()
    if nome.upper().startswith("LINGUAGENS"):
        return "Linguagens, Códigos e suas Tecnologias"
    if nome.upper() in NOMES_DISCIPLINA:
        return NOMES_DISCIPLINA[nome.upper()]
    nome = re.sub(r"\s*\[.*$", "", nome)  # remove sufixos tipo "[ENEM]"
    minusculas = {"e", "de", "da", "do", "das", "dos", "suas"}
    return " ".join(p.lower() if p.lower() in minusculas and i else p.capitalize() for i, p in enumerate(nome.split()))


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    pasta_db, destino = sys.argv[1], sys.argv[2]
    banco = os.path.join(pasta_db, "Dados.s3db")
    if not os.path.exists(banco):
        sys.exit(f"Não encontrei {banco}")
    con = sqlite3.connect(f"file:{banco}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    origens = {r["idorigem"]: r["origem"] for r in con.execute("select * from tborigens")}
    disciplinas = {r["iddisciplina"]: r["disciplina"] for r in con.execute("select * from tbdisciplinas")}
    assuntos = {(r["idassunto"], r["iddisciplina"], r["idorigem"]): r["assunto"] for r in con.execute("select * from tbassuntos")}

    questoes, problemas = [], {}

    def problema(motivo):
        problemas[motivo] = problemas.get(motivo, 0) + 1

    linhas_db = con.execute("select * from tbquestoes where ativo = 1 order by idorigem, iddisciplina, idassunto, idquestao").fetchall()
    for n, r in enumerate(linhas_db, 1):
        if n % 100 == 0:
            print(f"  {n}/{len(linhas_db)}…", flush=True)
        base = os.path.join(pasta_db, str(r["idorigem"]), str(r["iddisciplina"]), str(r["idassunto"]), str(r["idtipo"]), str(r["idquestao"]))
        arq_q, arq_r = base + "_questao.rtf", base + "_resposta.rtf"
        if not os.path.exists(arq_q):
            problema("arquivo da questão não encontrado")
            continue
        partes_q = ler_rtf(arq_q)
        partes_r = ler_rtf(arq_r) if os.path.exists(arq_r) else []
        if any(isinstance(p, dict) and "img_falhou" in p for p in partes_q + partes_r):
            problema("imagem não pôde ser convertida (precisa do Pillow no Windows)")
            continue
        linhas = partes_para_linhas(partes_q)
        resposta_linhas = partes_para_linhas(partes_r)
        resposta_txt = " ".join(texto_da_linha(l) for l in resposta_linhas).strip()

        origem = origens.get(r["idorigem"], "").upper()
        assunto = assuntos.get((r["idassunto"], r["iddisciplina"], r["idorigem"]), "")
        item = {
            "disciplina": nome_disciplina(disciplinas.get(r["iddisciplina"], "Sem disciplina")),
            "dificuldade": 2,
            "referencia": f"SmartProfessor {r['idorigem']}/{r['iddisciplina']}/{r['idassunto']}/{r['idtipo']}/{r['idquestao']}",
        }
        if origem == "ENEM":
            item.update(origem="ENEM", fonte=assunto, serie="3ª série EM")
        elif origem == "PROVAS":
            item.update(origem="Vestibular", fonte=assunto)
        else:
            item.update(origem="Livro didático", fonte="SmartProfessor", assunto=assunto.capitalize() if assunto.isupper() else assunto)

        enunciado_linhas, alternativas = separar_alternativas(linhas)
        if re.match(r"^\s*1\s*[-–).]", resposta_txt) and re.search(r"\b2\s*[-–).]", resposta_txt):
            problema("bloco com várias questões num só arquivo (ex.: '1- Letra C 2- Letra D')")
            continue
        # aceita "B", "(B)", "Letra B", "Alternativa B.", "Resposta: B"
        letra = re.match(r"^\s*(?:letra|alternativa|resposta|gabarito)?\s*[:\-–]?\s*\(?\s*([A-Ea-e])\s*\)?\s*\.?\s*$", resposta_txt, re.I)
        resolucao = ""
        if alternativas and not letra and resposta_txt:
            # resposta veio como texto: procura a alternativa mais parecida
            alvo = resposta_txt.lower()
            notas = [difflib.SequenceMatcher(None, alvo, a.lower()).ratio() for a in alternativas]
            melhor = max(range(len(notas)), key=lambda i: notas[i])
            if notas[melhor] >= 0.6 or (len(alternativas[melhor]) > 15 and alternativas[melhor].lower() in alvo):
                letra = re.match(r"(.)", chr(ord("a") + melhor))
                resolucao = resposta_txt if notas[melhor] < 0.95 else ""
        if alternativas and letra:
            item["resolucao"] = resolucao
            idx = ord(letra.group(1).lower()) - ord("a")
            if idx >= len(alternativas):
                problema("gabarito aponta alternativa inexistente")
                continue
            item.update(
                tipo="objetiva",
                enunciado=linhas_para_html(enunciado_linhas),
                alternativas=[{"texto": t, "correta": i == idx} for i, t in enumerate(alternativas[:6])],
            )
        elif letra and r["idtipo"] != 2:
            # alternativas desenhadas dentro de imagem/enunciado: guarda só a letra do gabarito
            idx = ord(letra.group(1).lower()) - ord("a")
            total = max(5, idx + 1)
            item.update(
                tipo="objetiva",
                enunciado=linhas_para_html(linhas),
                alternativasNoEnunciado=True,
                alternativas=[{"texto": chr(65 + i), "correta": i == idx} for i in range(total)],
            )
        elif r["idtipo"] == 1 and not resposta_txt:
            problema("objetiva sem gabarito no material")
            continue
        elif r["idtipo"] == 1:
            problema("gabarito em texto que não corresponde a nenhuma alternativa")
            continue
        else:
            # discursiva não precisa de gabarito; se o material trouxer resposta, vira orientação de correção
            item.update(tipo="discursiva", enunciado=linhas_para_html(linhas),
                        respostaEsperada=linhas_para_html(resposta_linhas) if resposta_txt else "", linhas=6)
        if not item["enunciado"]:
            problema("enunciado vazio")
            continue
        questoes.append(item)

    # divide em arquivos de até ~15 MB (o servidor aceita até 25 MB por envio)
    lotes, atual, tamanho = [], [], 0
    for q in questoes:
        t = len(json.dumps(q, ensure_ascii=False).encode("utf-8"))
        if atual and tamanho + t > 15 * 1024 * 1024:
            lotes.append(atual)
            atual, tamanho = [], 0
        atual.append(q)
        tamanho += t
    if atual:
        lotes.append(atual)
    raiz, ext = os.path.splitext(destino)
    arquivos = []
    for i, lote in enumerate(lotes, 1):
        nome = destino if len(lotes) == 1 else f"{raiz}_{i}{ext or '.json'}"
        with open(nome, "w", encoding="utf-8") as f:
            json.dump({"fonte": "SmartProfessor (pendrive)", "questoes": lote}, f, ensure_ascii=False)
        arquivos.append(f"{nome} ({len(lote)} questões, {os.path.getsize(nome) / 1048576:.1f} MB)")

    print(f"\n{len(questoes)} questões convertidas de {len(linhas_db)}:")
    for a in arquivos:
        print("  " + a)
    if problemas:
        print("Ignoradas:")
        for motivo, qtd in sorted(problemas.items(), key=lambda x: -x[1]):
            print(f"  {qtd:5d}  {motivo}")


if __name__ == "__main__":
    main()
