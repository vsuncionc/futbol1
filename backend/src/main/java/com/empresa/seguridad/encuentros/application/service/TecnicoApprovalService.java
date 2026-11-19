package com.empresa.seguridad.encuentros.application.service;

import com.empresa.seguridad.domain.model.EstadoAprobacion;
import com.empresa.seguridad.domain.model.User;
import com.empresa.seguridad.domain.repository.UserRepository;
import com.empresa.seguridad.encuentros.application.dto.SeguridadTecnicoDtos.TecnicoPendienteDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class TecnicoApprovalService {

    private final UserRepository userRepository;
    private final NotificacionService notificacionService;
    private final AuditoriaEncuentrosService auditoriaService;

    @Transactional(readOnly = true)
    public List<TecnicoPendienteDto> getTecnicosPorEstado(EstadoAprobacion estado) {
        List<User> users = (estado != null)
                ? userRepository.findByEstadoAprobacionOrderByCreatedAtDesc(estado)
                : userRepository.findAll();

        return users.stream()
                .filter(u -> u.getRoles().stream().anyMatch(r -> "ROLE_TECNICO".equals(r.getCode())))
                .map(this::mapToDto)
                .toList();
    }

    @Transactional
    public TecnicoPendienteDto aprobarTecnico(UUID usuarioId, User admin) {
        User user = getUserOrThrow(usuarioId);
        user.setEstadoAprobacion(EstadoAprobacion.ACTIVO);
        user.setAprobadoPor(admin != null ? admin.getId() : null);
        user.setFechaDecision(LocalDateTime.now());
        user.setMotivoRechazo(null);
        User saved = userRepository.save(user);

        notificacionService.crearNotificacion(
                user,
                "TECNICO_APROBADO",
                "Cuenta aprobada",
                "¡Felicidades! Tu cuenta de Técnico ha sido aprobada por el administrador. Ya puedes solicitar reservas y organizar encuentros.",
                "/encuentros/reservas/mias"
        );

        auditoriaService.registrar(admin, "USUARIO_TECNICO", 0L, "TECNICO_APROBADO", "Aprobación de técnico: " + user.getEmail());

        return mapToDto(saved);
    }

    @Transactional
    public TecnicoPendienteDto rechazarTecnico(UUID usuarioId, String motivo, User admin) {
        if (motivo == null || motivo.trim().length() < 10) {
            throw new IllegalArgumentException("El motivo de rechazo es obligatorio y debe tener al menos 10 caracteres");
        }

        User user = getUserOrThrow(usuarioId);
        user.setEstadoAprobacion(EstadoAprobacion.RECHAZADO);
        user.setMotivoRechazo(motivo.trim());
        user.setAprobadoPor(admin != null ? admin.getId() : null);
        user.setFechaDecision(LocalDateTime.now());
        User saved = userRepository.save(user);

        notificacionService.crearNotificacion(
                user,
                "TECNICO_RECHAZADO",
                "Solicitud de cuenta rechazada",
                "Tu solicitud de cuenta de Técnico ha sido rechazada. Motivo: " + motivo.trim(),
                "/perfil"
        );

        auditoriaService.registrar(admin, "USUARIO_TECNICO", 0L, "TECNICO_RECHAZADO", "Rechazo de técnico: " + user.getEmail() + " | Motivo: " + motivo);

        return mapToDto(saved);
    }

    @Transactional
    public TecnicoPendienteDto suspenderTecnico(UUID usuarioId, User admin) {
        User user = getUserOrThrow(usuarioId);
        user.setEstadoAprobacion(EstadoAprobacion.SUSPENDIDO);
        user.setFechaDecision(LocalDateTime.now());
        User saved = userRepository.save(user);

        auditoriaService.registrar(admin, "USUARIO_TECNICO", 0L, "TECNICO_SUSPENDIDO", "Suspensión de técnico: " + user.getEmail());
        return mapToDto(saved);
    }

    @Transactional
    public TecnicoPendienteDto reactivarTecnico(UUID usuarioId, User admin) {
        User user = getUserOrThrow(usuarioId);
        user.setEstadoAprobacion(EstadoAprobacion.ACTIVO);
        user.setFechaDecision(LocalDateTime.now());
        User saved = userRepository.save(user);

        auditoriaService.registrar(admin, "USUARIO_TECNICO", 0L, "TECNICO_REACTIVADO", "Reactivación de técnico: " + user.getEmail());
        return mapToDto(saved);
    }

    @Transactional(readOnly = true)
    public long contarPendientes() {
        return userRepository.countByEstadoAprobacion(EstadoAprobacion.PENDIENTE);
    }

    private User getUserOrThrow(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado con id: " + id));
    }

    private TecnicoPendienteDto mapToDto(User u) {
        return new TecnicoPendienteDto(
                u.getId(),
                u.getFullName(),
                u.getEmail(),
                u.getTelefono(),
                u.getCreatedAt(),
                u.getEstadoAprobacion(),
                u.getMotivoRechazo(),
                u.getFechaDecision()
        );
    }
}
