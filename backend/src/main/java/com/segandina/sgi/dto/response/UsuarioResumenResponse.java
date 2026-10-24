package com.segandina.sgi.dto.response;

import com.segandina.sgi.model.Usuario;

/**
 * Datos básicos de un usuario para el frontend. No incluye la contraseña.
 *
 * @param idUsuario       id del usuario
 * @param dni             DNI
 * @param nombres         nombres
 * @param apellidoPaterno apellido paterno
 * @param apellidoMaterno apellido materno; puede ser {@code null}
 * @param rol             nombre del rol (Administrador, Supervisor o Vigilante)
 * @param idZona          zona asignada; {@code null} si no tiene
 */
public record UsuarioResumenResponse(Long idUsuario, String dni, String nombres, String apellidoPaterno,
		String apellidoMaterno, String rol, Integer idZona) {

	/**
	 * Construye el resumen a partir de la entidad. Debe llamarse dentro de una transacción, porque
	 * {@code rol} y {@code zona} son relaciones LAZY.
	 *
	 * @param usuario entidad origen
	 * @return el resumen sin datos sensibles
	 */
	public static UsuarioResumenResponse desde(Usuario usuario) {
		return new UsuarioResumenResponse(
				usuario.getIdUsuario(),
				usuario.getDni(),
				usuario.getNombres(),
				usuario.getApellidoPaterno(),
				usuario.getApellidoMaterno(),
				usuario.getRol().getNombreRol(),
				usuario.getZona() != null ? usuario.getZona().getIdZona() : null);
	}

}
