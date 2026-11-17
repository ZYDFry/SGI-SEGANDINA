package com.segandina.sgi.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.segandina.sgi.dto.response.CatalogosFiltroResponse;
import com.segandina.sgi.dto.response.NivelGravedadResponse;
import com.segandina.sgi.dto.response.RolResponse;
import com.segandina.sgi.dto.response.TipoEventoResponse;
import com.segandina.sgi.dto.response.ZonaResponse;
import com.segandina.sgi.service.CatalogoService;

/**
 * Catálogos activos para los formularios (cualquier rol con token) y catálogos completos para los filtros
 * ({@code /filtros}, solo Administrador y Supervisor).
 */
@RestController
@RequestMapping("/api/catalogos")
public class CatalogoController {

	private final CatalogoService catalogoService;

	public CatalogoController(CatalogoService catalogoService) {
		this.catalogoService = catalogoService;
	}

	/**
	 * Zonas activas ordenadas por nombre.
	 *
	 * @return 200 con la lista de zonas
	 */
	@GetMapping("/zonas")
	public List<ZonaResponse> zonas() {
		return catalogoService.listarZonasActivas();
	}

	/**
	 * Tipos de evento activos ordenados por nombre.
	 *
	 * @return 200 con la lista de tipos
	 */
	@GetMapping("/tipos-evento")
	public List<TipoEventoResponse> tiposEvento() {
		return catalogoService.listarTiposEventoActivos();
	}

	/**
	 * Niveles de gravedad activos, de menos a más grave.
	 *
	 * @return 200 con la lista de niveles
	 */
	@GetMapping("/niveles-gravedad")
	public List<NivelGravedadResponse> nivelesGravedad() {
		return catalogoService.listarNivelesGravedadActivos();
	}

	/**
	 * Roles del sistema, para el formulario de usuarios.
	 *
	 * @return 200 con la lista de roles
	 */
	@GetMapping("/roles")
	public List<RolResponse> roles() {
		return catalogoService.listarRoles();
	}

	/**
	 * Zonas, tipos y niveles incluidos los inactivos, para filtrar el historial y el dashboard. Solo Administrador
	 * y Supervisor.
	 *
	 * @return 200 con los tres catálogos; cada registro trae {@code estadoActivo}
	 */
	@GetMapping("/filtros")
	public CatalogosFiltroResponse filtros() {
		return catalogoService.listarParaFiltros();
	}

}
