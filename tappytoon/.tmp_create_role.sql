DO  BEGIN IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'gush') THEN CREATE ROLE gush LOGIN PASSWORD 'gush'; END IF; END ;
