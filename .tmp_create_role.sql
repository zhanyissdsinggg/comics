DO  BEGIN IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'tappytoon') THEN CREATE ROLE tappytoon LOGIN PASSWORD 'tappytoon'; END IF; END ;
