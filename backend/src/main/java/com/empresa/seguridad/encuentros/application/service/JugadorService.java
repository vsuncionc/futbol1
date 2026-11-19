package com.empresa.seguridad.encuentros.application.service;

import com.empresa.seguridad.domain.model.EstadoAprobacion;
import com.empresa.seguridad.domain.model.User;
import com.empresa.seguridad.encuentros.application.dto.JugadorDtos.*;
import com.empresa.seguridad.encuentros.domain.model.Jugador;
import com.empresa.seguridad.encuentros.domain.model.JugadorHistorialEstrellas;
import com.empresa.seguridad.encuentros.domain.repository.JugadorHistorialEstrellasRepository;
import com.empresa.seguridad.encuentros.domain.repository.JugadorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class JugadorService {

    private final JugadorRepository jugadorRepository;
    private final JugadorHistorialEstrellasRepository historialRepository;
    private final FileStorageService fileStorageService;
    private final AuditoriaEncuentrosService auditoriaService;

    @Transactional
    public JugadorDto crearJugador(JugadorCreateRequest req, MultipartFile foto, User tecnico) {
        validarTecnicoActivo(tecnico);

        if (req.estrellas() < 1 || req.estrellas() > 5) {
            throw new IllegalArgumentException("Las estrellas deben estar entre 1 y 5.");
        }

        // RN-12: Advertir si ya tiene un jugador con el mismo nombre
        if (jugadorRepository.existsByTecnicoIdAndNombreIgnoreCase(tecnico.getId(), req.nombre().trim())) {
            log.warn("El técnico {} ya tiene registrado un jugador con el nombre: {}", tecnico.getEmail(), req.nombre());
        }

        String fotoUrl = null;
        if (foto != null && !foto.isEmpty()) {
            fotoUrl = fileStorageService.storeFotoJugador(foto);
        }

        Jugador jugador = Jugador.builder()
                .tecnico(tecnico)
                .nombre(req.nombre().trim())
                .apodo(req.apodo() != null ? req.apodo().trim() : null)
                .posicion(req.posicion() != null ? req.posicion().trim().toLowerCase() : null)
                .fotoUrl(fotoUrl)
                .fotoMiniaturaUrl(fotoUrl)
                .estrellas(req.estrellas())
                .activo(req.activo() != null ? req.activo() : true)
                .build();

        Jugador saved = jugadorRepository.save(jugador);
        auditoriaService.registrar(tecnico, "JUGADOR", saved.getId(), "CREAR_JUGADOR", "Jugador: " + saved.getNombre());

        return mapToDto(saved);
    }

    @Transactional
    public JugadorDto actualizarJugador(Long id, JugadorCreateRequest req, MultipartFile foto, User usuario) {
        Jugador jugador = getJugadorVerificandoAcceso(id, usuario);
        validarTecnicoActivo(usuario);

        if (req.estrellas() < 1 || req.estrellas() > 5) {
            throw new IllegalArgumentException("Las estrellas deben estar entre 1 y 5.");
        }

        // Si cambiaron las estrellas, registrar historial
        if (jugador.getEstrellas() != req.estrellas()) {
            JugadorHistorialEstrellas historial = JugadorHistorialEstrellas.builder()
                    .jugador(jugador)
                    .estrellasAnterior(jugador.getEstrellas())
                    .estrellasNueva(req.estrellas())
                    .cambiadoPor(usuario)
                    .cambiadoEn(LocalDateTime.now())
                    .build();
            historialRepository.save(historial);
            jugador.setEstrellas(req.estrellas());
        }

        jugador.setNombre(req.nombre().trim());
        jugador.setApodo(req.apodo() != null ? req.apodo().trim() : null);
        jugador.setPosicion(req.posicion() != null ? req.posicion().trim().toLowerCase() : null);

        if (req.activo() != null) {
            jugador.setActivo(req.activo());
        }

        if (foto != null && !foto.isEmpty()) {
            String fotoUrl = fileStorageService.storeFotoJugador(foto);
            jugador.setFotoUrl(fotoUrl);
            jugador.setFotoMiniaturaUrl(fotoUrl);
        }

        Jugador saved = jugadorRepository.save(jugador);
        auditoriaService.registrar(usuario, "JUGADOR", saved.getId(), "ACTUALIZAR_JUGADOR", "Actualización jugador: " + saved.getNombre());

        return mapToDto(saved);
    }

    @Transactional
    public JugadorDto cambiarEstado(Long id, boolean activo, User usuario) {
        Jugador jugador = getJugadorVerificandoAcceso(id, usuario);
        validarTecnicoActivo(usuario);

        jugador.setActivo(activo);
        Jugador saved = jugadorRepository.save(jugador);
        auditoriaService.registrar(usuario, "JUGADOR", saved.getId(), "CAMBIAR_ESTADO", "Estado activo: " + activo);
        return mapToDto(saved);
    }

    @Transactional(readOnly = true)
    public List<JugadorDto> getMisJugadores(User tecnico) {
        if (esAdmin(tecnico)) {
            return jugadorRepository.findAll().stream().map(this::mapToDto).toList();
        }
        return jugadorRepository.findByTecnicoIdOrderByNombreAsc(tecnico.getId())
                .stream()
                .map(this::mapToDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<JugadorDto> getMisJugadoresActivos(User tecnico) {
        return jugadorRepository.findByTecnicoIdAndActivoTrueOrderByNombreAsc(tecnico.getId())
                .stream()
                .map(this::mapToDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public JugadorDto getById(Long id, User usuario) {
        Jugador j = getJugadorVerificandoAcceso(id, usuario);
        return mapToDto(j);
    }

    @Transactional(readOnly = true)
    public List<JugadorHistorialDto> getHistorialEstrellas(Long jugadorId, User usuario) {
        getJugadorVerificandoAcceso(jugadorId, usuario);
        return historialRepository.findByJugadorIdOrderByCambiadoEnDesc(jugadorId).stream()
                .map(h -> new JugadorHistorialDto(
                        h.getId(),
                        h.getEstrellasAnterior(),
                        h.getEstrellasNueva(),
                        h.getCambiadoPor().getFullName(),
                        h.getCambiadoEn()
                ))
                .toList();
    }

    private Jugador getJugadorVerificandoAcceso(Long id, User usuario) {
        Jugador j = jugadorRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Jugador no encontrado con id: " + id));

        if (!esAdmin(usuario) && !j.getTecnico().getId().equals(usuario.getId())) {
            throw new SecurityException("No tienes permiso para acceder a este jugador.");
        }
        return j;
    }

    private void validarTecnicoActivo(User usuario) {
        if (!esAdmin(usuario)) {
            if (usuario.getEstadoAprobacion() != EstadoAprobacion.ACTIVO) {
                throw new SecurityException("Tu cuenta se encuentra en estado '" + usuario.getEstadoAprobacion() + "'. No puedes gestionar jugadores.");
            }
        }
    }

    private boolean esAdmin(User user) {
        if (user == null || user.getRoles() == null) return false;
        return user.getRoles().stream()
                .anyMatch(r -> "ROLE_ADMIN".equals(r.getCode()) || "ROLE_SUPER_ADMIN".equals(r.getCode()));
    }

    private String resolverUrlPublica(String relativePath) {
        if (relativePath == null || relativePath.trim().isEmpty()) {
            return null;
        }
        if (relativePath.startsWith("http://") || relativePath.startsWith("https://") || relativePath.startsWith("data:")) {
            return relativePath;
        }
        String clean = relativePath.startsWith("/") ? relativePath.substring(1) : relativePath;
        return "http://localhost:8080/api/v1/publico/archivos/" + clean;
    }

    public JugadorDto mapToDto(Jugador j) {
        return new JugadorDto(
                j.getId(),
                j.getTecnico().getId(),
                j.getNombre(),
                j.getApodo(),
                j.getPosicion(),
                resolverUrlPublica(j.getFotoUrl()),
                resolverUrlPublica(j.getFotoMiniaturaUrl()),
                j.getEstrellas(),
                j.isActivo(),
                j.getCreadoEn()
        );
    }
}
