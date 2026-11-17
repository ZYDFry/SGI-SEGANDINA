package com.segandina.sgi.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.segandina.sgi.dto.response.VigilanteZonaResponse;
import com.segandina.sgi.dto.response.ZonaResponse;
import com.segandina.sgi.service.DespliegueService;

/**
 * Consultas de la pantalla de despliegue de una zona (RF-07). Están bajo {@code /api/dashboard}, así que las usan
 * el Administrador y el Supervisor. La reasignación se hace con {@code PATCH /api/usuarios/{id}/zona}.
 */
@RestController
@RequestMapping("/api/dashboard")
public class DespliegueController {

	private final DespliegueService despliegueService;

	public DespliegueController(DespliegueService despliegueService) {
		this.despliegueService = despliegueService;
	}

	/**
	 * Datos de una zona, activa o no.
	 *
	 * @param idZona id de la zona
	 * @return 200 con la zona; 404 si no existe
	 */
	@GetMapping("/zonas/{idZona}")
	public ZonaResponse zona(@PathVariable Integer idZona) {
		return despliegueService.obtenerZona(idZona);
	}

	/**
	 * Vigilantes con su zona, ordenados por apellidos y nombres.
	 *
	 * @param idZona solo los de esa zona
	 * @param activo {@code true} activos, {@code false} dados de baja; sin valor, todos
	 * @return 200 con la lista (sin DNI ni contraseña)
	 */
	@GetMapping("/vigilantes")
	public List<VigilanteZonaResponse> vigilantes(@RequestParam(required = false) Integer idZona,
			@RequestParam(required = false) Boolean activo) {
		return despliegueService.listarVigilantes(idZona, activo);
	}

}
