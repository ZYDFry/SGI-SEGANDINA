package com.segandina.sgi.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * Cuerpo de {@code POST /api/auth/login} (RF-01). El formato del DNI se valida antes de consultar la BD.
 *
 * @param dni        DNI de 8 dígitos
 * @param contrasena contraseña en texto plano (solo viaja en la petición, nunca se guarda así)
 */
public record LoginRequest(
		@NotBlank(message = "es obligatorio")
		@Pattern(regexp = "^[0-9]{8}$", message = "debe tener 8 dígitos") String dni,
		@NotBlank(message = "es obligatoria") String contrasena) {

	/** Evita que la contraseña aparezca en logs si el objeto se imprime. */
	@Override
	public String toString() {
		return "LoginRequest[dni=" + dni + ", contrasena=****]";
	}

}
