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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.segandina.sgi.dao.UsuarioDao;
import com.segandina.sgi.dao.ZonaDao;
import com.segandina.sgi.dto.request.ZonaFiltro;
import com.segandina.sgi.dto.request.ZonaRequest;
import com.segandina.sgi.dto.response.ZonaResponse;
import com.segandina.sgi.exception.DatoDuplicadoException;
import com.segandina.sgi.exception.RecursoNoEncontradoException;
import com.segandina.sgi.model.AccionAuditoria;
import com.segandina.sgi.model.Usuario;
import com.segandina.sgi.model.Zona;
import com.segandina.sgi.service.AuditoriaService;
import com.segandina.sgi.service.ZonaService;

@Service
public class ZonaServiceImpl implements ZonaService {

	private static final Sort ORDEN_POR_NOMBRE = Sort.by(Sort.Order.asc("nombreZona").ignoreCase());

	private final ZonaDao zonaDao;
	private final UsuarioDao usuarioDao;
	private final AuditoriaService auditoriaService;

	public ZonaServiceImpl(ZonaDao zonaDao, UsuarioDao usuarioDao, AuditoriaService auditoriaService) {
		this.zonaDao = zonaDao;
		this.usuarioDao = usuarioDao;
		this.auditoriaService = auditoriaService;
	}

	@Override
	@Transactional(readOnly = true)
	public Page<ZonaResponse> buscar(ZonaFiltro filtro, int pagina, int tamano) {
		Pageable pageable = PageRequest.of(Math.max(pagina, 0), Math.clamp(tamano, 1, TAMANO_MAXIMO),
				ORDEN_POR_NOMBRE);
		return zonaDao.findAll(ZonaDao.conFiltros(filtro), pageable).map(ZonaResponse::desde);
	}

	@Override
	@Transactional(readOnly = true)
	public ZonaResponse obtener(Integer idZona) {
		return ZonaResponse.desde(buscarExistente(idZona));
	}

	@Override
	@Transactional
	public ZonaResponse crear(ZonaRequest request, Long idActor) {
		Usuario admin = actor(usuarioDao, idActor);
		String nombre = request.nombreZona().trim();
		if (zonaDao.existsByNombreZonaIgnoreCase(nombre)) {
			throw duplicada(nombre);
		}
		Zona zona = new Zona();
		aplicar(zona, request);
		zona.setEstadoActivo(Boolean.TRUE);
		Zona guardada = zonaDao.save(zona);

		auditoriaService.registrar(AccionAuditoria.CREAR_ZONA,
				cambio("idZona", guardada.getIdZona(), null, datos(guardada)), null, admin);
		return ZonaResponse.desde(guardada);
	}

	@Override
	@Transactional
	public ZonaResponse actualizar(Integer idZona, ZonaRequest request, Long idActor) {
		Usuario admin = actor(usuarioDao, idActor);
		Zona zona = buscarExistente(idZona);
		String nombre = request.nombreZona().trim();
		if (zonaDao.existsByNombreZonaIgnoreCaseAndIdZonaNot(nombre, idZona)) {
			throw duplicada(nombre);
		}
		Map<String, Object> antes = datos(zona);
		aplicar(zona, request);
		Map<String, Object> despues = datos(zona);
		if (!antes.equals(despues)) {
			auditoriaService.registrar(AccionAuditoria.MODIFICAR_ZONA, cambio("idZona", idZona, antes, despues),
					null, admin);
		}
		return ZonaResponse.desde(zona);
	}

	@Override
	@Transactional
	public ZonaResponse cambiarEstado(Integer idZona, boolean activo, Long idActor) {
		Usuario admin = actor(usuarioDao, idActor);
		Zona zona = buscarExistente(idZona);
		if (zona.getEstadoActivo() != activo) {
			zona.setEstadoActivo(activo);
			auditoriaService.registrar(AccionAuditoria.CAMBIAR_ESTADO_ZONA,
					cambio("idZona", idZona, Map.of("estadoActivo", !activo), Map.of("estadoActivo", activo)),
					null, admin);
		}
		return ZonaResponse.desde(zona);
	}

	private Zona buscarExistente(Integer idZona) {
		return zonaDao.findById(idZona).orElseThrow(() -> new RecursoNoEncontradoException("La zona no existe"));
	}

	private static DatoDuplicadoException duplicada(String nombre) {
		return new DatoDuplicadoException("Ya existe una zona con el nombre \"" + nombre + "\"");
	}

	private static void aplicar(Zona zona, ZonaRequest request) {
		zona.setNombreZona(request.nombreZona().trim());
		zona.setDepartamento(request.departamento().trim());
		zona.setProvincia(request.provincia().trim());
		zona.setDistrito(request.distrito().trim());
		zona.setReferencia(opcional(request.referencia()));
		zona.setDescripcion(opcional(request.descripcion()));
	}

	private static Map<String, Object> datos(Zona zona) {
		Map<String, Object> datos = new LinkedHashMap<>();
		datos.put("nombreZona", zona.getNombreZona());
		datos.put("departamento", zona.getDepartamento());
		datos.put("provincia", zona.getProvincia());
		datos.put("distrito", zona.getDistrito());
		datos.put("referencia", zona.getReferencia());
		datos.put("descripcion", zona.getDescripcion());
		datos.put("estadoActivo", zona.getEstadoActivo());
		return datos;
	}

}
