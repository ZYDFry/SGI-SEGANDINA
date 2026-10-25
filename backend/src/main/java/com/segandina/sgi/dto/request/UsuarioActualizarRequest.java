package com.segandina.sgi.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Cuerpo de {@code PUT /api/usuarios/{id}} (RF-02). Reemplaza los datos del usuario; el estado se cambia
 * aparte con {@code PATCH /api/usuarios/{id}/estado}.
 *
 * @param dni             DNI de 8 dígitos, único
 * @param nombres         nombres
 * @param apellidoPaterno apellido paterno
 * @param apellidoMaterno apellido materno; {@code null} o en blanco lo deja vacío
 * @param contrasena      nueva contraseña; {@code null} conserva la actual
 * @param idRol           rol del usuario
 * @param idZona          zona asignada; obligatoria si el rol es Vigilante. Cambiarla es reasignar al usuario
 */
public record UsuarioActualizarRequest(
		@NotBlank(message = "es obligatorio")
		@Pattern(regexp = "^[0-9]{8}$", message = "debe tener 8 dígitos") String dni,
		@NotBlank(message = "es obligatorio")
		@Size(max = 80, message = "no debe superar los 80 caracteres") String nombres,
		@NotBlank(message = "es obligatorio")
		@Size(max = 50, message = "no debe superar los 50 caracteres") String apellidoPaterno,
		@Size(max = 50, message = "no debe superar los 50 caracteres") String apellidoMaterno,
		@Size(min = 8, max = 72, message = "debe tener entre 8 y 72 caracteres") String contrasena,
		@NotNull(message = "es obligatorio") Short idRol,
		Integer idZona) {

	/** Evita que la contraseña aparezca en logs si el objeto se imprime. */
	@Override
	public String toString() {
		return "UsuarioActualizarRequest[dni=" + dni + ", nombres=" + nombres + ", apellidoPaterno="
				+ apellidoPaterno + ", apellidoMaterno=" + apellidoMaterno + ", contrasena="
				+ (contrasena == null ? "null" : "****") + ", idRol=" + idRol + ", idZona=" + idZona + "]";
	}

}
