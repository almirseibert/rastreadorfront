-- Argos Track — tabelas do módulo de instalação.
--
-- Convive com o schema do Traccar no MESMO banco, usando prefixo `argos_`.
-- REGRA: nunca criar FK física apontando para tabelas `tc_*`. O Liquibase do Traccar
-- recria/altera essas tabelas nos upgrades da imagem oficial e uma FK externa aborta a
-- migração (travando o boot do servidor). As referências a tc_devices/tc_users/tc_groups
-- são apenas lógicas e validadas pela API em tempo de escrita.

CREATE TABLE IF NOT EXISTS argos_install_order (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  code               VARCHAR(24)  NOT NULL,
  status             ENUM('rascunho','em_andamento','concluida','aprovada','reprovada','cancelada')
                     NOT NULL DEFAULT 'rascunho',
  client_draft_id    CHAR(36)     NULL,
  device_id          INT          NULL,
  device_unique_id   VARCHAR(128) NULL,
  device_missing     TINYINT(1)   NOT NULL DEFAULT 0,
  installer_user_id  INT          NOT NULL,
  customer_user_id   INT          NULL,
  customer_group_id  INT          NULL,
  template_id        INT          NULL,
  equipment_category VARCHAR(32)  NULL,
  tracker_model      VARCHAR(64)  NULL,
  sim_carrier        VARCHAR(64)  NULL,
  sim_number         VARCHAR(32)  NULL,
  vehicle_plate      VARCHAR(16)  NULL,
  vehicle_brand      VARCHAR(48)  NULL,
  vehicle_model      VARCHAR(64)  NULL,
  vehicle_year       SMALLINT     NULL,
  vehicle_color      VARCHAR(32)  NULL,
  odometer_start     INT          NULL,
  install_location   VARCHAR(255) NULL,
  has_immobilizer    TINYINT(1)   NOT NULL DEFAULT 0,
  has_siren          TINYINT(1)   NOT NULL DEFAULT 0,
  has_panic_button   TINYINT(1)   NOT NULL DEFAULT 0,
  notes              TEXT         NULL,
  position_ok        TINYINT(1)   NOT NULL DEFAULT 0,
  block_test_ok      TINYINT(1)   NULL,
  started_at         DATETIME(3)  NULL,
  finished_at        DATETIME(3)  NULL,
  reviewed_by        INT          NULL,
  reviewed_at        DATETIME(3)  NULL,
  review_comment     VARCHAR(1024) NULL,
  created_at         DATETIME(3)  NOT NULL,
  updated_at         DATETIME(3)  NOT NULL,
  UNIQUE KEY uq_order_code (code),
  UNIQUE KEY uq_order_draft (client_draft_id),
  KEY idx_order_status (status, created_at),
  KEY idx_order_installer (installer_user_id, created_at),
  KEY idx_order_device (device_id),
  KEY idx_order_customer (customer_group_id, created_at),
  KEY idx_order_unique_id (device_unique_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS argos_install_item (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  order_id         INT          NOT NULL,
  template_item_id INT          NULL,
  position         SMALLINT     NOT NULL,
  label_snapshot   VARCHAR(255) NOT NULL,
  required         TINYINT(1)   NOT NULL DEFAULT 1,
  result           ENUM('ok','na','problem') NULL,
  note             VARCHAR(512) NULL,
  answered_at      DATETIME(3)  NULL,
  CONSTRAINT fk_item_order FOREIGN KEY (order_id)
    REFERENCES argos_install_order(id) ON DELETE CASCADE,
  UNIQUE KEY uq_item (order_id, position),
  KEY idx_item_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS argos_install_photo (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  order_id        INT          NOT NULL,
  slot            VARCHAR(48)  NOT NULL,
  position        SMALLINT     NOT NULL DEFAULT 0,
  client_photo_id CHAR(36)     NULL,
  path            VARCHAR(255) NOT NULL,
  thumb_path      VARCHAR(255) NULL,
  mime            VARCHAR(32)  NOT NULL,
  bytes           INT          NOT NULL,
  width           SMALLINT     NULL,
  height          SMALLINT     NULL,
  sha256          CHAR(64)     NOT NULL,
  original_name   VARCHAR(255) NULL,
  exif_lat        DOUBLE       NULL,
  exif_lon        DOUBLE       NULL,
  taken_at        DATETIME(3)  NULL,
  uploaded_by     INT          NOT NULL,
  created_at      DATETIME(3)  NOT NULL,
  deleted_at      DATETIME(3)  NULL,
  CONSTRAINT fk_photo_order FOREIGN KEY (order_id)
    REFERENCES argos_install_order(id) ON DELETE CASCADE,
  UNIQUE KEY uq_photo_client (order_id, client_photo_id),
  KEY idx_photo_order (order_id, slot, position),
  KEY idx_photo_hash (sha256)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS argos_checklist_template (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(128) NOT NULL,
  category   VARCHAR(32)  NULL,
  active     TINYINT(1)   NOT NULL DEFAULT 1,
  created_by INT          NULL,
  created_at DATETIME(3)  NOT NULL,
  updated_at DATETIME(3)  NOT NULL,
  KEY idx_tpl_active (active, category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS argos_checklist_item (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  template_id INT          NOT NULL,
  position    SMALLINT     NOT NULL,
  label       VARCHAR(255) NOT NULL,
  help        VARCHAR(512) NULL,
  required    TINYINT(1)   NOT NULL DEFAULT 1,
  CONSTRAINT fk_tpl_item FOREIGN KEY (template_id)
    REFERENCES argos_checklist_template(id) ON DELETE CASCADE,
  UNIQUE KEY uq_tpl_pos (template_id, position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS argos_audit (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id    INT          NULL,
  actor_id    INT          NULL,
  action      VARCHAR(48)  NOT NULL,
  from_status VARCHAR(16)  NULL,
  to_status   VARCHAR(16)  NULL,
  detail      VARCHAR(1024) NULL,
  ip          VARCHAR(45)  NULL,
  created_at  DATETIME(3)  NOT NULL,
  KEY idx_audit_order (order_id, created_at),
  KEY idx_audit_actor (actor_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
