package com.segandina.sgi.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Cuerpo de {@code PATCH /api/usuarios/me/contrasena}: el usuario autenticado cambia su propia contraseña.
 *
 * @param contrasenaActual contraseña vigente, para confirmar que es el dueño de la cuenta
 * @param contrasenaNueva  nueva contraseña (8 a 72 caracteres, distinta de la actual)
 */
public record CambioContrasenaRequest(
		@NotBlank(message = "es obligatoria") String contrasenaActual,
		@NotBlank(message = "es obligatoria")
		@Size(min = 8, max = 72, message = "debe tener entre 8 y 72 caracteres") String contrasenaNueva) {

	/** Evita que las contraseñas aparezcan en logs si el objeto se imprime. */
	@Override
	public String toString() {
		return "CambioContrasenaRequest[contrasenaActual=****, contrasenaNueva=****]";
	}

}
