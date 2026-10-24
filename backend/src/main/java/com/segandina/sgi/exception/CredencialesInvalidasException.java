package com.segandina.sgi.exception;

/**
 * Login rechazado. Siempre lleva el mismo mensaje, sin indicar si falló el DNI, la contraseña o el estado
 * del usuario, para no revelar qué DNI están registrados.
 */
public class CredencialesInvalidasException extends RuntimeException {

	/** Mensaje genérico que ve el usuario en cualquier login fallido. */
	public static final String MENSAJE = "DNI o contraseña incorrectos";

	public CredencialesInvalidasException() {
		super(MENSAJE);
	}

}
