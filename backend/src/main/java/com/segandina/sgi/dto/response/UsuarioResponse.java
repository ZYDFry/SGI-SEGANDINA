package com.segandina.sgi.dto.response;

import com.segandina.sgi.model.Usuario;

/**
 * Usuario para la gestión de personal (RF-02). No incluye la contraseña.
 *
 * @param idUsuario       id del usuario
 * @param dni             DNI
 * @param nombres         nombres
 * @param apellidoPaterno apellido paterno
 * @param apellidoMaterno apellido materno; puede ser {@code null}
 * @param idRol           id del rol
 * @param rol             nombre del rol
 * @param idZona          zona asignada; {@code null} si no tiene
 * @param nombreZona      nombre de la zona asignada; {@code null} si no tiene
 * @param estadoActivo    {@code false} si el usuario está dado de baja
 */
public record UsuarioResponse(Long idUsuario, String dni, String nombres, String apellidoPaterno,
		String apellidoMaterno, Short idRol, String rol, Integer idZona, String nombreZona, Boolean estadoActivo) {

	/**
	 * Construye la respuesta a partir de la entidad. Debe llamarse dentro de una transacción (o con rol y zona
	 * ya cargados), porque son relaciones LAZY.
	 *
	 * @param usuario entidad origen
	 * @return el usuario sin datos sensibles
	 */
	public static UsuarioResponse desde(Usuario usuario) {
		return new UsuarioResponse(
				usuario.getIdUsuario(),
				usuario.getDni(),
				usuario.getNombres(),
				usuario.getApellidoPaterno(),
				usuario.getApellidoMaterno(),
				usuario.getRol().getIdRol(),
				usuario.getRol().getNombreRol(),
				usuario.getZona() != null ? usuario.getZona().getIdZona() : null,
				usuario.getZona() != null ? usuario.getZona().getNombreZona() : null,
				usuario.getEstadoActivo());
	}

}
