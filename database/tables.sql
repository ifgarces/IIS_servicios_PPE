----------------------------------------------------------------------------------------------------
-- For creating database tables.
----------------------------------------------------------------------------------------------------

-- Commanding Postgres to stop file execution on error
\set ON_ERROR_STOP true

DROP TABLE IF EXISTS TransaccionTGR;

CREATE TABLE TransaccionTGR(
    folio                  serial,
    id_persona             varchar(10) NOT NULL, -- 12345678-K
    numero_repertorio      varchar(12) NOT NULL,
    timestamp_recepcion    timestamp NOT NULL,
    monto                  decimal NOT NULL,
    estado_transaccion     varchar(10) NOT NULL CHECK (estado_transaccion IN ('ingresado','aceptado','rechazado')),
    timestamp_aprobacion   timestamp DEFAULT NULL,
    ingreso                boolean NOT NULL,
    estado_TGR             varchar(15) NOT NULL CHECK (estado_TGR IN ('esperando','aceptado','fallido')),
	    PRIMARY KEY (folio)
);
