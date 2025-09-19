CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS "user" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email varchar(320) not null unique,
  password_hash text not null,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- GROUP --
CREATE TABLE IF NOT EXISTS "group" (
  id bigserial PRIMARY KEY,
  name varchar(120) NOT NULL UNIQUE,
  owner_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS group_membership (
  id         bigserial PRIMARY KEY,
  group_id   bigint NOT NULL REFERENCES "group"(id) ON DELETE CASCADE,
  user_id    uuid   NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  status     text   NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  role       text   NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('MEMBER','MODERATOR')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS group_movie (
  id bigserial PRIMARY KEY,
  group_id bigint NOT NULL REFERENCES "group"(id) ON DELETE CASCADE,
  movie_id bigint NOT NULL,
  title varchar(200) NOT NULL DEFAULT '',
  added_by uuid REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, movie_id)
);

CREATE TABLE IF NOT EXISTS group_showtime (
  id bigserial PRIMARY KEY,
  group_movie_id bigint NOT NULL REFERENCES group_movie(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  theater varchar(200) DEFAULT '',
  auditorium varchar(120) DEFAULT '',
  added_by uuid REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS favorites (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  movie_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_group_membership_group_status ON group_membership(group_id, status);
CREATE INDEX IF NOT EXISTS idx_group_movie_group ON group_movie(group_id);
CREATE INDEX IF NOT EXISTS idx_group_showtime_movie ON group_showtime(group_movie_id);
-- GROUP --

---REVIEWS-----
CREATE TABLE reviews (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  movie_id    BIGINT NOT NULL,
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);