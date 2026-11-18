package com.segandina.sgi.service.impl;

import static com.segandina.sgi.service.impl.SoporteServicio.actor;
import static com.segandina.sgi.service.impl.SoporteServicio.cambio;

import java.time.Clock;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.segandina.sgi.config.IncidenciaProperties;
import com.segandina.sgi.dao.IncidenciaDao;
import com.segandina.sgi.dao.NivelGravedadDao;
import com.segandina.sgi.dao.TipoEventoDao;
import com.segandina.sgi.dao.UsuarioDao;
import com.segandina.sgi.dao.ZonaDao;
import com.segandina.sgi.dto.request.IncidenciaFiltro;
import com.segandina.sgi.dto.request.IncidenciaRequest;
import com.segandina.sgi.dto.request.PeriodoFiltro;
import com.segandina.sgi.dto.request.RangoFechas;
import com.segandina.sgi.dto.response.IncidenciaHistorialResponse;
import com.segandina.sgi.dto.response.IncidenciaResponse;
import com.segandina.sgi.dto.response.MiIncidenciaResponse;
import com.segandina.sgi.exception.RecursoNoEncontradoException;
import com.segandina.sgi.exception.ReglaNegocioException;
import com.segandina.sgi.model.AccionAuditoria;
import com.segandina.sgi.model.Incidencia;
import com.segandina.sgi.model.NivelGravedad;
import com.segandina.sgi.model.TipoEvento;
import com.segandina.sgi.model.Usuario;
import com.segandina.sgi.model.Zona;
import com.segandina.sgi.service.AuditoriaService;
import com.segandina.sgi.service.IncidenciaService;
import com.segandina.sgi.service.UsuarioService;

@Service
public class IncidenciaServiceImpl implements IncidenciaService {

	private final IncidenciaDao incidenciaDao;
	private final UsuarioDao usuarioDao;
	private final ZonaDao zonaDao;
	private final TipoEventoDao tipoEventoDao;
	private final NivelGravedadDao nivelGravedadDao;
	private final AuditoriaService auditoriaService;
	private final Clock reloj;
	private final Duration plazoEdicion;

	public IncidenciaServiceImpl(IncidenciaDao incidenciaDao, UsuarioDao usuarioDao, ZonaDao zonaDao,
			TipoEventoDao tipoEventoDao, NivelGravedadDao nivelGravedadDao, AuditoriaService auditoriaService,
			Clock reloj, IncidenciaProperties incidenciaProperties) {
		this.incidenciaDao = incidenciaDao;
		this.usuarioDao = usuarioDao;
		this.zonaDao = zonaDao;
		this.tipoEventoDao = tipoEventoDao;
		this.nivelGravedadDao = nivelGravedadDao;
		this.auditoriaService = auditoriaService;
		this.reloj = reloj;
		this.plazoEdicion = incidenciaProperties.plazoEdicion();
	}

	@Override
	@Transactional
	public IncidenciaResponse registrar(IncidenciaRequest request, Long idUsuario) {
		Usuario usuario = actor(usuarioDao, idUsuario);

		if (esVigilante(usuario)) {
			validarZonaDelVigilante(usuario, request.idZona());
		}

		OffsetDateTime ahora = OffsetDateTime.now(reloj);
		DatosIncidencia datos = validarDatos(request, ahora, ahora);

		Incidencia incidencia = new Incidencia();
		datos.aplicarA(incidencia);
		incidencia.setUsuario(usuario);
		Incidencia guardada = incidenciaDao.save(incidencia);

		auditoriaService.registrar(AccionAuditoria.REGISTRAR_INCIDENCIA, Map.of(
				"idIncidencia", guardada.getIdIncidencia(),
				"idZona", datos.zona().getIdZona(),
				"idTipoEvento", datos.tipo().getIdTipoEvento(),
				"idNivelGravedad", datos.nivel().getIdNivelGravedad()), null, usuario);

		return IncidenciaResponse.desde(guardada);
	}

	@Override
	@Transactional
	public IncidenciaResponse corregir(Long idIncidencia, IncidenciaRequest request, Long idUsuario) {
		Usuario usuario = actor(usuarioDao, idUsuario);
		// Una incidencia ajena responde igual que una inexistente, para no revelar que existe
		Incidencia incidencia = incidenciaDao.findById(idIncidencia)
				.filter(i -> usuario.getIdUsuario().equals(i.getUsuario().getIdUsuario()))
				.orElseThrow(() -> new RecursoNoEncontradoException(INCIDENCIA_NO_EXISTE));

		OffsetDateTime ahora = OffsetDateTime.now(reloj);
		if (editableHasta(incidencia, ahora) == null) {
			throw new ReglaNegocioException(IncidenciaService.plazoTerminado(plazoEdicion));
		}
		// Zona efectiva: la de la incidencia, no la asignada hoy (pudo reasignarse durante el plazo)
		if (esVigilante(usuario) && !incidencia.getZona().getIdZona().equals(request.idZona())) {
			throw new ReglaNegocioException(ZONA_NO_EDITABLE);
		}

		DatosIncidencia datos = validarDatos(request, ahora, incidencia.getFechaHora());
		Map<String, Object> antes = new LinkedHashMap<>();
		Map<String, Object> despues = new LinkedHashMap<>();
		comparar("idZona", incidencia.getZona().getIdZona(), datos.zona().getIdZona(), antes, despues);
		comparar("idTipoEvento", incidencia.getTipoEvento().getIdTipoEvento(), datos.tipo().getIdTipoEvento(),
				antes, despues);
		comparar("idNivelGravedad", incidencia.getNivelGravedad().getIdNivelGravedad(),
				datos.nivel().getIdNivelGravedad(), antes, despues);
		comparar("descripcion", incidencia.getDescripcion(), datos.descripcion(), antes, despues);
		// La fecha se compara como instante: el mismo momento con otro offset no es un cambio
		if (!incidencia.getFechaHora().isEqual(datos.fechaHora())) {
			antes.put("fechaHora", incidencia.getFechaHora().format(DateTimeFormatter.ISO_OFFSET_DATE_TIME));
			despues.put("fechaHora", datos.fechaHora().format(DateTimeFormatter.ISO_OFFSET_DATE_TIME));
		}

		if (despues.isEmpty()) {
			return IncidenciaResponse.desde(incidencia);
		}
		datos.aplicarA(incidencia);
		Incidencia guardada = incidenciaDao.save(incidencia);
		auditoriaService.registrar(AccionAuditoria.EDITAR_INCIDENCIA,
				cambio("idIncidencia", idIncidencia, antes, despues), null, usuario);
		return IncidenciaResponse.desde(guardada);
	}

	@Override
	@Transactional(readOnly = true)
	public Page<IncidenciaHistorialResponse> buscar(IncidenciaFiltro filtro, int pagina, int tamano) {
		RangoFechas rango = RangoFechas.resolver(filtro.periodo(), filtro.desde(), filtro.hasta(), reloj);
		return incidenciaDao.findAll(IncidenciaDao.conFiltros(rango, filtro), paginaHistorial(pagina, tamano))
				.map(IncidenciaHistorialResponse::desde);
	}

	@Override
	@Transactional(readOnly = true)
	public Page<MiIncidenciaResponse> buscarPropias(PeriodoFiltro filtro, Long idUsuario, int pagina, int tamano) {
		RangoFechas rango = RangoFechas.resolver(filtro.periodo(), filtro.desde(), filtro.hasta(), reloj);
		Specification<Incidencia> spec = IncidenciaDao.conFiltros(rango, null).and(IncidenciaDao.delUsuario(idUsuario));
		OffsetDateTime ahora = OffsetDateTime.now(reloj);
		return incidenciaDao.findAll(spec, paginaHistorial(pagina, tamano))
				.map(i -> MiIncidenciaResponse.desde(i, editableHasta(i, ahora)));
	}

	// Página del historial: número no negativo, tamaño entre 1 y el máximo, más reciente primero
	private static Pageable paginaHistorial(int pagina, int tamano) {
		return PageRequest.of(Math.max(pagina, 0), Math.clamp(tamano, 1, TAMANO_MAXIMO), IncidenciaDao.ORDEN_HISTORIAL);
	}

	// Fin del plazo de corrección en hora de Lima, o null si ya venció (justo en el límite todavía se puede)
	private OffsetDateTime editableHasta(Incidencia incidencia, OffsetDateTime ahora) {
		if (incidencia.getFechaRegistro() == null) {
			return null;
		}
		OffsetDateTime limite = incidencia.getFechaRegistro().plus(plazoEdicion)
				.atZoneSameInstant(reloj.getZone()).toOffsetDateTime();
		return ahora.isAfter(limite) ? null : limite;
	}

	// Reglas comunes de registrar y corregir: catálogos activos, "Otro" con descripción larga y fecha no futura.
	// Sin fechaHora en el request se usa fechaPorDefecto (la hora actual al registrar; la guardada al corregir).
	private DatosIncidencia validarDatos(IncidenciaRequest request, OffsetDateTime ahora,
			OffsetDateTime fechaPorDefecto) {
		Zona zona = activo(zonaDao.findById(request.idZona()), Zona::getEstadoActivo,
				"La zona seleccionada no existe o está inactiva");
		TipoEvento tipo = activo(tipoEventoDao.findById(request.idTipoEvento()), TipoEvento::getEstadoActivo,
				"El tipo de evento seleccionado no existe o está inactivo");
		NivelGravedad nivel = activo(nivelGravedadDao.findById(request.idNivelGravedad()),
				NivelGravedad::getEstadoActivo, "El nivel de gravedad seleccionado no existe o está inactivo");

		String descripcion = request.descripcion().trim();
		if (TIPO_OTRO.equalsIgnoreCase(tipo.getNombreTipoEvento().trim())
				&& descripcion.length() < MIN_DESCRIPCION_OTRO) {
			throw new ReglaNegocioException("Para el tipo \"" + TIPO_OTRO + "\" la descripción debe tener al menos "
					+ MIN_DESCRIPCION_OTRO + " caracteres");
		}

		OffsetDateTime fechaHora = request.fechaHora() != null ? request.fechaHora() : fechaPorDefecto;
		if (fechaHora.isAfter(ahora.plus(TOLERANCIA_RELOJ))) {
			throw new ReglaNegocioException("La fecha y hora de la incidencia no puede ser futura");
		}
		return new DatosIncidencia(zona, tipo, nivel, descripcion, fechaHora);
	}

	// Datos del formulario ya validados
	private record DatosIncidencia(Zona zona, TipoEvento tipo, NivelGravedad nivel, String descripcion,
			OffsetDateTime fechaHora) {

		void aplicarA(Incidencia incidencia) {
			incidencia.setZona(zona);
			incidencia.setTipoEvento(tipo);
			incidencia.setNivelGravedad(nivel);
			incidencia.setDescripcion(descripcion);
			incidencia.setFechaHora(fechaHora);
		}
	}

	// Agrega el campo a antes/despues solo si su valor cambió
	private static void comparar(String campo, Object anterior, Object nuevo, Map<String, Object> antes,
			Map<String, Object> despues) {
		if (!Objects.equals(anterior, nuevo)) {
			antes.put(campo, anterior);
			despues.put(campo, nuevo);
		}
	}

	private static boolean esVigilante(Usuario usuario) {
		return UsuarioService.ROL_VIGILANTE.equals(usuario.getRol().getNombreRol());
	}

	// El Vigilante solo registra en su zona asignada y activa. Se valida antes de buscar la zona pedida, así que
	// una zona ajena (exista o no) recibe el mismo mensaje.
	private static void validarZonaDelVigilante(Usuario vigilante, Integer idZona) {
		Zona asignada = vigilante.getZona();
		if (asignada == null) {
			throw new ReglaNegocioException(SIN_ZONA_ASIGNADA);
		}
		if (!Boolean.TRUE.equals(asignada.getEstadoActivo())) {
			throw new ReglaNegocioException(ZONA_ASIGNADA_INACTIVA);
		}
		if (!asignada.getIdZona().equals(idZona)) {
			throw new ReglaNegocioException(SOLO_ZONA_ASIGNADA);
		}
	}

	// Devuelve el registro del catálogo si existe y está activo; si no, rechaza con el mensaje indicado
	private static <T> T activo(Optional<T> registro, Function<T, Boolean> estadoActivo, String mensaje) {
		return registro.filter(r -> Boolean.TRUE.equals(estadoActivo.apply(r)))
				.orElseThrow(() -> new ReglaNegocioException(mensaje));
	}

}
