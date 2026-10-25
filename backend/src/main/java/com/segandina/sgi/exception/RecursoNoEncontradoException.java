package com.segandina.sgi.exception;

/**
 * El recurso pedido por id no existe (p. ej. un usuario o una zona). Se responde con 404 y el mensaje de la
 * excepción.
 */
public class RecursoNoEncontradoException extends RuntimeException {

	/**
	 * Crea la excepción.
	 *
	 * @param mensaje explicación legible para el usuario
	 */
	public RecursoNoEncontradoException(String mensaje) {
		super(mensaje);
	}

}
