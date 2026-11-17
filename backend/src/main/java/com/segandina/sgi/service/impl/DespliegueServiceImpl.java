package com.segandina.sgi.service.impl;

import java.util.List;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.segandina.sgi.dao.RolDao;
import com.segandina.sgi.dao.UsuarioDao;
import com.segandina.sgi.dao.ZonaDao;
import com.segandina.sgi.dto.request.UsuarioFiltro;
import com.segandina.sgi.dto.response.VigilanteZonaResponse;
import com.segandina.sgi.dto.response.ZonaResponse;
import com.segandina.sgi.exception.RecursoNoEncontradoException;
import com.segandina.sgi.service.DespliegueService;
import com.segandina.sgi.service.UsuarioService;

@Service
@Transactional(readOnly = true)
public class DespliegueServiceImpl implements DespliegueService {

	private static final Sort ORDEN_POR_NOMBRE = Sort.by(
			Sort.Order.asc("apellidoPaterno").ignoreCase(),
			Sort.Order.asc("apellidoMaterno").ignoreCase(),
			Sort.Order.asc("nombres").ignoreCase());

	private final ZonaDao zonaDao;
	private final UsuarioDao usuarioDao;
	private final RolDao rolDao;

	public DespliegueServiceImpl(ZonaDao zonaDao, UsuarioDao usuarioDao, RolDao rolDao) {
		this.zonaDao = zonaDao;
		this.usuarioDao = usuarioDao;
		this.rolDao = rolDao;
	}

	@Override
	public ZonaResponse obtenerZona(Integer idZona) {
		return zonaDao.findById(idZona).map(ZonaResponse::desde)
				.orElseThrow(() -> new RecursoNoEncontradoException("La zona no existe"));
	}

	@Override
	public List<VigilanteZonaResponse> listarVigilantes(Integer idZona, Boolean activo) {
		return rolDao.findByNombreRol(UsuarioService.ROL_VIGILANTE)
				.map(rol -> usuarioDao
						.findAll(UsuarioDao.conFiltros(new UsuarioFiltro(rol.getIdRol(), idZona, activo, null)),
								ORDEN_POR_NOMBRE)
						.stream().map(VigilanteZonaResponse::desde).toList())
				.orElse(List.of());
	}

}
