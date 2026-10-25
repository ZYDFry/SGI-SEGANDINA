package com.segandina.sgi.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Cuerpo de {@code PATCH /api/usuarios/{id}/contrasena}: el Administrador asigna una contraseña nueva a otro
 * usuario, sin conocer la actual.
 *
 * @param contrasenaNueva nueva contraseña (8 a 72 caracteres)
 */
public record RestablecerContrasenaRequest(
		@NotBlank(message = "es obligatoria")
		@Size(min = 8, max = 72, message = "debe tener entre 8 y 72 caracteres") String contrasenaNueva) {

	/** Evita que la contraseña aparezca en logs si el objeto se imprime. */
	@Override
	public String toString() {
		return "RestablecerContrasenaRequest[contrasenaNueva=****]";
	}

}
