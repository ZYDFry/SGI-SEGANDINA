package com.segandina.sgi.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
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
import org.springframework.data.domain.Page;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import com.segandina.sgi.dao.RolDao;
import com.segandina.sgi.dao.UsuarioDao;
import com.segandina.sgi.dao.ZonaDao;
import com.segandina.sgi.dto.request.ZonaFiltro;
import com.segandina.sgi.dto.request.ZonaRequest;
import com.segandina.sgi.dto.response.ZonaResponse;
import com.segandina.sgi.exception.DatoDuplicadoException;
import com.segandina.sgi.model.AccionAuditoria;
import com.segandina.sgi.model.Rol;
import com.segandina.sgi.model.Usuario;
import com.segandina.sgi.model.Zona;
import com.segandina.sgi.service.AuditoriaService;

/**
 * Pruebas de la búsqueda y la administración de zonas (RF-09) contra H2 en memoria (modo PostgreSQL), para
 * que los filtros y las restricciones se ejecuten como SQL real. La auditoría se simula. Cada test corre en una
 * transacción que se revierte al final.
 */
@DataJpaTest(properties = {
		"spring.datasource.url=jdbc:h2:mem:zonas;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH",
		"spring.datasource.username=sa",
		"spring.datasource.password=",
		"spring.jpa.hibernate.ddl-auto=create-drop" })
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(ZonaServiceImpl.class)
class ZonaServiceImplTest {

	@Autowired
	private ZonaDao zonaDao;

	@Autowired
	private ZonaServiceImpl zonaService;

	@Autowired
	private RolDao rolDao;

	@Autowired
	private UsuarioDao usuarioDao;

	@MockitoBean
	private AuditoriaService auditoriaService;

	private Long idAdmin;

	@BeforeEach
	void cargarZonas() {
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

		zonaDao.saveAll(List.of(
				zona("Sede Miraflores", "Lima", "Lima", "Miraflores", "Av. Larco 345", "Edificio corporativo", true),
				zona("almacén Callao", "Callao", "Callao", "Bellavista", "Frente al puerto", "Almacén de carga", true),
				zona("Planta Arequipa", "Arequipa", "Arequipa", "Cayma", null, "Planta industrial 100% techada", true),
				zona("Sede San Isidro", "Lima", "Lima", "San Isidro", "Calle Las Begonias 120", null, true),
				zona("Obra Surco", "Lima", "Lima", "Santiago de Surco", "Cerca al óvalo Higuereta", "Obra cerrada",
						false)));
	}

	@Test
	void sinFiltrosDevuelveTodasOrdenadasPorNombreSinDistinguirMayusculas() {
		Page<ZonaResponse> pagina = zonaService.buscar(null, 0, 20);

		assertEquals(5, pagina.getTotalElements());
		assertEquals(List.of("almacén Callao", "Obra Surco", "Planta Arequipa", "Sede Miraflores", "Sede San Isidro"),
				nombres(pagina));
	}

	@Test
	void filtroPorNombreContieneSinDistinguirMayusculas() {
		Page<ZonaResponse> pagina = zonaService.buscar(filtro("SEDE", null, null, null, null, null), 0, 20);

		assertEquals(List.of("Sede Miraflores", "Sede San Isidro"), nombres(pagina));
	}

	@Test
	void filtrosDeUbicacionSeCombinan() {
		ZonaFiltro soloLima = filtro(null, "lima", "LIMA", null, null, null);
		assertEquals(3, zonaService.buscar(soloLima, 0, 20).getTotalElements());

		ZonaFiltro distrito = filtro(null, "Lima", "Lima", "san isidro", null, null);
		assertEquals(List.of("Sede San Isidro"), nombres(zonaService.buscar(distrito, 0, 20)));
	}

	@Test
	void distritoEsIgualdadExactaNoContiene() {
		ZonaFiltro parcial = filtro(null, null, null, "Isidro", null, null);

		assertTrue(zonaService.buscar(parcial, 0, 20).isEmpty());
	}

	@Test
	void filtroPorEstadoActivo() {
		assertEquals(List.of("Obra Surco"), nombres(zonaService.buscar(filtro(null, null, null, null, false, null), 0, 20)));
		assertEquals(4, zonaService.buscar(filtro(null, null, null, null, true, null), 0, 20).getTotalElements());
	}

	@Test
	void textoLibreBuscaEnReferencia() {
		Page<ZonaResponse> pagina = zonaService.buscar(filtro(null, null, null, null, null, "begonias"), 0, 20);

		assertEquals(List.of("Sede San Isidro"), nombres(pagina));
	}

	@Test
	void textoLibreBuscaEnDescripcion() {
		Page<ZonaResponse> pagina = zonaService.buscar(filtro(null, null, null, null, null, "INDUSTRIAL"), 0, 20);

		assertEquals(List.of("Planta Arequipa"), nombres(pagina));
	}

	@Test
	void textoLibreCoincideEnReferenciaODescripcion() {
		// "obra" está en la descripción de Obra Surco; "óvalo" en su referencia
		assertEquals(List.of("Obra Surco"), nombres(zonaService.buscar(filtro(null, null, null, null, null, "obra"), 0, 20)));
		assertEquals(List.of("Obra Surco"), nombres(zonaService.buscar(filtro(null, null, null, null, null, "óvalo"), 0, 20)));
	}

	@Test
	void nombreYEstadoSeCombinan() {
		ZonaFiltro f = filtro("o", "Lima", null, null, true, null);

		assertEquals(List.of("Sede Miraflores", "Sede San Isidro"), nombres(zonaService.buscar(f, 0, 20)));
	}

	@Test
	void todosLosFiltrosCombinados() {
		ZonaFiltro f = filtro("miraflores", "Lima", "Lima", "Miraflores", true, "larco");

		assertEquals(List.of("Sede Miraflores"), nombres(zonaService.buscar(f, 0, 20)));
	}

	@Test
	void filtrosEnBlancoSeIgnoran() {
		ZonaFiltro enBlanco = filtro("  ", "", " ", "", null, "   ");

		assertEquals(5, zonaService.buscar(enBlanco, 0, 20).getTotalElements());
	}

	@Test
	void sinCoincidenciasDevuelvePaginaVacia() {
		Page<ZonaResponse> pagina = zonaService.buscar(filtro("Cusco", null, null, null, null, null), 0, 20);

		assertTrue(pagina.isEmpty());
		assertEquals(0, pagina.getTotalElements());
	}

	@Test
	void comodinesDelUsuarioSeBuscanLiteralmente() {
		// "%" solo aparece en la descripción de Planta Arequipa; sin escape coincidiría con todas
		assertEquals(List.of("Planta Arequipa"), nombres(zonaService.buscar(filtro(null, null, null, null, null, "%"), 0, 20)));
		assertTrue(zonaService.buscar(filtro("_", null, null, null, null, null), 0, 20).isEmpty());
	}

	@Test
	void paginacionRespetaOrdenYTotales() {
		Page<ZonaResponse> segunda = zonaService.buscar(null, 1, 2);

		assertEquals(5, segunda.getTotalElements());
		assertEquals(3, segunda.getTotalPages());
		assertEquals(List.of("Planta Arequipa", "Sede Miraflores"), nombres(segunda));
	}

	@Test
	void paginaYTamanoFueraDeRangoSeAcotan() {
		Page<ZonaResponse> pagina = zonaService.buscar(null, -3, 500);
		assertEquals(0, pagina.getNumber());
		assertEquals(100, pagina.getSize());

		Page<ZonaResponse> minima = zonaService.buscar(null, 0, 0);
		assertEquals(1, minima.getSize());
		assertEquals(List.of("almacén Callao"), nombres(minima));
	}

	@Test
	void laRespuestaIncluyeLaUbicacion() {
		ZonaResponse zona = zonaService.buscar(filtro("Miraflores", null, null, null, null, null), 0, 20)
				.getContent().getFirst();

		assertEquals("Lima", zona.departamento());
		assertEquals("Lima", zona.provincia());
		assertEquals("Miraflores", zona.distrito());
		assertEquals("Av. Larco 345", zona.referencia());
		assertEquals("Edificio corporativo", zona.descripcion());
		assertTrue(zona.estadoActivo());
	}

	@Test
	@SuppressWarnings("unchecked")
	void crearGuardaRecortadoActivoYAudita() {
		ZonaResponse creada = zonaService.crear(new ZonaRequest("  Sede Surco ", "Lima", "Lima", "Santiago de Surco",
				"  ", "Oficina"), idAdmin);

		assertEquals("Sede Surco", creada.nombreZona());
		assertNull(creada.referencia());
		assertTrue(creada.estadoActivo());
		ArgumentCaptor<Map<String, Object>> detalle = ArgumentCaptor.forClass(Map.class);
		verify(auditoriaService).registrar(eq(AccionAuditoria.CREAR_ZONA), detalle.capture(), isNull(), any());
		assertEquals(creada.idZona(), detalle.getValue().get("idZona"));
		assertEquals("Sede Surco", ((Map<String, Object>) detalle.getValue().get("despues")).get("nombreZona"));
	}

	@Test
	void crearConNombreRepetidoSinDistinguirMayusculasDevuelveDuplicado() {
		assertThrows(DatoDuplicadoException.class, () -> zonaService.crear(
				new ZonaRequest("SEDE MIRAFLORES", "Lima", "Lima", "Miraflores", null, null), idAdmin));
		verify(auditoriaService, never()).registrar(any(), any(), any(), any());
	}

	@Test
	@SuppressWarnings("unchecked")
	void actualizarAuditaAntesYDespues() {
		Integer id = idDe("Sede Miraflores");

		ZonaResponse editada = zonaService.actualizar(id, new ZonaRequest("Sede Miraflores", "Lima", "Lima",
				"Miraflores", "Av. Larco 500", "Edificio corporativo"), idAdmin);

		assertEquals("Av. Larco 500", editada.referencia());
		ArgumentCaptor<Map<String, Object>> detalle = ArgumentCaptor.forClass(Map.class);
		verify(auditoriaService).registrar(eq(AccionAuditoria.MODIFICAR_ZONA), detalle.capture(), isNull(), any());
		assertEquals("Av. Larco 345", ((Map<String, Object>) detalle.getValue().get("antes")).get("referencia"));
		assertEquals("Av. Larco 500", ((Map<String, Object>) detalle.getValue().get("despues")).get("referencia"));
	}

	@Test
	void actualizarConservandoSuPropioNombreNoEsDuplicadoYSinCambiosNoAudita() {
		Integer id = idDe("Sede Miraflores");

		zonaService.actualizar(id, new ZonaRequest("Sede Miraflores", "Lima", "Lima", "Miraflores", "Av. Larco 345",
				"Edificio corporativo"), idAdmin);

		verify(auditoriaService, never()).registrar(any(), any(), any(), any());
	}

	@Test
	void actualizarConElNombreDeOtraZonaDevuelveDuplicado() {
		Integer id = idDe("Sede Miraflores");

		assertThrows(DatoDuplicadoException.class, () -> zonaService.actualizar(id,
				new ZonaRequest("sede san isidro", "Lima", "Lima", "Miraflores", null, null), idAdmin));
	}

	@Test
	void cambiarEstadoDaDeBajaYNoAuditaSiNoCambia() {
		Integer id = idDe("Sede Miraflores");

		assertFalse(zonaService.cambiarEstado(id, false, idAdmin).estadoActivo());
		zonaService.cambiarEstado(id, false, idAdmin);

		verify(auditoriaService).registrar(eq(AccionAuditoria.CAMBIAR_ESTADO_ZONA), any(), isNull(), any());
		assertFalse(zonaDao.findById(id).orElseThrow().getEstadoActivo());
	}

	private Integer idDe(String nombre) {
		return zonaDao.findByNombreZona(nombre).orElseThrow().getIdZona();
	}

	private static ZonaFiltro filtro(String nombre, String departamento, String provincia, String distrito,
			Boolean activo, String q) {
		return new ZonaFiltro(nombre, departamento, provincia, distrito, activo, q);
	}

	private static List<String> nombres(Page<ZonaResponse> pagina) {
		return pagina.getContent().stream().map(ZonaResponse::nombreZona).toList();
	}

	private static Zona zona(String nombre, String departamento, String provincia, String distrito,
			String referencia, String descripcion, boolean activo) {
		Zona zona = new Zona();
		zona.setNombreZona(nombre);
		zona.setDepartamento(departamento);
		zona.setProvincia(provincia);
		zona.setDistrito(distrito);
		zona.setReferencia(referencia);
		zona.setDescripcion(descripcion);
		zona.setEstadoActivo(activo);
		return zona;
	}

}
