CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event VARCHAR(100) NOT NULL,
  userId BIGINT UNSIGNED NOT NULL,
  businessId BIGINT UNSIGNED NOT NULL,
  ip VARCHAR(64) NULL,
  metadata JSON NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_business (businessId, createdAt),
  KEY idx_audit_user_event (userId, event, createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
