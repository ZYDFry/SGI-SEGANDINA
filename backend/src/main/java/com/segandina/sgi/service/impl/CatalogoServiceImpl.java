package com.segandina.sgi.service.impl;

import java.util.List;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.segandina.sgi.dao.NivelGravedadDao;
import com.segandina.sgi.dao.RolDao;
import com.segandina.sgi.dao.TipoEventoDao;
import com.segandina.sgi.dao.ZonaDao;
import com.segandina.sgi.dto.response.NivelGravedadResponse;
import com.segandina.sgi.dto.response.RolResponse;
import com.segandina.sgi.dto.response.TipoEventoResponse;
import com.segandina.sgi.dto.response.ZonaResponse;
import com.segandina.sgi.service.CatalogoService;

@Service
@Transactional(readOnly = true)
public class CatalogoServiceImpl implements CatalogoService {

	private final ZonaDao zonaDao;
	private final TipoEventoDao tipoEventoDao;
	private final NivelGravedadDao nivelGravedadDao;
	private final RolDao rolDao;

	public CatalogoServiceImpl(ZonaDao zonaDao, TipoEventoDao tipoEventoDao, NivelGravedadDao nivelGravedadDao,
			RolDao rolDao) {
		this.zonaDao = zonaDao;
		this.tipoEventoDao = tipoEventoDao;
		this.nivelGravedadDao = nivelGravedadDao;
		this.rolDao = rolDao;
	}

	@Override
	public List<ZonaResponse> listarZonasActivas() {
		return zonaDao.findByEstadoActivoTrueOrderByNombreZonaAsc().stream().map(ZonaResponse::desde).toList();
	}

	@Override
	public List<TipoEventoResponse> listarTiposEventoActivos() {
		return tipoEventoDao.findByEstadoActivoTrueOrderByNombreTipoEventoAsc().stream()
				.map(TipoEventoResponse::desde)
				.toList();
	}

	@Override
	public List<NivelGravedadResponse> listarNivelesGravedadActivos() {
		return nivelGravedadDao.findByEstadoActivoTrueOrderByOrdenAsc().stream()
				.map(NivelGravedadResponse::desde)
				.toList();
	}

	@Override
	public List<RolResponse> listarRoles() {
		return rolDao.findAll(Sort.by("idRol")).stream().map(RolResponse::desde).toList();
	}

}
