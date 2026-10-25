package com.segandina.sgi.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Cuerpo de {@code POST /api/usuarios} (RF-02).
 *
 * @param dni             DNI de 8 dígitos, único
 * @param nombres         nombres
 * @param apellidoPaterno apellido paterno
 * @param apellidoMaterno apellido materno; opcional
 * @param contrasena      contraseña inicial en texto plano (se guarda como hash BCrypt)
 * @param idRol           rol del usuario
 * @param idZona          zona asignada; obligatoria si el rol es Vigilante
 */
public record UsuarioCrearRequest(
		@NotBlank(message = "es obligatorio")
		@Pattern(regexp = "^[0-9]{8}$", message = "debe tener 8 dígitos") String dni,
		@NotBlank(message = "es obligatorio")
		@Size(max = 80, message = "no debe superar los 80 caracteres") String nombres,
		@NotBlank(message = "es obligatorio")
		@Size(max = 50, message = "no debe superar los 50 caracteres") String apellidoPaterno,
		@Size(max = 50, message = "no debe superar los 50 caracteres") String apellidoMaterno,
		@NotBlank(message = "es obligatoria")
		@Size(min = 8, max = 72, message = "debe tener entre 8 y 72 caracteres") String contrasena,
		@NotNull(message = "es obligatorio") Short idRol,
		Integer idZona) {

	/** Evita que la contraseña aparezca en logs si el objeto se imprime. */
	@Override
	public String toString() {
		return "UsuarioCrearRequest[dni=" + dni + ", nombres=" + nombres + ", apellidoPaterno=" + apellidoPaterno
				+ ", apellidoMaterno=" + apellidoMaterno + ", contrasena=****, idRol=" + idRol + ", idZona=" + idZona
				+ "]";
	}

}
