"""
Gera public/dados/bncc.json (catálogo de habilidades da BNCC: código + descrição) a partir do PDF oficial.

Uso:
    python tools/extrair_bncc.py D:\\BNCC_EI_EF_110518_versaofinal.pdf public/dados/bncc.json

Precisa do pypdf (pip install pypdf). O PDF da BNCC traz Educação Infantil (EI...) e Ensino
Fundamental (EF...). Códigos do Ensino Médio (EM13...) não estão nesse PDF: no sistema eles
podem ser digitados à mão.
"""
import json
import re
import sys

import pypdf

COD = re.compile(r"\((E[FI]\d{2}[A-Z]{2}\d{2})\)")
COMPONENTES = {"LP": "Língua Portuguesa", "AR": "Arte", "EF": "Educação Física", "LI": "Língua Inglesa", "MA": "Matemática",
               "CI": "Ciências", "GE": "Geografia", "HI": "História", "ER": "Ensino Religioso"}
CAMPOS_EI = {"EO": "O eu, o outro e o nós", "CG": "Corpo, gestos e movimentos", "TS": "Traços, sons, cores e formas",
             "EF": "Escuta, fala, pensamento e imaginação", "ET": "Espaços, tempos, quantidades, relações e transformações"}


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    leitor = pypdf.PdfReader(sys.argv[1])
    paginas = []
    for i, p in enumerate(leitor.pages):
        try:
            paginas.append(p.extract_text() or "")
        except Exception:
            paginas.append("")
        if i % 100 == 0:
            print(f"  página {i}/{len(leitor.pages)}", flush=True)
    t = "\n".join(paginas)
    t = re.sub(r"-\n(?=[a-zà-ú])", "", t)          # palavras hifenizadas na quebra de linha
    t = re.sub(r"[ \t]*\n[ \t]*", " ", t)
    t = re.sub(r"\s{2,}", " ", t)

    habilidades = {}
    partes = COD.split(t)                            # [antes, código, texto, código, texto, ...]
    for k in range(1, len(partes) - 1, 2):
        codigo, desc = partes[k], partes[k + 1].strip()
        m = re.match(r"(.+?\.)(\s|$)", desc)         # a descrição vai até o primeiro ponto final
        desc = (m.group(1) if m else desc[:400]).strip()
        desc = re.sub(r"\s*\d{2,3}\s*BASE NACIONAL COMUM CURRICULAR.*$", "", desc)
        if len(desc) < 15:
            continue
        # o código aparece em textos e tabelas: fica a descrição mais completa
        if codigo not in habilidades or len(desc) > len(habilidades[codigo]):
            habilidades[codigo] = desc[:600]

    saida = []
    for codigo in sorted(habilidades):
        sigla = codigo[4:6]
        comp = ("Educação Infantil — " + CAMPOS_EI.get(sigla, sigla)) if codigo.startswith("EI") else COMPONENTES.get(sigla, sigla)
        saida.append({"c": codigo, "comp": comp, "d": habilidades[codigo]})
    with open(sys.argv[2], "w", encoding="utf-8") as f:
        json.dump(saida, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{len(saida)} habilidades -> {sys.argv[2]}")


if __name__ == "__main__":
    main()
