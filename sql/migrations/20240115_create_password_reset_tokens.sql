-- Migration: create password_reset_tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  userId BIGINT NOT NULL,
  businessId BIGINT NOT NULL,
  tokenHash CHAR(64) NOT NULL UNIQUE,
  expiresAt DATETIME NOT NULL,
  usedAt DATETIME NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_prt_userId (userId),
  INDEX idx_prt_expiresAt (expiresAt),
  INDEX idx_prt_businessId (businessId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
