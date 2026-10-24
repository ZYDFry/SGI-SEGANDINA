package com.segandina.sgi.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.segandina.sgi.dto.response.NivelGravedadResponse;
import com.segandina.sgi.dto.response.TipoEventoResponse;
import com.segandina.sgi.dto.response.ZonaResponse;
import com.segandina.sgi.service.CatalogoService;

/**
 * Catálogos activos para los formularios. Requiere token (cualquier rol).
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

}
