package com.segandina.sgi.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import com.segandina.sgi.dao.NivelGravedadDao;
import com.segandina.sgi.dao.RolDao;
import com.segandina.sgi.dao.UsuarioDao;
import com.segandina.sgi.dto.request.NivelGravedadRequest;
import com.segandina.sgi.dto.response.NivelGravedadResponse;
import com.segandina.sgi.exception.DatoDuplicadoException;
import com.segandina.sgi.model.AccionAuditoria;
import com.segandina.sgi.model.NivelGravedad;
import com.segandina.sgi.model.Rol;
import com.segandina.sgi.model.Usuario;
import com.segandina.sgi.service.AuditoriaService;

/**
 * Pruebas de la edición de niveles de gravedad (RF-09) contra H2 en memoria, para que el intercambio de orden
 * se ejecute contra la restricción UNIQUE real de {@code orden}. La auditoría se simula.
 */
@DataJpaTest(properties = {
		"spring.datasource.url=jdbc:h2:mem:niveles;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH",
		"spring.datasource.username=sa",
		"spring.datasource.password=",
		"spring.jpa.hibernate.ddl-auto=create-drop" })
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(NivelGravedadServiceImpl.class)
class NivelGravedadServiceImplTest {

	@Autowired
	private NivelGravedadDao nivelGravedadDao;

	@Autowired
	private NivelGravedadServiceImpl nivelGravedadService;

	@Autowired
	private RolDao rolDao;

	@Autowired
	private UsuarioDao usuarioDao;

	@MockitoBean
	private AuditoriaService auditoriaService;

	private Long idAdmin;
	private Short idBaja;
	private Short idMedia;

	@BeforeEach
	void cargarNiveles() {
		Rol rol = new Rol();
		rol.setNombreRol("Administrador");
		rolDao.save(rol);
		Usuario admin = new Usuario();
		admin.setDni("11111111");
		admin.setNombres("Ana");
		admin.setApellidoPaterno("Torres");
		admin.setContrasena("hash");
		admin.setRol(rol);
		idAdmin = usuarioDao.save(admin).getIdUsuario();

		idBaja = nivelGravedadDao.save(nivel("Baja", 1)).getIdNivelGravedad();
		idMedia = nivelGravedadDao.save(nivel("Media", 2)).getIdNivelGravedad();
		nivelGravedadDao.save(nivel("Alta", 3));
	}

	@Test
	void listarDevuelveTodosDeMenosAMasGrave() {
		assertEquals(List.of("Baja", "Media", "Alta"),
				nivelGravedadService.listar().stream().map(NivelGravedadResponse::nombreNivel).toList());
	}

	@Test
	@SuppressWarnings("unchecked")
	void ordenOcupadoIntercambiaLosDosNivelesYAudita() {
		NivelGravedadResponse editado = nivelGravedadService.actualizar(idBaja,
				new NivelGravedadRequest("Leve", (short) 2), idAdmin);

		assertEquals((short) 2, editado.orden());
		assertEquals(List.of("Media", "Leve", "Alta"),
				nivelGravedadService.listar().stream().map(NivelGravedadResponse::nombreNivel).toList());
		assertEquals((short) 1, nivelGravedadDao.findById(idMedia).orElseThrow().getOrden());

		ArgumentCaptor<Map<String, Object>> detalle = ArgumentCaptor.forClass(Map.class);
		verify(auditoriaService).registrar(eq(AccionAuditoria.MODIFICAR_NIVEL_GRAVEDAD), detalle.capture(), isNull(),
				any());
		assertEquals(Map.of("nombreNivel", "Baja", "orden", (short) 1), detalle.getValue().get("antes"));
		assertEquals(Map.of("nombreNivel", "Leve", "orden", (short) 2), detalle.getValue().get("despues"));
		Map<String, Object> intercambio = (Map<String, Object>) detalle.getValue().get("intercambiadoCon");
		assertEquals(idMedia, intercambio.get("idNivelGravedad"));
		assertEquals((short) 1, intercambio.get("ordenDespues"));
	}

	@Test
	void ordenLibreSoloMueveElNivel() {
		nivelGravedadService.actualizar(idBaja, new NivelGravedadRequest("Baja", (short) 10), idAdmin);

		assertEquals((short) 10, nivelGravedadDao.findById(idBaja).orElseThrow().getOrden());
		assertEquals((short) 2, nivelGravedadDao.findById(idMedia).orElseThrow().getOrden());
	}

	@Test
	void nombreDeOtroNivelSinDistinguirMayusculasDevuelveDuplicado() {
		assertThrows(DatoDuplicadoException.class,
				() -> nivelGravedadService.actualizar(idBaja, new NivelGravedadRequest("MEDIA", (short) 1), idAdmin));
	}

	@Test
	void sinCambiosNoAudita() {
		nivelGravedadService.actualizar(idBaja, new NivelGravedadRequest(" Baja ", (short) 1), idAdmin);

		verify(auditoriaService, never()).registrar(any(), any(), any(), any());
		assertFalse(nivelGravedadDao.findByOrden(NivelGravedadServiceImpl.ORDEN_TEMPORAL).isPresent());
	}

	private static NivelGravedad nivel(String nombre, int orden) {
		NivelGravedad nivel = new NivelGravedad();
		nivel.setNombreNivel(nombre);
		nivel.setOrden((short) orden);
		return nivel;
	}

}
