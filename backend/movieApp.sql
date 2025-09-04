CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE "user" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email varchar(320) not null unique,
  password_hash text not null,
  created_at timestamptz NOT NULL DEFAULT now()
);