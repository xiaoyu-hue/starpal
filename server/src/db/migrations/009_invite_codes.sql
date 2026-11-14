-- 邀请码：一人一码、用完即失效、可撤销（M4 收尾后新增）。
-- 取代原先「单一环境变量统一码」的粗放做法，使邀请可追踪、可撤销、可限次。
CREATE TABLE invite_codes (
  id          BIGSERIAL PRIMARY KEY,
  -- 仅存哈希：明文不入库，库泄露也无法还原；用会话密钥做 HMAC，与登录校验同口径。
  code_hash   VARCHAR(64) NOT NULL UNIQUE,
  note        TEXT,
  status      VARCHAR(16) NOT NULL DEFAULT 'available',
  created_by  BIGINT REFERENCES users (id) ON DELETE SET NULL,
  used_by     BIGINT REFERENCES users (id) ON DELETE SET NULL,
  used_at     TIMESTAMPTZ,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT invite_codes_status_valid CHECK (status IN ('available', 'used', 'revoked'))
);

CREATE INDEX invite_codes_status_idx ON invite_codes (status, created_at DESC);
CREATE INDEX invite_codes_created_idx ON invite_codes (created_at DESC);
