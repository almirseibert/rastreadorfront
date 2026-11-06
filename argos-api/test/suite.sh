#!/bin/bash
# Bateria de validação do argos-api: exercita identidade, CSRF, escopo por permissão, ciclo
# de vida da ordem, upload/EXIF das fotos, máquina de estados, laudo e integridade contra um
# Traccar e um MySQL de verdade. Nada é simulado.
#
#   docker compose up -d --build            # sobe a pilha (raiz do repositório)
#   cd argos-api && npm install
#   node test/fixtures.mjs test/.work/fixtures
#   ./test/bootstrap.sh                     # cria admin, instalador e dispositivo
#   ./test/suite.sh                         # 61 verificações
#
# Variáveis: BASE (padrão http://localhost:8080, onde o proxy publica /argos),
# WORK (diretório de trabalho do bootstrap) e MYSQL_CMD (como falar com o MySQL, para os
# dois testes que leem GPS/data direto da tabela; se não der, eles são pulados).
set -uo pipefail

BASE="${BASE:-http://localhost:8080}"
WORK="${WORK:-$(cd "$(dirname "$0")" && pwd)/.work}"
MYSQL_CMD="${MYSQL_CMD:-docker compose exec -T mysql mysql -N -uroot -p${MYSQL_ROOT_PASSWORD:-} argos}"
A="$BASE/argos"

cd "$WORK"
if [ ! -f admin.cookies ]; then
  echo "faltam os cookies: rode ./test/bootstrap.sh primeiro" >&2
  exit 1
fi
if [ ! -d fixtures ]; then
  echo "faltam as imagens: rode node test/fixtures.mjs $WORK/fixtures" >&2
  exit 1
fi

PASS=0; FAIL=0; SKIP=0
chk() { # chk "nome" esperado obtido
  if [ "$2" = "$3" ]; then PASS=$((PASS+1)); printf 'ok    %-52s %s\n' "$1" "$3"
  else FAIL=$((FAIL+1)); printf 'FALHA %-52s esperado=%s obtido=%s\n' "$1" "$2" "$3"; fi
}
skip() { SKIP=$((SKIP+1)); printf 'pulado %-51s %s\n' "$1" "$2"; }
mysql_q() { eval "$MYSQL_CMD" -e "\"$1\"" 2>/dev/null | tr -d '\r'; }
code() { curl -s --noproxy '*' -o /tmp/out.$$ -w '%{http_code}' "$@"; }
body() { cat /tmp/out.$$; }
jq_() { python3 -c "import json,sys
e=sys.argv[1]
try:
    d=json.load(sys.stdin)
    print(eval(('d'+e) if e.startswith('[') else e, {'d':d,'len':len}))
except Exception: print('ERR')" "$1"; }
H='-H Content-Type:application/json -H X-Argos-Client:web'

SEED_ITENS=$(mysql_q "SELECT COUNT(*) FROM argos_checklist_item i JOIN argos_checklist_template t ON t.id=i.template_id WHERE t.active=1 AND t.category IS NULL" | tr -d '[:space:]')
echo "itens do template padrao: $SEED_ITENS"
echo "--- identidade e CSRF ---"
chk "health 200"                200 "$(code $A/health)"
chk "me sem sessao 401"         401 "$(code $A/me)"
chk "me admin 200"              200 "$(code -b admin.cookies $A/me)"
chk "me admin e gestor"        True "$(body | jq_ "['manager']")"
chk "me tec 200"                200 "$(code -b tec.cookies $A/me)"
chk "me tec nao e gestor"     False "$(body | jq_ "['manager']")"
chk "POST sem X-Argos-Client 403" 403 "$(code -b tec.cookies -X POST -H Content-Type:application/json -d '{}' $A/orders)"

echo "--- templates ---"
chk "templates 200"             200 "$(code -b tec.cookies $A/templates)"
TPL=$(body | jq_ "[0]['id']"); echo "     template id=$TPL"
chk "templates POST por tec 403" 403 "$(code -b tec.cookies -X POST $H -d '{"name":"x"}' $A/templates)"

echo "--- criacao de ordem ---"
DRAFT="draft-$(date +%s)"
chk "POST /orders (tec, device 1) 201" 201 "$(code -b tec.cookies -X POST $H -d "{\"clientDraftId\":\"$DRAFT\",\"deviceId\":1,\"deviceUniqueId\":\"860123456789012\"}" $A/orders)"
ORD=$(body | jq_ "['id']"); CODE=$(body | jq_ "['code']"); ITENS=$(body | jq_ "len(d['items'])")
echo "     ordem id=$ORD code=$CODE itens_congelados=$ITENS"
if [ -n "$SEED_ITENS" ]; then
  chk "checklist congelado na ordem" "$SEED_ITENS" "$ITENS"
else
  skip "checklist congelado na ordem" "sem acesso ao MySQL; itens congelados=$ITENS"
fi
chk "idempotencia clientDraftId" "$ORD" "$(code -b tec.cookies -X POST $H -d "{\"clientDraftId\":\"$DRAFT\",\"deviceId\":1}" $A/orders >/dev/null; body | jq_ "['id']")"
chk "POST /orders device alheio 403" 403 "$(code -b out.cookies -X POST $H -d '{"deviceId":1}' $A/orders)"

echo "--- leitura e escopo ---"
chk "GET /orders/:id dono 200"    200 "$(code -b tec.cookies $A/orders/$ORD)"
chk "GET /orders/:id admin 200"   200 "$(code -b admin.cookies $A/orders/$ORD)"
chk "GET /orders/:id estranho 403" 403 "$(code -b out.cookies $A/orders/$ORD)"
chk "GET /orders estranho vazio"    0 "$(code -b out.cookies $A/orders >/dev/null; body | jq_ "['total']")"
chk "GET /orders tec ve a sua"      1 "$(code -b tec.cookies $A/orders >/dev/null; body | jq_ "['total']")"

echo "--- edicao ---"
chk "PUT /orders/:id 200" 200 "$(code -b tec.cookies -X PUT $H -d '{"equipmentCategory":"car","vehiclePlate":"ABC1D23","vehicleBrand":"Fiat","vehicleModel":"Strada","vehicleYear":2022,"odometerStart":48123,"installLocation":"painel","hasImmobilizer":true,"notes":"instalado sob o painel"}' $A/orders/$ORD)"
chk "placa persistida"      ABC1D23 "$(body | jq_ "['vehicle_plate']")"
chk "PUT campo nao-editavel ignorado" "em_andamento" "$(code -b tec.cookies -X PUT $H -d '{"status":"aprovada","installer_user_id":999}' $A/orders/$ORD >/dev/null; body | jq_ "['status']")"
chk "PUT por estranho 403"      403 "$(code -b out.cookies -X PUT $H -d '{"notes":"x"}' $A/orders/$ORD)"
# responde todos os itens do checklist
POS=$(code -b tec.cookies $A/orders/$ORD >/dev/null; body | python3 -c "import json,sys;print(' '.join(str(i['position']) for i in json.load(sys.stdin)['items']))")
PAY=$(python3 -c "
import json,sys
print(json.dumps({'items':[{'position':int(p),'result':'ok'} for p in sys.argv[1].split()]}))" "$POS")
chk "PUT /items sem posicao 400" 400 "$(code -b tec.cookies -X PUT $H -d '{"items":[{"result":"ok"}]}' $A/orders/$ORD/items)"
chk "PUT /items (lote) 200" 200 "$(code -b tec.cookies -X PUT $H -d "$PAY" $A/orders/$ORD/items)"
chk "itens respondidos"  "$ITENS" "$(code -b tec.cookies $A/orders/$ORD >/dev/null; body | jq_ "len([i for i in d['items'] if i['result']=='ok'])")"

echo "--- conclusao bloqueada sem fotos ---"
chk "status concluida sem fotos 422" 422 "$(code -b tec.cookies -X POST $H -d '{"status":"concluida"}' $A/orders/$ORD/status)"
echo "     faltando: $(body | head -c 200)"

echo "--- fotos ---"
for slot in veiculo placa etiqueta_imei local_instalacao chicote odometro; do
  c=$(code -b tec.cookies -X POST -H 'X-Argos-Client: web' -F "slot=$slot" -F "file=@$WORK/fixtures/foto.jpg" $A/orders/$ORD/photos)
  [ "$slot" = veiculo ] && PHOTO=$(body | jq_ "['id']")
  chk "upload $slot 201" 201 "$c"
done
chk "upload PNG 201" 201 "$(code -b tec.cookies -X POST -H 'X-Argos-Client: web' -F 'slot=extra' -F "file=@$WORK/fixtures/foto.png" $A/orders/$ORD/photos)"
chk "upload texto disfarcado recusado 415" 415 "$(code -b tec.cookies -X POST -H 'X-Argos-Client: web' -F 'slot=extra' -F "file=@$WORK/fixtures/falsa.jpg" $A/orders/$ORD/photos)"
chk "upload 32MB recusado" 413 "$(code -b tec.cookies -X POST -H 'X-Argos-Client: web' -F 'slot=extra' -F "file=@$WORK/fixtures/gigante.jpg" $A/orders/$ORD/photos)"
chk "slot invalido 400" 400 "$(code -b tec.cookies -X POST -H 'X-Argos-Client: web' -F 'slot=nao_existe' -F "file=@$WORK/fixtures/foto.jpg" $A/orders/$ORD/photos)"
PID="draft-photo-$(date +%s)"
code -b tec.cookies -X POST -H 'X-Argos-Client: web' -F 'slot=extra' -F "clientPhotoId=$PID" -F "file=@$WORK/fixtures/foto.jpg" $A/orders/$ORD/photos >/dev/null
chk "idempotencia clientPhotoId" True "$(code -b tec.cookies -X POST -H 'X-Argos-Client: web' -F 'slot=extra' -F "clientPhotoId=$PID" -F "file=@$WORK/fixtures/foto.jpg" $A/orders/$ORD/photos >/dev/null; body | jq_ "['reused']")"
chk "GET foto 200"       200 "$(code -b tec.cookies $A/photos/$PHOTO)"
ETAG=$(curl -s --noproxy '*' -b tec.cookies -D - -o /dev/null $A/photos/$PHOTO | grep -i '^etag:' | tr -d '\r' | cut -d' ' -f2)
echo "     etag=$ETAG"
chk "GET foto com If-None-Match 304" 304 "$(code -b tec.cookies -H "If-None-Match: $ETAG" $A/photos/$PHOTO)"
chk "GET thumb 200"      200 "$(code -b tec.cookies $A/photos/$PHOTO/thumb)"
chk "GET foto estranho 403" 403 "$(code -b out.cookies $A/photos/$PHOTO)"

echo "--- EXIF: rotacao, GPS e data ---"
# celular.jpg tem orientacao 6 (precisa girar 90) + GPS + DateTimeOriginal no EXIF
chk "upload foto com EXIF 201" 201 "$(code -b tec.cookies -X POST -H 'X-Argos-Client: web' -F 'slot=extra' -F "file=@$WORK/fixtures/celular.jpg" $A/orders/$ORD/photos)"
EXIFID=$(body | jq_ "['id']")
chk "orientacao EXIF aplicada (3000x2000 -> retrato)" "1280x1920" "$(body | jq_ "str(d['width'])+'x'+str(d['height'])")"
EX=$(mysql_q "SELECT CONCAT(ROUND(exif_lat,4),'/',ROUND(exif_lon,4),'/',DATE_FORMAT(taken_at,'%Y-%m-%d %H:%i:%s')) FROM argos_install_photo WHERE id=$EXIFID")
if [ -n "$EX" ]; then
  chk "GPS e data extraidos do EXIF" "-27.5967/-48.5495/2026-11-06 14:32:10" "$EX"
else
  skip "GPS e data extraidos do EXIF" "sem acesso ao MySQL (defina MYSQL_CMD)"
fi

echo "--- maquina de estados ---"
# position_ok é gravado por PUT (é o que o StepFinish do frontend faz), não no POST de status
chk "PUT positionOk 200" 200 "$(code -b tec.cookies -X PUT $H -d '{"positionOk":true,"blockTestOk":true}' $A/orders/$ORD)"
chk "concluida (completa) 200" 200 "$(code -b tec.cookies -X POST $H -d '{"status":"concluida"}' $A/orders/$ORD/status)"
chk "tec aprovar a propria 409"  409 "$(code -b tec.cookies -X POST $H -d '{"status":"aprovada"}' $A/orders/$ORD/status)"
chk "reprovar sem comentario 422" 422 "$(code -b admin.cookies -X POST $H -d '{"status":"reprovada"}' $A/orders/$ORD/status)"
chk "reprovar com comentario 200" 200 "$(code -b admin.cookies -X POST $H -d '{"status":"reprovada","comment":"refazer foto do chicote"}' $A/orders/$ORD/status)"
chk "retrabalho reprovada->em_andamento 200" 200 "$(code -b tec.cookies -X POST $H -d '{"status":"em_andamento"}' $A/orders/$ORD/status)"
chk "transicao invalida em_andamento->aprovada 409" 409 "$(code -b admin.cookies -X POST $H -d '{"status":"aprovada"}' $A/orders/$ORD/status)"
code -b tec.cookies -X POST $H -d '{"status":"concluida"}' $A/orders/$ORD/status >/dev/null
chk "aprovar por admin 200" 200 "$(code -b admin.cookies -X POST $H -d '{"status":"aprovada"}' $A/orders/$ORD/status)"
chk "editar ordem aprovada (tec) 409" 409 "$(code -b tec.cookies -X PUT $H -d '{"notes":"depois"}' $A/orders/$ORD)"

echo "--- laudo e integridade ---"
chk "laudo 200" 200 "$(code -b admin.cookies $A/orders/$ORD/report)"
cp /tmp/out.$$ laudo.html
chk "laudo e HTML" True "$(head -c 200 laudo.html | grep -qi '<!doctype html' && echo True || echo False)"
chk "laudo cita o codigo da ordem" True "$(grep -q "$CODE" laudo.html && echo True || echo False)"
chk "laudo embute as fotos" True "$(grep -qE 'photos/[0-9]+' laudo.html && echo True || echo False)"
chk "integrity admin 200" 200 "$(code -b admin.cookies $A/admin/integrity)"
chk "integrity tec 403"   403 "$(code -b tec.cookies $A/admin/integrity)"

echo "--- delete de foto ---"
chk "delete foto em ordem aprovada por admin 204" 204 "$(code -b admin.cookies -X DELETE -H 'X-Argos-Client: web' $A/photos/$PHOTO)"
chk "foto apagada 404" 404 "$(code -b admin.cookies $A/photos/$PHOTO)"

rm -f /tmp/out.$$
echo
echo "=== RESULTADO: $PASS ok, $FAIL falhas, $SKIP pulados ==="
[ "$FAIL" = 0 ]
