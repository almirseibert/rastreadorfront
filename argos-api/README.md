# argos-api

Serviço de **ordens de instalação** do Argos Track: checklist assinado pelo instalador e as
**fotos** da instalação. Existe porque o Traccar oficial não serve para isso — o endpoint
`POST /api/devices/{id}/image` grava **uma única** imagem de 500 KB com nome fixo
(`device.<ext>`), e a coluna `attributes` é `VARCHAR(4000)`.

```
navegador ─► /api/...    Traccar oficial (inalterado)
          └► /argos/...  argos-api (este serviço)
```

## Decisões

- **Sem usuários próprios.** Toda requisição repassa o `JSESSIONID` (ou o `Authorization`) do
  chamador para `GET {TRACCAR_URL}/api/session`; a resposta é a identidade, com cache de 30 s.
  A visibilidade de um dispositivo é confirmada em `GET /api/devices?id=`. Assim o grafo de
  permissões do Traccar (usuário → grupo → dispositivo) nunca é reimplementado aqui.
- **Mesmo banco, prefixo `argos_`, nenhuma FK física para `tc_*`.** O Liquibase do Traccar
  altera/recria as tabelas `tc_*` nos upgrades da imagem oficial e uma FK externa abortaria a
  migração, travando o boot do servidor. As referências são lógicas e validadas na API.
- **Fotos no volume, caminho relativo no banco.** Layout
  `photos/<ano>/<mês>/<ordem>/<hash>_full.jpg` + `_thumb.jpg`. O caminho relativo permite
  migrar para S3/R2 trocando só quem resolve o caminho.
- **Laudo em HTML imprimível, não PDF no servidor.** Puppeteer custaria ~400 MB de imagem e
  ~300 MB de RAM por render; o navegador do usuário gera o PDF pelo "Imprimir" com o mesmo
  layout (`@page A4`).
- **Erros em texto puro**, porque o frontend usa `fetchOrThrow()`, que faz
  `new Error(await response.text())` e mostra a mensagem no snackbar.

## Variáveis de ambiente

| Variável | Obrigatória | Exemplo / padrão |
|---|---|---|
| `PORT` | não | `8090` |
| `ARGOS_BASE_PATH` | não | `/argos` |
| `TRACCAR_URL` | **sim** (na prática) | `http://rastreamento_traccar:8082` — rede interna, não o domínio público |
| `DB_HOST` | **sim** | `rastreamento_traccar_user` (o mesmo host do `traccar.xml`) |
| `DB_PORT` | não | `3306` |
| `DB_NAME` | **sim** | `traccar` |
| `DB_USER` | **sim** | `argos` |
| `DB_PASSWORD` | **sim** | *(secret)* |
| `DB_POOL_LIMIT` | não | `8` |
| `STORAGE_DIR` | não | `/data/argos` |
| `MAX_UPLOAD_BYTES` | não | `8388608` (8 MB) |
| `MAX_PHOTOS_PER_ORDER` | não | `40` |
| `SESSION_CACHE_TTL_MS` | não | `30000` |
| `ALLOWED_ORIGINS` | recomendada | `https://seu-dominio` (vazio = não verifica, só para dev) |
| `RUN_MIGRATIONS` | não | `true` |

### Usuário de banco recomendado

Criar um usuário dedicado impede que um bug aqui escreva em tabela do Traccar:

```sql
CREATE USER 'argos'@'%' IDENTIFIED BY '<senha>';
GRANT SELECT ON traccar.tc_devices TO 'argos'@'%';
GRANT SELECT ON traccar.tc_users   TO 'argos'@'%';
GRANT SELECT ON traccar.tc_groups  TO 'argos'@'%';
GRANT ALL PRIVILEGES ON `traccar`.`argos\_%` TO 'argos'@'%';
FLUSH PRIVILEGES;
```

## Deploy no EasyPanel

1. **Novo serviço** `argos-api` apontando para este diretório (`argos-api/Dockerfile`).
2. **Volume** montado em `/data`.
3. **Variáveis** da tabela acima (o `DB_HOST` é o host interno do MySQL, igual ao `traccar.xml`).
4. **Proxy no mesmo domínio** (preferido): no serviço público, adicionar uma entrada de domínio
   com path `/argos` apontando para `argos-api:8090`. Isso mantém a requisição *same-origin*,
   o cookie de sessão do Traccar viaja sozinho e não há CORS.
   No proxy, garantir: `client_max_body_size` ≥ 12 MB (senão o upload de 8 MB morre em 413 antes
   de chegar aqui), `proxy_request_buffering off` e timeout de leitura ≥ 60 s.
5. **Sonda**: `GET /argos/health` (público) retorna 200 só com banco e volume OK.

Se a versão do EasyPanel não rotear por path entre serviços, as alternativas são um Caddy na
frente (`handle /argos* → argos-api:8090`, `handle → traccar:8082`) ou um host separado
(`argos.seu-dominio`) — nesse caso o cookie passa a ser cross-site e bloqueado pelo `SameSite`
padrão, então é obrigatório usar token: o frontend busca `GET /api/session/token` e manda
`Authorization: Bearer <token>`, configurando `VITE_ARGOS_API_URL` e `ALLOWED_ORIGINS`.

## Desenvolvimento local

```bash
cd argos-api
npm install
DB_HOST=127.0.0.1 DB_NAME=traccar DB_USER=root DB_PASSWORD=root \
  TRACCAR_URL=https://seu-traccar STORAGE_DIR=/tmp/argos npm start
```

O `web/vite.config.js` já proxia `/argos` para `http://localhost:8090`.

Pegadinha: em dev o `JSESSIONID` vem do Traccar remoto através do proxy `/api`, então o
`TRACCAR_URL` daqui **precisa apontar para o mesmo Traccar** que o proxy usa, senão a sessão
não valida.

## Endpoints

| Método | Rota | Quem |
|---|---|---|
| GET | `/argos/health` | público |
| GET | `/argos/me` | sessão |
| GET | `/argos/templates?category=&active=` | sessão |
| GET | `/argos/templates/:id` | sessão |
| POST / PUT / DELETE | `/argos/templates[/:id]` | admin |
| GET | `/argos/orders` | escopo pelo papel (instalador vê as suas) |
| POST | `/argos/orders` | sessão — idempotente por `clientDraftId` |
| GET | `/argos/orders/:id` | dono, revisor ou quem vê o dispositivo |
| PUT | `/argos/orders/:id` | dono ou revisor, se a ordem estiver editável |
| PUT | `/argos/orders/:id/items` | idem (respostas do checklist, em lote) |
| POST | `/argos/orders/:id/status` | conforme a máquina de estados |
| POST | `/argos/orders/:id/photos` | multipart, 1 arquivo, ≤ 8 MB, `image/*` |
| GET | `/argos/photos/:id[/thumb]` | mesma permissão da ordem; ETag + 304 |
| DELETE | `/argos/photos/:id` | dono ou revisor, se a ordem estiver editável |
| GET | `/argos/orders/:id/report` | laudo HTML imprimível |
| GET | `/argos/admin/integrity` | admin/gestor |

Requisições que alteram dados exigem o cabeçalho `X-Argos-Client: web` (barra CSRF por
formulário de outro site) e, se `ALLOWED_ORIGINS` estiver definido, `Origin` na lista.

### Estados da ordem

```
rascunho ──► em_andamento ──► concluida ──► aprovada
                 ▲                │
                 └────────────────┴──► reprovada ──► em_andamento   (retrabalho)
rascunho|em_andamento ──► cancelada
```

Concluir exige: todos os itens obrigatórios respondidos (com observação quando o resultado é
`problem`), foto em todos os slots obrigatórios, dispositivo vinculado e posição recebida.
Aprovar/reprovar é só de admin/gestor, e reprovar exige comentário.

## Riscos conhecidos

- **Volume não é versionado pelo EasyPanel.** Fazer backup (`rclone sync /data/argos remote:`).
  `sha256` e `bytes` ficam no banco, então `GET /argos/admin/integrity` detecta divergência.
- **Crescimento**: ~7 fotos × ~300 KB ≈ 2 MB por ordem; 500 ordens/mês ≈ 1 GB/mês.
- **Dispositivo removido no Traccar**: a ordem sobrevive (`device_unique_id` desnormalizado).
  Fotos **nunca** são apagadas automaticamente — o laudo é prova de entrega.
- As tabelas `argos_*` entram no dump do MySQL de graça, desde que o backup não filtre tabelas.
