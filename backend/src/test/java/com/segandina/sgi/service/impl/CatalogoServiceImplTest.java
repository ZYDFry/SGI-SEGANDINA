package com.segandina.sgi.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.segandina.sgi.dao.NivelGravedadDao;
import com.segandina.sgi.dao.TipoEventoDao;
import com.segandina.sgi.dao.ZonaDao;
import com.segandina.sgi.dto.response.NivelGravedadResponse;
import com.segandina.sgi.dto.response.TipoEventoResponse;
import com.segandina.sgi.dto.response.ZonaResponse;
import com.segandina.sgi.model.NivelGravedad;
import com.segandina.sgi.model.TipoEvento;
import com.segandina.sgi.model.Zona;

/**
 * Pruebas unitarias de los catálogos: cada listado usa la consulta de activos del DAO y la mapea al DTO.
 */
class CatalogoServiceImplTest {

	private ZonaDao zonaDao;
	private TipoEventoDao tipoEventoDao;
	private NivelGravedadDao nivelGravedadDao;
	private CatalogoServiceImpl catalogoService;

	@BeforeEach
	void preparar() {
		zonaDao = mock(ZonaDao.class);
		tipoEventoDao = mock(TipoEventoDao.class);
		nivelGravedadDao = mock(NivelGravedadDao.class);
		catalogoService = new CatalogoServiceImpl(zonaDao, tipoEventoDao, nivelGravedadDao);
	}

	@Test
	void listaZonasActivas() {
		Zona zona = new Zona();
		zona.setIdZona(1);
		zona.setNombreZona("Sede Miraflores");
		zona.setDistrito("Miraflores");
		when(zonaDao.findByEstadoActivoTrueOrderByNombreZonaAsc()).thenReturn(List.of(zona));

		List<ZonaResponse> zonas = catalogoService.listarZonasActivas();

		assertEquals(1, zonas.size());
		assertEquals(1, zonas.get(0).idZona());
		assertEquals("Sede Miraflores", zonas.get(0).nombreZona());
		assertEquals("Miraflores", zonas.get(0).distrito());
	}

	@Test
	void listaTiposEventoActivos() {
		TipoEvento tipo = new TipoEvento();
		tipo.setIdTipoEvento((short) 4);
		tipo.setNombreTipoEvento("Otro");
		when(tipoEventoDao.findByEstadoActivoTrueOrderByNombreTipoEventoAsc()).thenReturn(List.of(tipo));

		assertEquals(List.of(new TipoEventoResponse((short) 4, "Otro")), catalogoService.listarTiposEventoActivos());
	}

	@Test
	void listaNivelesGravedadActivosEnOrden() {
		when(nivelGravedadDao.findByEstadoActivoTrueOrderByOrdenAsc())
				.thenReturn(List.of(nivel(1, "Baja", 1), nivel(3, "Alta", 3)));

		assertEquals(List.of(
				new NivelGravedadResponse((short) 1, "Baja", (short) 1),
				new NivelGravedadResponse((short) 3, "Alta", (short) 3)),
				catalogoService.listarNivelesGravedadActivos());
	}

	@Test
	void sinRegistrosActivosDevuelveListaVacia() {
		when(zonaDao.findByEstadoActivoTrueOrderByNombreZonaAsc()).thenReturn(List.of());

		assertEquals(List.of(), catalogoService.listarZonasActivas());
	}

	private static NivelGravedad nivel(int id, String nombre, int orden) {
		NivelGravedad nivel = new NivelGravedad();
		nivel.setIdNivelGravedad((short) id);
		nivel.setNombreNivel(nombre);
		nivel.setOrden((short) orden);
		return nivel;
	}

}
