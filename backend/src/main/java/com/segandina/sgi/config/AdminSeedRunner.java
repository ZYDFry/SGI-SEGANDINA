package com.segandina.sgi.config;

import java.util.Map;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.segandina.sgi.dao.RolDao;
import com.segandina.sgi.dao.UsuarioDao;
import com.segandina.sgi.model.AccionAuditoria;
import com.segandina.sgi.model.Rol;
import com.segandina.sgi.model.Usuario;
import com.segandina.sgi.service.AuditoriaService;

/**
 * Crea o actualiza el Administrador inicial. Solo se activa con el perfil {@code seed}.
 * <p>
 * Lee {@code ADMIN_DNI} y {@code ADMIN_PASSWORD} (obligatorias) y, opcionalmente, {@code ADMIN_NOMBRES} y
 * {@code ADMIN_APELLIDO_PATERNO}. Si el DNI no existe, crea un Administrador activo; si ya existe, solo
 * reemplaza su contraseña por el nuevo hash BCrypt. La contraseña nunca se escribe en el log.
 */
@Component
@Profile("seed")
public class AdminSeedRunner implements CommandLineRunner {

	private static final Logger log = LoggerFactory.getLogger(AdminSeedRunner.class);

	static final String ROL_ADMINISTRADOR = "Administrador";
	static final int LONGITUD_MINIMA_CONTRASENA = 8;

	private final UsuarioDao usuarioDao;
	private final RolDao rolDao;
	private final PasswordEncoder passwordEncoder;
	private final AuditoriaService auditoriaService;
	private final String dni;
	private final String contrasena;
	private final String nombres;
	private final String apellidoPaterno;

	public AdminSeedRunner(UsuarioDao usuarioDao, RolDao rolDao, PasswordEncoder passwordEncoder,
			AuditoriaService auditoriaService,
			@Value("${ADMIN_DNI:}") String dni,
			@Value("${ADMIN_PASSWORD:}") String contrasena,
			@Value("${ADMIN_NOMBRES:}") String nombres,
			@Value("${ADMIN_APELLIDO_PATERNO:}") String apellidoPaterno) {
		this.usuarioDao = usuarioDao;
		this.rolDao = rolDao;
		this.passwordEncoder = passwordEncoder;
		this.auditoriaService = auditoriaService;
		this.dni = dni.trim();
		this.contrasena = contrasena;
		this.nombres = nombres.isBlank() ? "Administrador" : nombres.trim();
		this.apellidoPaterno = apellidoPaterno.isBlank() ? "Sistema" : apellidoPaterno.trim();
	}

	/**
	 * Valida las variables de entorno y crea o actualiza el Administrador.
	 *
	 * @param args argumentos de la línea de comandos (no se usan)
	 * @throws IllegalStateException si faltan variables, son inválidas o no existe el rol Administrador;
	 *         en ese caso la aplicación no termina de arrancar
	 */
	@Override
	@Transactional
	public void run(String... args) {
		validarEntrada();
		String hash = passwordEncoder.encode(contrasena);
		Optional<Usuario> existente = usuarioDao.findByDni(dni);
		if (existente.isPresent()) {
			actualizarContrasena(existente.get(), hash);
		} else {
			crearAdministrador(hash);
		}
	}

	private void validarEntrada() {
		if (!dni.matches("^[0-9]{8}$")) {
			throw new IllegalStateException("Seed: ADMIN_DNI falta o no tiene 8 dígitos");
		}
		if (contrasena.isBlank() || contrasena.length() < LONGITUD_MINIMA_CONTRASENA) {
			throw new IllegalStateException(
					"Seed: ADMIN_PASSWORD falta o tiene menos de " + LONGITUD_MINIMA_CONTRASENA + " caracteres");
		}
	}

	private void crearAdministrador(String hash) {
		Rol rol = rolDao.findByNombreRol(ROL_ADMINISTRADOR)
				.orElseThrow(() -> new IllegalStateException("Seed: no existe el rol " + ROL_ADMINISTRADOR));
		Usuario admin = new Usuario();
		admin.setDni(dni);
		admin.setNombres(nombres);
		admin.setApellidoPaterno(apellidoPaterno);
		admin.setContrasena(hash);
		admin.setEstadoActivo(Boolean.TRUE);
		admin.setRol(rol);
		usuarioDao.save(admin);
		auditoriaService.registrar(AccionAuditoria.CREAR_USUARIO, Map.of("origen", "seed"), null, admin);
		log.info("Seed: Administrador creado (DNI {})", dni);
	}

	private void actualizarContrasena(Usuario usuario, String hash) {
		usuario.setContrasena(hash);
		usuarioDao.save(usuario);
		auditoriaService.registrar(AccionAuditoria.MODIFICAR_USUARIO,
				Map.of("campo", "contrasena", "origen", "seed"), null, usuario);
		log.info("Seed: contraseña actualizada para el usuario con DNI {}", dni);
		if (!Boolean.TRUE.equals(usuario.getEstadoActivo())) {
			log.warn("Seed: el usuario con DNI {} está inactivo; no podrá iniciar sesión hasta reactivarlo", dni);
		}
		if (!ROL_ADMINISTRADOR.equals(usuario.getRol().getNombreRol())) {
			log.warn("Seed: el usuario con DNI {} no tiene rol {}; el rol no se modificó", dni, ROL_ADMINISTRADOR);
		}
	}

}
