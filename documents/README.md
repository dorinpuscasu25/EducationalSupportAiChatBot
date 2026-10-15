# Materialele academiei

Pune aici toate documentele din care răspunde asistentul: conținutul cursurilor,
regulamente, orare, ghiduri, întrebări frecvente.

- Formate acceptate: **PDF, DOCX, PPTX, TXT, MD** (PDF-urile scanate trec prin OCR).
- Subfolderele devin **categorii** afișate la surse, de exemplu:

```
documents/
  Organizare/Regulament intern.pdf
  Organizare/Orar semestrul 1.docx
  Modulul 1 - Introducere/Curs 1.pptx
  Modulul 1 - Introducere/Suport de curs.pdf
  Intrebari frecvente.md
```

- După ce adaugi, modifici sau ștergi fișiere: **Admin → Documente → Sincronizează
  folderul** (sau `make ingest`). Fișierele neschimbate nu sunt reprocesate.
- Fișierele care încep cu `.` sau `~$` (temporare Office) sunt ignorate.

Conținutul acestui folder nu intră în git (vezi `.gitignore`), doar acest README.
