package com.segandina.sgi.service.impl;

import static com.segandina.sgi.service.impl.SoporteServicio.actor;
import static com.segandina.sgi.service.impl.SoporteServicio.cambio;
import static com.segandina.sgi.service.impl.SoporteServicio.opcional;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.segandina.sgi.dao.RolDao;
import com.segandina.sgi.dao.UsuarioDao;
import com.segandina.sgi.dao.ZonaDao;
import com.segandina.sgi.dto.request.CambioContrasenaRequest;
import com.segandina.sgi.dto.request.UsuarioActualizarRequest;
import com.segandina.sgi.dto.request.UsuarioCrearRequest;
import com.segandina.sgi.dto.request.UsuarioFiltro;
import com.segandina.sgi.dto.response.UsuarioResponse;
import com.segandina.sgi.exception.DatoDuplicadoException;
import com.segandina.sgi.exception.RecursoNoEncontradoException;
import com.segandina.sgi.exception.ReglaNegocioException;
import com.segandina.sgi.model.AccionAuditoria;
import com.segandina.sgi.model.Rol;
import com.segandina.sgi.model.Usuario;
import com.segandina.sgi.model.Zona;
import com.segandina.sgi.service.AuditoriaService;
import com.segandina.sgi.service.UsuarioService;

@Service
public class UsuarioServiceImpl implements UsuarioService {

	private static final Sort ORDEN_POR_NOMBRE = Sort.by(
			Sort.Order.asc("apellidoPaterno").ignoreCase(),
			Sort.Order.asc("apellidoMaterno").ignoreCase(),
			Sort.Order.asc("nombres").ignoreCase());

	// Clave del detalle de auditoría cuando la contraseña asignada es temporal
	private static final String DEBE_CAMBIAR_CONTRASENA = "debeCambiarContrasena";

	private final UsuarioDao usuarioDao;
	private final RolDao rolDao;
	private final ZonaDao zonaDao;
	private final PasswordEncoder passwordEncoder;
	private final AuditoriaService auditoriaService;

	public UsuarioServiceImpl(UsuarioDao usuarioDao, RolDao rolDao, ZonaDao zonaDao, PasswordEncoder passwordEncoder,
			AuditoriaService auditoriaService) {
		this.usuarioDao = usuarioDao;
		this.rolDao = rolDao;
		this.zonaDao = zonaDao;
		this.passwordEncoder = passwordEncoder;
		this.auditoriaService = auditoriaService;
	}

	@Override
	@Transactional(readOnly = true)
	public Page<UsuarioResponse> buscar(UsuarioFiltro filtro, int pagina, int tamano) {
		Pageable pageable = PageRequest.of(Math.max(pagina, 0), Math.clamp(tamano, 1, TAMANO_MAXIMO),
				ORDEN_POR_NOMBRE);
		return usuarioDao.findAll(UsuarioDao.conFiltros(filtro), pageable).map(UsuarioResponse::desde);
	}

	@Override
	@Transactional(readOnly = true)
	public UsuarioResponse obtener(Long idUsuario) {
		return UsuarioResponse.desde(buscarExistente(idUsuario));
	}

	@Override
	@Transactional
	public UsuarioResponse crear(UsuarioCrearRequest request, Long idActor) {
		Usuario admin = actor(usuarioDao, idActor);
		String dni = request.dni().trim();
		if (usuarioDao.existsByDni(dni)) {
			throw new DatoDuplicadoException("Ya existe un usuario con el DNI " + dni);
		}
		Rol rol = buscarRol(request.idRol());

		Usuario usuario = new Usuario();
		usuario.setDni(dni);
		usuario.setNombres(request.nombres().trim());
		usuario.setApellidoPaterno(request.apellidoPaterno().trim());
		usuario.setApellidoMaterno(opcional(request.apellidoMaterno()));
		usuario.setContrasena(passwordEncoder.encode(request.contrasena()));
		// La contraseña inicial es temporal: el usuario debe cambiarla en su primer inicio de sesión
		usuario.setDebeCambiarContrasena(Boolean.TRUE);
		usuario.setEstadoActivo(Boolean.TRUE);
		usuario.setRol(rol);
		usuario.setZona(resolverZona(rol, request.idZona(), null));
		Usuario guardado = usuarioDao.save(usuario);

		Map<String, Object> detalle = cambio("idUsuario", guardado.getIdUsuario(), null, datos(guardado));
		detalle.put(DEBE_CAMBIAR_CONTRASENA, true);
		auditoriaService.registrar(AccionAuditoria.CREAR_USUARIO, detalle, null, admin);
		return UsuarioResponse.desde(guardado);
	}

	@Override
	@Transactional
	public UsuarioResponse actualizar(Long idUsuario, UsuarioActualizarRequest request, Long idActor) {
		Usuario admin = actor(usuarioDao, idActor);
		Usuario usuario = buscarExistente(idUsuario);
		String dni = request.dni().trim();
		if (usuarioDao.existsByDniAndIdUsuarioNot(dni, idUsuario)) {
			throw new DatoDuplicadoException("Ya existe un usuario con el DNI " + dni);
		}
		Rol rol = buscarRol(request.idRol());
		if (usuario.equals(admin) && !ROL_ADMINISTRADOR.equals(rol.getNombreRol())) {
			throw new ReglaNegocioException("No puede quitarse a sí mismo el rol " + ROL_ADMINISTRADOR);
		}

		Map<String, Object> antes = datos(usuario);
		usuario.setDni(dni);
		usuario.setNombres(request.nombres().trim());
		usuario.setApellidoPaterno(request.apellidoPaterno().trim());
		usuario.setApellidoMaterno(opcional(request.apellidoMaterno()));
		usuario.setZona(resolverZona(rol, request.idZona(), usuario.getZona()));
		usuario.setRol(rol);
		boolean contrasenaCambiada = request.contrasena() != null;
		if (contrasenaCambiada) {
			usuario.setContrasena(passwordEncoder.encode(request.contrasena()));
			usuario.setDebeCambiarContrasena(Boolean.TRUE);
		}
		Map<String, Object> despues = datos(usuario);

		if (contrasenaCambiada || !antes.equals(despues)) {
			Map<String, Object> detalle = cambio("idUsuario", idUsuario, antes, despues);
			// Solo se registra que la contraseña cambió; nunca el hash
			detalle.put("contrasenaCambiada", contrasenaCambiada);
			if (contrasenaCambiada) {
				detalle.put(DEBE_CAMBIAR_CONTRASENA, true);
			}
			auditoriaService.registrar(AccionAuditoria.MODIFICAR_USUARIO, detalle, null, admin);
		}
		return UsuarioResponse.desde(usuario);
	}

	@Override
	@Transactional
	public UsuarioResponse cambiarEstado(Long idUsuario, boolean activo, Long idActor) {
		Usuario admin = actor(usuarioDao, idActor);
		Usuario usuario = buscarExistente(idUsuario);
		if (usuario.equals(admin) && !activo) {
			throw new ReglaNegocioException("No puede desactivar su propia cuenta");
		}
		if (usuario.getEstadoActivo() != activo) {
			usuario.setEstadoActivo(activo);
			auditoriaService.registrar(AccionAuditoria.CAMBIAR_ESTADO_USUARIO,
					cambio("idUsuario", idUsuario, Map.of("estadoActivo", !activo), Map.of("estadoActivo", activo)),
					null, admin);
		}
		return UsuarioResponse.desde(usuario);
	}

	@Override
	@Transactional
	public void cambiarContrasenaPropia(Long idUsuario, CambioContrasenaRequest request) {
		Usuario usuario = actor(usuarioDao, idUsuario);
		if (!passwordEncoder.matches(request.contrasenaActual(), usuario.getContrasena())) {
			throw new ReglaNegocioException("La contraseña actual no es correcta");
		}
		if (passwordEncoder.matches(request.contrasenaNueva(), usuario.getContrasena())) {
			throw new ReglaNegocioException("La nueva contraseña debe ser distinta de la actual");
		}
		boolean eraObligatorio = Boolean.TRUE.equals(usuario.getDebeCambiarContrasena());
		usuario.setContrasena(passwordEncoder.encode(request.contrasenaNueva()));
		usuario.setDebeCambiarContrasena(Boolean.FALSE);
		auditoriaService.registrar(AccionAuditoria.CAMBIAR_CONTRASENA,
				Map.of("idUsuario", idUsuario, "origen", "propio", "cambioObligatorio", eraObligatorio), null, usuario);
	}

	@Override
	@Transactional
	public void restablecerContrasena(Long idUsuario, String contrasenaNueva, Long idActor) {
		Usuario admin = actor(usuarioDao, idActor);
		Usuario usuario = buscarExistente(idUsuario);
		if (usuario.equals(admin)) {
			throw new ReglaNegocioException(
					"Para cambiar su propia contraseña use PATCH /api/usuarios/me/contrasena");
		}
		usuario.setContrasena(passwordEncoder.encode(contrasenaNueva));
		usuario.setDebeCambiarContrasena(Boolean.TRUE);
		// Solo el id del afectado y la marca de cambio obligatorio; nunca la contraseña ni el hash
		auditoriaService.registrar(AccionAuditoria.RESTABLECER_CONTRASENA,
				Map.of("idUsuario", idUsuario, DEBE_CAMBIAR_CONTRASENA, true), null, admin);
	}

	private Usuario buscarExistente(Long idUsuario) {
		return usuarioDao.findById(idUsuario)
				.orElseThrow(() -> new RecursoNoEncontradoException("El usuario no existe"));
	}

	private Rol buscarRol(Short idRol) {
		return rolDao.findById(idRol).orElseThrow(() -> new ReglaNegocioException("El rol seleccionado no existe"));
	}

	/**
	 * Zona que corresponde según el rol. Un Vigilante debe tener zona. Una zona nueva o distinta de la actual
	 * debe estar activa; la actual se conserva aunque se haya desactivado después de asignarla.
	 */
	private Zona resolverZona(Rol rol, Integer idZona, Zona actual) {
		if (idZona == null) {
			if (ROL_VIGILANTE.equals(rol.getNombreRol())) {
				throw new ReglaNegocioException("El " + ROL_VIGILANTE + " debe tener una zona asignada");
			}
			return null;
		}
		if (actual != null && idZona.equals(actual.getIdZona())) {
			return actual;
		}
		return zonaDao.findById(idZona)
				.filter(z -> Boolean.TRUE.equals(z.getEstadoActivo()))
				.orElseThrow(() -> new ReglaNegocioException("La zona seleccionada no existe o está inactiva"));
	}

	// Datos del usuario para la auditoría; nunca incluye la contraseña
	private static Map<String, Object> datos(Usuario usuario) {
		Map<String, Object> datos = new LinkedHashMap<>();
		datos.put("dni", usuario.getDni());
		datos.put("nombres", usuario.getNombres());
		datos.put("apellidoPaterno", usuario.getApellidoPaterno());
		datos.put("apellidoMaterno", usuario.getApellidoMaterno());
		datos.put("idRol", usuario.getRol().getIdRol());
		datos.put("rol", usuario.getRol().getNombreRol());
		datos.put("idZona", usuario.getZona() != null ? usuario.getZona().getIdZona() : null);
		datos.put("estadoActivo", usuario.getEstadoActivo());
		return datos;
	}

}
