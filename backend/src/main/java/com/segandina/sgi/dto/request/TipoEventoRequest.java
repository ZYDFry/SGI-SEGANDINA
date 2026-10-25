package com.segandina.sgi.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Cuerpo de {@code POST /api/tipos-evento} y {@code PUT /api/tipos-evento/{id}} (RF-09).
 *
 * @param nombreTipoEvento nombre único del tipo de evento
 */
public record TipoEventoRequest(
		@NotBlank(message = "es obligatorio")
		@Size(max = 30, message = "no debe superar los 30 caracteres") String nombreTipoEvento) {
}
