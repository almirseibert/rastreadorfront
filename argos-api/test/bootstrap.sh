#!/bin/bash
# Prepara um Traccar VAZIO para a bateria: cria o administrador, um instalador (não-admin)
# com acesso a um dispositivo e um terceiro usuário sem nenhum acesso — é com esses três
# papéis que a suíte testa as permissões.
#
#   BASE=http://localhost:8080 ./test/bootstrap.sh
#
# Num Traccar sem nenhum usuário, o primeiro POST /api/users cria o administrador (é assim
# que o Traccar se auto-configura). Portanto: use apenas contra uma instância de teste.
set -euo pipefail

BASE="${BASE:-http://localhost:8080}"
WORK="${WORK:-$(cd "$(dirname "$0")" && pwd)/.work}"
CURL=(curl -sS --noproxy '*')

mkdir -p "$WORK"
cd "$WORK"

json() { python3 -c "import json,sys; print(json.load(sys.stdin)$1)"; }

if [ -n "$("${CURL[@]}" "$BASE/api/users" 2>/dev/null | head -c 2 | tr -d '[]')" ]; then
  echo "AVISO: esta instância já tem usuários; o bootstrap espera um Traccar limpo." >&2
fi

echo "1/5 administrador"
"${CURL[@]}" -X POST "$BASE/api/users" -H 'Content-Type: application/json' \
  -d '{"name":"Admin Teste","email":"admin@teste.local","password":"Adm@12345"}' > admin.json
"${CURL[@]}" -c admin.cookies -X POST "$BASE/api/session" \
  -d 'email=admin@teste.local&password=Adm@12345' > admin.session.json
ADMIN=$(json "['id']" < admin.session.json)

echo "2/5 dispositivo"
"${CURL[@]}" -b admin.cookies -X POST "$BASE/api/devices" -H 'Content-Type: application/json' \
  -d '{"name":"Teste Instalacao","uniqueId":"860123456789012","category":"car"}' > device.json
DEV=$(json "['id']" < device.json)

echo "3/5 instalador"
"${CURL[@]}" -b admin.cookies -X POST "$BASE/api/users" -H 'Content-Type: application/json' \
  -d '{"name":"Tec Campo","email":"tec@teste.local","password":"Tec@12345","administrator":false,"attributes":{"argos.profile":"instalador"}}' > tec.json
TEC=$(json "['id']" < tec.json)

echo "4/5 permissão instalador -> dispositivo"
"${CURL[@]}" -b admin.cookies -X POST "$BASE/api/permissions" -H 'Content-Type: application/json' \
  -d "{\"userId\":$TEC,\"deviceId\":$DEV}" -o /dev/null

echo "5/5 usuário sem acesso + sessões"
"${CURL[@]}" -b admin.cookies -X POST "$BASE/api/users" -H 'Content-Type: application/json' \
  -d '{"name":"Estranho","email":"estranho@teste.local","password":"Estr@1234","administrator":false}' > out.json
"${CURL[@]}" -c tec.cookies -X POST "$BASE/api/session" -d 'email=tec@teste.local&password=Tec@12345' -o /dev/null
"${CURL[@]}" -c out.cookies -X POST "$BASE/api/session" -d 'email=estranho@teste.local&password=Estr@1234' -o /dev/null

cat > ids.env <<VARS
ADMIN=$ADMIN
TEC=$TEC
DEV=$DEV
VARS

echo
echo "pronto: admin=$ADMIN instalador=$TEC dispositivo=$DEV"
echo "cookies e ids em $WORK"
