package com.segandina.sgi.exception;

/**
 * Datos con formato correcto que incumplen una regla del negocio (p. ej. una zona dada de baja o una fecha
 * futura). Se responde con 400 y el mensaje de la excepción.
 */
public class ReglaNegocioException extends RuntimeException {

	/**
	 * Crea la excepción.
	 *
	 * @param mensaje explicación legible para el usuario
	 */
	public ReglaNegocioException(String mensaje) {
		super(mensaje);
	}

}
