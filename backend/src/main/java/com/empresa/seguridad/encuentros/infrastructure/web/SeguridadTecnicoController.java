package com.empresa.seguridad.encuentros.infrastructure.web;

import com.empresa.seguridad.domain.model.EstadoAprobacion;
import com.empresa.seguridad.domain.model.User;
import com.empresa.seguridad.domain.repository.UserRepository;
import com.empresa.seguridad.encuentros.application.dto.SeguridadTecnicoDtos.*;
import com.empresa.seguridad.encuentros.application.service.TecnicoApprovalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/seguridad/usuarios")
@RequiredArgsConstructor
@PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN')")
public class SeguridadTecnicoController {

    private final TecnicoApprovalService approvalService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<TecnicoPendienteDto>> getTecnicos(
            @RequestParam(required = false) EstadoAprobacion estado
    ) {
        return ResponseEntity.ok(approvalService.getTecnicosPorEstado(estado));
    }

    @PatchMapping("/{id}/aprobar")
    public ResponseEntity<TecnicoPendienteDto> aprobarTecnico(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User admin = getAuthenticatedUser(userDetails);
        return ResponseEntity.ok(approvalService.aprobarTecnico(id, admin));
    }

    @PatchMapping("/{id}/rechazar")
    public ResponseEntity<TecnicoPendienteDto> rechazarTecnico(
            @PathVariable UUID id,
            @Valid @RequestBody DecisionTecnicoRequest req,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User admin = getAuthenticatedUser(userDetails);
        return ResponseEntity.ok(approvalService.rechazarTecnico(id, req.motivo(), admin));
    }

    @PatchMapping("/{id}/suspender")
    public ResponseEntity<TecnicoPendienteDto> suspenderTecnico(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User admin = getAuthenticatedUser(userDetails);
        return ResponseEntity.ok(approvalService.suspenderTecnico(id, admin));
    }

    @PatchMapping("/{id}/reactivar")
    public ResponseEntity<TecnicoPendienteDto> reactivarTecnico(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User admin = getAuthenticatedUser(userDetails);
        return ResponseEntity.ok(approvalService.reactivarTecnico(id, admin));
    }

    @GetMapping("/pendientes/conteo")
    public ResponseEntity<ConteoPendientesDto> contarPendientes() {
        return ResponseEntity.ok(new ConteoPendientesDto(approvalService.contarPendientes()));
    }

    private User getAuthenticatedUser(UserDetails userDetails) {
        if (userDetails == null) {
            throw new SecurityException("No autenticado");
        }
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
    }
}
