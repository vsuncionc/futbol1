package com.empresa.seguridad.encuentros.application.service;

import com.empresa.seguridad.domain.model.User;
import com.empresa.seguridad.domain.repository.UserRepository;
import com.empresa.seguridad.encuentros.application.dto.NotificacionDtos.NotificacionDto;
import com.empresa.seguridad.encuentros.domain.model.Notificacion;
import com.empresa.seguridad.encuentros.domain.repository.NotificacionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificacionService {

    private final NotificacionRepository notificacionRepository;
    private final UserRepository userRepository;

    @Transactional
    public void crearNotificacion(User destinatario, String tipo, String titulo, String mensaje, String enlace) {
        if (destinatario == null) return;
        Notificacion n = Notificacion.builder()
                .usuario(destinatario)
                .tipo(tipo)
                .titulo(titulo)
                .mensaje(mensaje)
                .enlace(enlace)
                .leida(false)
                .build();
        notificacionRepository.save(n);
    }

    @Transactional
    public void notificarAdmins(String tipo, String titulo, String mensaje, String enlace) {
        List<User> admins = userRepository.findAdmins();
        for (User admin : admins) {
            crearNotificacion(admin, tipo, titulo, mensaje, enlace);
        }
    }

    @Transactional(readOnly = true)
    public List<NotificacionDto> getMisNotificaciones(UUID usuarioId) {
        return notificacionRepository.findByUsuarioIdOrderByCreadaEnDesc(usuarioId)
                .stream()
                .map(this::mapToDto)
                .toList();
    }

    @Transactional
    public void marcarLeida(Long notificacionId, UUID usuarioId) {
        notificacionRepository.findById(notificacionId).ifPresent(n -> {
            if (n.getUsuario().getId().equals(usuarioId)) {
                n.setLeida(true);
                notificacionRepository.save(n);
            }
        });
    }

    @Transactional(readOnly = true)
    public long contarNoLeidas(UUID usuarioId) {
        return notificacionRepository.countByUsuarioIdAndLeidaFalse(usuarioId);
    }

    private NotificacionDto mapToDto(Notificacion n) {
        return new NotificacionDto(
                n.getId(),
                n.getTipo(),
                n.getTitulo(),
                n.getMensaje(),
                n.getEnlace(),
                n.isLeida(),
                n.getCreadaEn()
        );
    }
}
