package com.segandina.sgi.exception;

/**
 * Parámetro de consulta con un valor que incumple una regla (p. ej. un rango de fechas invertido). Se responde
 * con 400, el mensaje de la excepción y el campo en {@code detalles} ({@code "<campo>: <mensaje>"}).
 */
public class ParametroInvalidoException extends ReglaNegocioException {

	private final String campo;

	/**
	 * Crea la excepción.
	 *
	 * @param campo   nombre del query param rechazado (p. ej. {@code desde})
	 * @param mensaje explicación legible para el usuario
	 */
	public ParametroInvalidoException(String campo, String mensaje) {
		super(mensaje);
		this.campo = campo;
	}

	/** Nombre del query param rechazado. */
	public String getCampo() {
		return campo;
	}

}
