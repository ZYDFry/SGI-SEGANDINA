package com.segandina.sgi.service.impl;

import java.util.Optional;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.segandina.sgi.dao.UsuarioDao;
import com.segandina.sgi.dto.request.LoginRequest;
import com.segandina.sgi.dto.response.LoginResponse;
import com.segandina.sgi.dto.response.UsuarioResumenResponse;
import com.segandina.sgi.exception.CredencialesInvalidasException;
import com.segandina.sgi.model.AccionAuditoria;
import com.segandina.sgi.model.Usuario;
import com.segandina.sgi.service.AuditoriaService;
import com.segandina.sgi.service.AuthService;
import com.segandina.sgi.service.TokenService;

@Service
public class AuthServiceImpl implements AuthService {

	// Motivos internos de LOGIN_FALLIDO: solo se guardan en auditoría, nunca se devuelven al cliente
	static final String MOTIVO_DNI_NO_REGISTRADO = "DNI_NO_REGISTRADO";
	static final String MOTIVO_CONTRASENA_INCORRECTA = "CONTRASENA_INCORRECTA";
	static final String MOTIVO_USUARIO_INACTIVO = "USUARIO_INACTIVO";

	private final UsuarioDao usuarioDao;
	private final PasswordEncoder passwordEncoder;
	private final TokenService tokenService;
	private final AuditoriaService auditoriaService;

	// Hash de una clave cualquiera: se compara contra él cuando el DNI no existe, para que la respuesta
	// tarde lo mismo que con un DNI real y no se pueda deducir qué DNI están registrados
	private final String hashFicticio;

	public AuthServiceImpl(UsuarioDao usuarioDao, PasswordEncoder passwordEncoder, TokenService tokenService,
			AuditoriaService auditoriaService) {
		this.usuarioDao = usuarioDao;
		this.passwordEncoder = passwordEncoder;
		this.tokenService = tokenService;
		this.auditoriaService = auditoriaService;
		this.hashFicticio = passwordEncoder.encode("sgi-hash-ficticio");
	}

	@Override
	@Transactional
	public LoginResponse login(LoginRequest request) {
		Optional<Usuario> encontrado = usuarioDao.findByDni(request.dni());
		if (encontrado.isEmpty()) {
			passwordEncoder.matches(request.contrasena(), hashFicticio);
			throw rechazar(request.dni(), null, MOTIVO_DNI_NO_REGISTRADO);
		}
		Usuario usuario = encontrado.get();
		if (!passwordEncoder.matches(request.contrasena(), usuario.getContrasena())) {
			throw rechazar(request.dni(), usuario, MOTIVO_CONTRASENA_INCORRECTA);
		}
		if (!Boolean.TRUE.equals(usuario.getEstadoActivo())) {
			throw rechazar(request.dni(), usuario, MOTIVO_USUARIO_INACTIVO);
		}

		TokenService.TokenEmitido token = tokenService.generarToken(usuario);
		auditoriaService.registrar(AccionAuditoria.LOGIN_OK, null, null, usuario);
		return LoginResponse.bearer(token.token(), token.expiraEn(), UsuarioResumenResponse.desde(usuario));
	}

	@Override
	@Transactional(readOnly = true)
	public UsuarioResumenResponse usuarioActual(Long idUsuario) {
		return usuarioDao.findById(idUsuario)
				.filter(usuario -> Boolean.TRUE.equals(usuario.getEstadoActivo()))
				.map(UsuarioResumenResponse::desde)
				.orElseThrow(CredencialesInvalidasException::new);
	}

	// Registra el intento fallido (en su propia transacción) y devuelve la excepción con el mensaje genérico
	private CredencialesInvalidasException rechazar(String dni, Usuario usuario, String motivo) {
		auditoriaService.registrarLoginFallido(dni, usuario, motivo);
		return new CredencialesInvalidasException();
	}

}
