# Bateria do argos-api

61 verificações contra um **Traccar e um MySQL de verdade** — nada é simulado. É o que
comprova que o módulo do instalador funciona antes de publicar, e o que você roda depois do
deploy no EasyPanel para confirmar que a instalação ficou correta.

```bash
# na raiz do repositório: sobe MySQL + Traccar + argos-api + proxy
cp .env.example .env     # troque as senhas
docker compose up -d --build

cd argos-api
npm install
node test/fixtures.mjs test/.work/fixtures   # gera as imagens (inclui uma com EXIF/GPS)
./test/bootstrap.sh                          # cria admin, instalador e dispositivo
./test/suite.sh
```

Saída esperada: `=== RESULTADO: 61 ok, 0 falhas, 0 pulados ===`.

## O que é verificado

| Grupo | Exemplos |
|---|---|
| Identidade e CSRF | 401 sem sessão; 403 sem `X-Argos-Client`; quem é gestor e quem não é |
| Escopo por permissão | o instalador só vê as ordens dele; 403 em ordem de dispositivo alheio |
| Ciclo da ordem | criação idempotente por `clientDraftId`; checklist congelado na criação; campo de controle ignorado no `PUT` |
| Fotos | 201 em JPEG/PNG; **415** em texto disfarçado de imagem; **413** acima do limite; idempotência por `clientPhotoId`; ETag com 304; miniatura |
| EXIF | orientação 6 aplicada (3000×2000 vira retrato 1280×1920); GPS e `DateTimeOriginal` extraídos e gravados |
| Máquina de estados | conclusão bloqueada com pendências; instalador não aprova a própria ordem; reprovação exige comentário; retrabalho; ordem aprovada não aceita mais edição |
| Laudo e integridade | laudo HTML com o código da ordem e as fotos; `/admin/integrity` só para gestor |

## Variáveis

| Variável | Padrão | Para quê |
|---|---|---|
| `BASE` | `http://localhost:8080` | Onde o proxy publica a aplicação e o `/argos` |
| `WORK` | `test/.work` | Cookies de sessão, ids e imagens geradas |
| `MYSQL_CMD` | `docker compose exec -T mysql mysql -N -uroot -p$MYSQL_ROOT_PASSWORD argos` | Dois testes leem GPS/data direto da tabela; sem acesso ao banco eles são **pulados**, não falham |

Para apontar a bateria para o ambiente publicado:

```bash
BASE=https://seu-dominio ./test/bootstrap.sh && BASE=https://seu-dominio ./test/suite.sh
```

## Avisos

- O `bootstrap.sh` cria usuários e um dispositivo, e num Traccar **sem nenhum usuário** o
  primeiro cadastro se torna administrador. Rode apenas contra uma instância de teste, nunca
  contra a base de produção com clientes reais.
- A suíte cria ordens de instalação e envia fotos. Em produção isso deixa lixo: use um
  dispositivo descartável e remova as ordens depois.
- `test/.work/` guarda cookies de sessão válidos e está no `.gitignore`.
