package com.segandina.sgi.dto.response;

import com.segandina.sgi.model.Usuario;

/**
 * Vigilante y su zona asignada, para la pantalla de despliegue de una zona (RF-07). No incluye el DNI ni la
 * contraseña: el Supervisor solo necesita identificarlo y saber si está activo.
 *
 * @param idUsuario       id del vigilante
 * @param nombres         nombres
 * @param apellidoPaterno apellido paterno
 * @param apellidoMaterno apellido materno; puede ser {@code null}
 * @param idZona          zona asignada
 * @param nombreZona      nombre de la zona asignada
 * @param estadoActivo    {@code false} si está dado de baja
 */
public record VigilanteZonaResponse(Long idUsuario, String nombres, String apellidoPaterno, String apellidoMaterno,
		Integer idZona, String nombreZona, Boolean estadoActivo) {

	/**
	 * Construye la respuesta a partir de la entidad. Debe llamarse dentro de una transacción ({@code zona} es LAZY).
	 *
	 * @param usuario vigilante origen
	 * @return el vigilante como DTO
	 */
	public static VigilanteZonaResponse desde(Usuario usuario) {
		return new VigilanteZonaResponse(
				usuario.getIdUsuario(),
				usuario.getNombres(),
				usuario.getApellidoPaterno(),
				usuario.getApellidoMaterno(),
				usuario.getZona() != null ? usuario.getZona().getIdZona() : null,
				usuario.getZona() != null ? usuario.getZona().getNombreZona() : null,
				usuario.getEstadoActivo());
	}

}
