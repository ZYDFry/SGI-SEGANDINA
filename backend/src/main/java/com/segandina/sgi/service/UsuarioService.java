package com.segandina.sgi.service;

import org.springframework.data.domain.Page;

import com.segandina.sgi.dto.request.CambioContrasenaRequest;
import com.segandina.sgi.dto.request.UsuarioActualizarRequest;
import com.segandina.sgi.dto.request.UsuarioCrearRequest;
import com.segandina.sgi.dto.request.UsuarioFiltro;
import com.segandina.sgi.dto.response.UsuarioResponse;

/**
 * Gestión de usuarios (RF-02) y cambio de la contraseña propia. Las contraseñas se guardan siempre como hash
 * BCrypt y nunca se devuelven. No hay borrado físico: la baja es lógica.
 */
public interface UsuarioService {

	/** Nombre del rol con acceso total; un Administrador no puede quitarse este rol a sí mismo. */
	String ROL_ADMINISTRADOR = "Administrador";

	/** Nombre del rol que debe tener siempre una zona asignada. */
	String ROL_VIGILANTE = "Vigilante";

	/** Tamaño de página máximo permitido en el listado. */
	int TAMANO_MAXIMO = 100;

	/**
	 * Lista usuarios con filtros opcionales, ordenados por apellidos y nombres (sin distinguir mayúsculas).
	 *
	 * @param filtro filtros a aplicar; {@code null} devuelve todos
	 * @param pagina número de página desde 0; un valor negativo se toma como 0
	 * @param tamano elementos por página; se acota entre 1 y {@link #TAMANO_MAXIMO}
	 * @return la página de usuarios, con rol y zona
	 */
	Page<UsuarioResponse> buscar(UsuarioFiltro filtro, int pagina, int tamano);

	/**
	 * Obtiene un usuario por id.
	 *
	 * @param idUsuario id del usuario
	 * @return el usuario
	 * @throws com.segandina.sgi.exception.RecursoNoEncontradoException si no existe
	 */
	UsuarioResponse obtener(Long idUsuario);

	/**
	 * Crea un usuario activo y audita {@code CREAR_USUARIO} con sus datos (sin la contraseña).
	 *
	 * @param request datos del formulario
	 * @param idActor id del Administrador que hace el alta (del token)
	 * @return el usuario creado
	 * @throws com.segandina.sgi.exception.DatoDuplicadoException si el DNI ya está registrado
	 * @throws com.segandina.sgi.exception.ReglaNegocioException si el rol no existe, o la zona no existe, está
	 *         inactiva o falta para un Vigilante
	 */
	UsuarioResponse crear(UsuarioCrearRequest request, Long idActor);

	/**
	 * Reemplaza los datos de un usuario (incluida la reasignación de zona y, si se envía, la contraseña) y audita
	 * {@code MODIFICAR_USUARIO} con los valores antes y después. Si no cambia nada, no audita.
	 *
	 * @param idUsuario usuario a editar
	 * @param request   datos nuevos
	 * @param idActor   id del Administrador que edita (del token)
	 * @return el usuario actualizado
	 * @throws com.segandina.sgi.exception.RecursoNoEncontradoException si el usuario no existe
	 * @throws com.segandina.sgi.exception.DatoDuplicadoException si el DNI ya lo tiene otro usuario
	 * @throws com.segandina.sgi.exception.ReglaNegocioException si el rol o la zona no son válidos, o si el
	 *         Administrador intenta quitarse su propio rol
	 */
	UsuarioResponse actualizar(Long idUsuario, UsuarioActualizarRequest request, Long idActor);

	/**
	 * Activa o da de baja a un usuario y audita {@code CAMBIAR_ESTADO_USUARIO}. Si ya tenía ese estado, no
	 * cambia ni audita nada.
	 *
	 * @param idUsuario usuario a modificar
	 * @param activo    estado nuevo
	 * @param idActor   id del Administrador que hace el cambio (del token)
	 * @return el usuario con su estado final
	 * @throws com.segandina.sgi.exception.RecursoNoEncontradoException si el usuario no existe
	 * @throws com.segandina.sgi.exception.ReglaNegocioException si el Administrador intenta desactivarse a sí
	 *         mismo
	 */
	UsuarioResponse cambiarEstado(Long idUsuario, boolean activo, Long idActor);

	/**
	 * El usuario autenticado cambia su propia contraseña. Audita {@code CAMBIAR_CONTRASENA}.
	 *
	 * @param idUsuario id del dueño del token
	 * @param request   contraseña actual y nueva
	 * @throws com.segandina.sgi.exception.CredencialesInvalidasException si el usuario ya no existe o está
	 *         inactivo
	 * @throws com.segandina.sgi.exception.ReglaNegocioException si la contraseña actual no coincide o la nueva
	 *         es igual a la actual
	 */
	void cambiarContrasenaPropia(Long idUsuario, CambioContrasenaRequest request);

}
