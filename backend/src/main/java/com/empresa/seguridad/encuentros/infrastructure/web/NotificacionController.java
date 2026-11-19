package com.empresa.seguridad.encuentros.infrastructure.web;

import com.empresa.seguridad.domain.model.User;
import com.empresa.seguridad.domain.repository.UserRepository;
import com.empresa.seguridad.encuentros.application.dto.NotificacionDtos.NotificacionDto;
import com.empresa.seguridad.encuentros.application.service.NotificacionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/notificaciones")
@RequiredArgsConstructor
public class NotificacionController {

    private final NotificacionService notificacionService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<NotificacionDto>> getMisNotificaciones(@AuthenticationPrincipal UserDetails userDetails) {
        User usuario = getAuthenticatedUser(userDetails);
        return ResponseEntity.ok(notificacionService.getMisNotificaciones(usuario.getId()));
    }

    @PatchMapping("/{id}/leida")
    public ResponseEntity<Void> marcarLeida(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User usuario = getAuthenticatedUser(userDetails);
        notificacionService.marcarLeida(id, usuario.getId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/no-leidas/conteo")
    public ResponseEntity<Map<String, Long>> contarNoLeidas(@AuthenticationPrincipal UserDetails userDetails) {
        User usuario = getAuthenticatedUser(userDetails);
        return ResponseEntity.ok(Map.of("noLeidas", notificacionService.contarNoLeidas(usuario.getId())));
    }

    private User getAuthenticatedUser(UserDetails userDetails) {
        if (userDetails == null) {
            throw new SecurityException("No autenticado");
        }
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
    }
}
