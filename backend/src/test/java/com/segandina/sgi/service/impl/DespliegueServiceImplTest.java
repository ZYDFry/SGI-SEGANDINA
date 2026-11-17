package com.segandina.sgi.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import com.segandina.sgi.dao.RolDao;
import com.segandina.sgi.dao.UsuarioDao;
import com.segandina.sgi.dao.ZonaDao;
import com.segandina.sgi.dto.response.VigilanteZonaResponse;
import com.segandina.sgi.exception.RecursoNoEncontradoException;
import com.segandina.sgi.model.Rol;
import com.segandina.sgi.model.Usuario;
import com.segandina.sgi.model.Zona;

/**
 * Pruebas de las consultas de la pantalla de despliegue de una zona (RF-07) con DAO simulados.
 */
class DespliegueServiceImplTest {

	private ZonaDao zonaDao;
	private UsuarioDao usuarioDao;
	private RolDao rolDao;
	private DespliegueServiceImpl despliegueService;

	@BeforeEach
	void preparar() {
		zonaDao = mock(ZonaDao.class);
		usuarioDao = mock(UsuarioDao.class);
		rolDao = mock(RolDao.class);
		despliegueService = new DespliegueServiceImpl(zonaDao, usuarioDao, rolDao);
	}

	@Test
	void obtieneUnaZonaInactiva() {
		Zona zona = new Zona();
		zona.setIdZona(3);
		zona.setNombreZona("Zona Antigua");
		zona.setEstadoActivo(false);
		when(zonaDao.findById(3)).thenReturn(Optional.of(zona));

		assertEquals(false, despliegueService.obtenerZona(3).estadoActivo());
	}

	@Test
	void zonaInexistenteDevuelveNoEncontrado() {
		when(zonaDao.findById(99)).thenReturn(Optional.empty());

		assertThrows(RecursoNoEncontradoException.class, () -> despliegueService.obtenerZona(99));
	}

	@Test
	@SuppressWarnings("unchecked")
	void listaVigilantesConSuZonaYEstado() {
		Rol vigilante = new Rol();
		vigilante.setIdRol((short) 3);
		vigilante.setNombreRol("Vigilante");
		when(rolDao.findByNombreRol("Vigilante")).thenReturn(Optional.of(vigilante));
		Zona zona = new Zona();
		zona.setIdZona(1);
		zona.setNombreZona("Sede Miraflores");
		Usuario luis = new Usuario();
		luis.setIdUsuario(50L);
		luis.setDni("33333333");
		luis.setNombres("Luis");
		luis.setApellidoPaterno("Rojas");
		luis.setRol(vigilante);
		luis.setZona(zona);
		luis.setEstadoActivo(false);
		when(usuarioDao.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of(luis));

		assertEquals(List.of(new VigilanteZonaResponse(50L, "Luis", "Rojas", null, 1, "Sede Miraflores", false)),
				despliegueService.listarVigilantes(1, null));
	}

	@Test
	void sinRolVigilanteDevuelveListaVacia() {
		when(rolDao.findByNombreRol("Vigilante")).thenReturn(Optional.empty());

		assertEquals(List.of(), despliegueService.listarVigilantes(null, true));
		verifyNoInteractions(usuarioDao);
	}

}
