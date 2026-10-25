package com.segandina.sgi.service.impl;

import static com.segandina.sgi.service.impl.SoporteServicio.actor;
import static com.segandina.sgi.service.impl.SoporteServicio.cambio;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.segandina.sgi.dao.NivelGravedadDao;
import com.segandina.sgi.dao.UsuarioDao;
import com.segandina.sgi.dto.request.NivelGravedadRequest;
import com.segandina.sgi.dto.response.NivelGravedadResponse;
import com.segandina.sgi.exception.DatoDuplicadoException;
import com.segandina.sgi.exception.RecursoNoEncontradoException;
import com.segandina.sgi.model.AccionAuditoria;
import com.segandina.sgi.model.NivelGravedad;
import com.segandina.sgi.model.Usuario;
import com.segandina.sgi.service.AuditoriaService;
import com.segandina.sgi.service.NivelGravedadService;

@Service
public class NivelGravedadServiceImpl implements NivelGravedadService {

	/**
	 * Orden que ocupa por un instante el nivel desplazado durante un intercambio. La API solo acepta órdenes
	 * desde 1, así que este valor nunca está en uso.
	 */
	static final short ORDEN_TEMPORAL = Short.MIN_VALUE;

	private final NivelGravedadDao nivelGravedadDao;
	private final UsuarioDao usuarioDao;
	private final AuditoriaService auditoriaService;

	public NivelGravedadServiceImpl(NivelGravedadDao nivelGravedadDao, UsuarioDao usuarioDao,
			AuditoriaService auditoriaService) {
		this.nivelGravedadDao = nivelGravedadDao;
		this.usuarioDao = usuarioDao;
		this.auditoriaService = auditoriaService;
	}

	@Override
	@Transactional(readOnly = true)
	public List<NivelGravedadResponse> listar() {
		return nivelGravedadDao.findAllByOrderByOrdenAsc().stream().map(NivelGravedadResponse::desde).toList();
	}

	@Override
	@Transactional
	public NivelGravedadResponse actualizar(Short idNivelGravedad, NivelGravedadRequest request, Long idActor) {
		Usuario admin = actor(usuarioDao, idActor);
		NivelGravedad nivel = nivelGravedadDao.findById(idNivelGravedad)
				.orElseThrow(() -> new RecursoNoEncontradoException("El nivel de gravedad no existe"));
		String nombre = request.nombreNivel().trim();
		Short orden = request.orden();
		if (nivelGravedadDao.existsByNombreNivelIgnoreCaseAndIdNivelGravedadNot(nombre, idNivelGravedad)) {
			throw new DatoDuplicadoException("Ya existe un nivel de gravedad con el nombre \"" + nombre + "\"");
		}
		String nombreAnterior = nivel.getNombreNivel();
		Short ordenAnterior = nivel.getOrden();
		if (nombre.equals(nombreAnterior) && orden.equals(ordenAnterior)) {
			return NivelGravedadResponse.desde(nivel);
		}

		Optional<NivelGravedad> ocupante = orden.equals(ordenAnterior) ? Optional.empty()
				: nivelGravedadDao.findByOrden(orden).filter(otro -> !otro.equals(nivel));
		// orden es UNIQUE y no diferible: el otro nivel pasa por un orden temporal antes de tomar el anterior
		ocupante.ifPresent(otro -> {
			otro.setOrden(ORDEN_TEMPORAL);
			nivelGravedadDao.saveAndFlush(otro);
		});
		nivel.setNombreNivel(nombre);
		nivel.setOrden(orden);
		nivelGravedadDao.saveAndFlush(nivel);
		ocupante.ifPresent(otro -> {
			otro.setOrden(ordenAnterior);
			nivelGravedadDao.saveAndFlush(otro);
		});

		Map<String, Object> detalle = cambio("idNivelGravedad", idNivelGravedad,
				Map.of("nombreNivel", nombreAnterior, "orden", ordenAnterior),
				Map.of("nombreNivel", nombre, "orden", orden));
		ocupante.ifPresent(otro -> detalle.put("intercambiadoCon", Map.of(
				"idNivelGravedad", otro.getIdNivelGravedad(),
				"ordenAntes", orden,
				"ordenDespues", ordenAnterior)));
		auditoriaService.registrar(AccionAuditoria.MODIFICAR_NIVEL_GRAVEDAD, detalle, null, admin);
		return NivelGravedadResponse.desde(nivel);
	}

}
