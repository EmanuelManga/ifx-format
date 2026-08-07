{
******************************************************************************
* Module......: test.4gl
* Description.:
* Version.....: 1.0.0
* Author......:
* DATE........: 2026-08-07
* History.....:
* 2026-08-07 creación
******************************************************************************
}
DATABASE recaudaciones

MAIN

  DEFINE lc_cuenta INTEGER,
    ln_cuit DECIMAL(11,0)

  -- sin esto, un error SQL/RAISE del SP mata el programa
  WHENEVER ERROR CONTINUE
  IF num_args() < 2 THEN

    DISPLAY "Uso: baja_cuenta.4gl <c_cuenta> <n_cuit>"
    DISPLAY "Ej:  baja_cuenta.4gl 76088 27171642960"
    EXIT PROGRAM 1

  END IF

  LET lc_cuenta = ARG_VAL(1)
  LET ln_cuit = ARG_VAL(2)
  CALL ff_baja_cuenta(lc_cuenta, ln_cuit)

END MAIN

FUNCTION ff_baja_cuenta(pc_cuenta, pn_cuit)

  DEFINE pc_cuenta INTEGER,
    pn_cuit DECIMAL(11,0),
    l_respuesta SMALLINT,
    l_bajas INTEGER

  SET LOCK MODE TO WAIT 30
  -- transaccion en el 4GL (SP con p_con_transac = 0)
  BEGIN WORK
  CALL ff_verif_status("BEGIN WORK")
  IF STATUS < 0 THEN

    EXIT PROGRAM 1

  END IF

  -- 3er param = 0 -> el SP no hace BEGIN/COMMIT/ROLLBACK
  EXECUTE PROCEDURE sp_ddjj2025_baja_cuenta(pc_cuenta, pn_cuit, 0)
    INTO l_respuesta, l_bajas
  IF STATUS < 0 THEN

    DISPLAY "ERROR SP sqlcode=", STATUS,
      " isam=", SQLCA.SQLERRD[2],
      " msg=", SQLCA.SQLERRM
    CALL z("EXECUTE PROCEDURE sp_ddjj2025_baja_cuenta")
    ROLLBACK WORK
    CALL ff_verif_status("ROLLBACK WORK")
    EXIT PROGRAM 1

  END IF

  COMMIT WORK
  IF STATUS < 0 THEN

    DISPLAY "ERROR COMMIT sqlcode=", STATUS
    CALL ff_verif_status("COMMIT WORK")
    ROLLBACK WORK
    EXIT PROGRAM 1

  END IF

  DISPLAY "OK cuenta=", pc_cuenta,
    " cuit=", pn_cuit,
    " respuesta=", l_respuesta,
    " bajas=", l_bajas

END FUNCTION

FUNCTION ff_verif_status(p_paso)

  DEFINE p_paso CHAR(80),
    cmd CHAR(512)

  IF STATUS < 0 THEN

    LET cmd = "echo `date` ", ARG_VAL(0),
      ": paso=", p_paso,
      " sqlcode=", STATUS,
      " isam=", SQLCA.SQLERRD[2],
      " >> /tmp/4gl_baja_cuenta.log"
    RUN cmd

  END IF
END FUNCTION
