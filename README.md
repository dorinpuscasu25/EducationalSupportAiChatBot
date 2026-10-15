# Asistent Academie

Platformă de suport pentru cursanții unei academii: un chatbot care răspunde la
întrebări despre cursuri, materiale și organizare, **pe baza documentelor
academiei**. Cursanții văd doar răspunsul; sursele folosite sunt vizibile doar
adminului, în conversațiile cursanților.

- Cursanții își fac cont (cu confirmare pe email) și așteaptă **aprobarea**.
- În chat pot atașa **capturi de ecran și documente** (buton agrafă, Ctrl/Cmd+V
  sau drag & drop): PNG, JPG, WebP, PDF, DOCX, PPTX, TXT, MD — max 5 fișiere de
  10 MB. Imaginile sunt văzute de modelul AI (și trec prin OCR), iar textul
  documentelor e citit și folosit la căutare. Fișierele rămân private: le văd
  doar cursantul și adminul.
- **Adminul** aprobă/suspendă conturi, vede statistici pe fiecare cursant
  (întrebări, activitate pe zile, feedback, tokeni), citește conversațiile și
  gestionează documentele.
- Documentele (PDF, DOCX, PPTX, TXT, MD) se pun în folderul [`documents/`](documents/README.md)
  și se indexează automat.

## Pornire rapidă

Ai nevoie de Docker (cu Compose).

```bash
cp .env.example .env      # completează OPENAI_API_KEY și schimbă JWT_SECRET / ADMIN_PASSWORD
make up                   # sau: docker compose up -d --build
```

Deschide http://localhost:8080 și intră cu `ADMIN_EMAIL` / `ADMIN_PASSWORD` din `.env`.

Fără `OPENAI_API_KEY` platforma merge în **mod demonstrativ**: căutarea în
documente funcționează, iar răspunsul afișează fragmentele găsite.

În `ENV=development` emailurile nu se trimit: codurile de confirmare apar în
`make logs`.

## Documente

1. Copiază fișierele în `documents/` (subfolderele devin categorii).
2. Admin → **Documente** → **Sincronizează folderul** (sau `make ingest`).
3. Tot acolo poți **testa căutarea** ca să vezi ce găsește asistentul.

Fișierele noi sunt indexate, cele modificate reindexate, cele șterse eliminate.
La pornire API-ul sincronizează automat folderul; opțional periodic cu
`KNOWLEDGE_SYNC_INTERVAL=30m`.

## Arhitectură

| Componentă | Ce face |
|---|---|
| `apps/web` | Interfața (React): login, înregistrare, chat, setări cont, panou admin |
| `apps/api` | API Go: autentificare, aprobare conturi, chat cu streaming, admin, indexare |
| `postgres` (pgvector) | Utilizatori, conversații, documente, fragmente, vectori și căutare full-text |
| `documents/` | Materialele academiei (montat read-only în API) |

Căutarea combină căutare semantică (embeddings) cu căutare full-text în română,
fără diacritice, direct în PostgreSQL — fără servicii separate de căutare.

## Dezvoltare

```bash
make setup     # .env-uri + dependențe web
make db-up     # doar PostgreSQL
make api-dev   # API pe :3380 (necesită Go 1.25)
make web-dev   # UI pe http://localhost:5173 (proxy /api → :3380)
make check     # teste API (în Docker) + lint, teste și build web
```

Comenzi utile în containerul API:

```bash
docker compose exec api ./ingest --force                          # reindexează tot
docker compose exec api ./admin --email cineva@exemplu.md --apply # promovează la admin
```

## Producție

Setează în `.env`: `ENV=production`, un `JWT_SECRET` aleator, `RESEND_API_KEY`
sau `SMTP_*`, `APP_PUBLIC_URL`, și pune platforma în spatele unui proxy HTTPS
(Caddy, nginx, Cloudflare) care trimite traficul spre portul `WEB_PORT`.
