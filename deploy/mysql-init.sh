#!/bin/bash
# Roda uma única vez, pelo entrypoint do MySQL, com o volume de dados vazio.
#
# É um .sh e não um .sql porque aqui as variáveis de ambiente existem — a senha não fica
# escrita em arquivo versionado. Fica FORA de argos-api/migrations/ de propósito: o runner
# em src/migrate.js aplica todo .sql daquela pasta usando as credenciais do argos-api, que
# não podem criar banco nem usuário, e o serviço não subiria.
#
# No MySQL do EasyPanel, faça o equivalente à mão (o SQL está em argos-api/README.md).
#
# Banco separado de propósito: o argos-api não precisa de NENHUM acesso às tabelas tc_* do
# Traccar — identidade e visibilidade de dispositivo são resolvidas pela API HTTP do
# Traccar, não por SQL — então ele não recebe esse acesso.
set -euo pipefail

mysql --protocol=socket -uroot -p"${MYSQL_ROOT_PASSWORD}" <<SQL
CREATE DATABASE IF NOT EXISTS argos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER_ARGOS}'@'%' IDENTIFIED BY '${DB_PASSWORD_ARGOS}';
GRANT ALL PRIVILEGES ON argos.* TO '${DB_USER_ARGOS}'@'%';
FLUSH PRIVILEGES;
SQL

echo "[init] banco 'argos' e usuário '${DB_USER_ARGOS}' criados"
