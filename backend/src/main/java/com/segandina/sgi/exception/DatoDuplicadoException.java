package com.segandina.sgi.exception;

/**
 * Un dato que debe ser único ya existe (p. ej. un DNI o el nombre de una zona). Se responde con 409 y el
 * mensaje de la excepción.
 */
public class DatoDuplicadoException extends RuntimeException {

	/**
	 * Crea la excepción.
	 *
	 * @param mensaje explicación legible para el usuario
	 */
	public DatoDuplicadoException(String mensaje) {
		super(mensaje);
	}

}
