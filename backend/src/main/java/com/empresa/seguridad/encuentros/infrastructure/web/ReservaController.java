package com.empresa.seguridad.encuentros.infrastructure.web;

import com.empresa.seguridad.domain.model.User;
import com.empresa.seguridad.domain.repository.UserRepository;
import com.empresa.seguridad.encuentros.application.dto.ReservaDtos.*;
import com.empresa.seguridad.encuentros.application.service.FileStorageService;
import com.empresa.seguridad.encuentros.application.service.ReservaService;
import com.empresa.seguridad.encuentros.domain.model.EstadoReserva;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/reservas")
@RequiredArgsConstructor
public class ReservaController {

    private final ReservaService reservaService;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;

    @PostMapping(consumes = {MediaType.MULTIPART_FORM_DATA_VALUE})
    public ResponseEntity<ReservaDto> solicitarReserva(
            @RequestParam("canchaId") Long canchaId,
            @RequestParam("fecha") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha,
            @RequestParam("horaInicio") @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) LocalTime horaInicio,
            @RequestParam("horaFin") @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) LocalTime horaFin,
            @RequestParam(value = "tecnicoId", required = false) UUID tecnicoId,
            @RequestPart(value = "comprobante", required = false) MultipartFile comprobante,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User usuario = getAuthenticatedUser(userDetails);
        ReservaCreateRequest req = new ReservaCreateRequest(canchaId, fecha, horaInicio, horaFin, tecnicoId);
        return ResponseEntity.ok(reservaService.solicitarReserva(req, comprobante, usuario));
    }

    @GetMapping
    public ResponseEntity<List<ReservaDto>> getMisReservas(@AuthenticationPrincipal UserDetails userDetails) {
        User usuario = getAuthenticatedUser(userDetails);
        return ResponseEntity.ok(reservaService.getMisReservas(usuario));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ReservaDto> getById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User usuario = getAuthenticatedUser(userDetails);
        return ResponseEntity.ok(reservaService.getById(id, usuario));
    }

    @PutMapping(value = "/{id}/comprobante", consumes = {MediaType.MULTIPART_FORM_DATA_VALUE})
    public ResponseEntity<ReservaDto> actualizarComprobante(
            @PathVariable Long id,
            @RequestPart("comprobante") MultipartFile comprobante,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User usuario = getAuthenticatedUser(userDetails);
        return ResponseEntity.ok(reservaService.actualizarComprobante(id, comprobante, usuario));
    }

    @GetMapping("/{id}/comprobante")
    public ResponseEntity<Resource> verComprobante(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User usuario = getAuthenticatedUser(userDetails);
        ReservaDto reserva = reservaService.getById(id, usuario);

        if (reserva.comprobanteUrl() == null) {
            return ResponseEntity.notFound().build();
        }

        Resource resource = fileStorageService.loadFileAsResource(reserva.comprobanteUrl());
        String contentType = reserva.comprobanteTipo() != null ? reserva.comprobanteTipo() : "application/octet-stream";

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
    }

    @PatchMapping("/{id}/aprobar")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN')")
    public ResponseEntity<ReservaDto> aprobarReserva(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User admin = getAuthenticatedUser(userDetails);
        return ResponseEntity.ok(reservaService.aprobarReserva(id, admin));
    }

    @PatchMapping("/{id}/rechazar")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN')")
    public ResponseEntity<ReservaDto> rechazarReserva(
            @PathVariable Long id,
            @RequestBody DecisionReservaRequest req,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User admin = getAuthenticatedUser(userDetails);
        return ResponseEntity.ok(reservaService.rechazarReserva(id, req.motivo(), admin));
    }

    @PatchMapping("/{id}/cancelar")
    public ResponseEntity<ReservaDto> cancelarReserva(
            @PathVariable Long id,
            @RequestBody(required = false) CancelReservaRequest req,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User usuario = getAuthenticatedUser(userDetails);
        String motivo = req != null ? req.motivo() : null;
        return ResponseEntity.ok(reservaService.cancelarReserva(id, motivo, usuario));
    }

    @PatchMapping("/{id}/reprogramar")
    public ResponseEntity<ReservaDto> reprogramarReserva(
            @PathVariable Long id,
            @Valid @RequestBody ReprogramarReservaRequest req,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User usuario = getAuthenticatedUser(userDetails);
        return ResponseEntity.ok(reservaService.reprogramarReserva(id, req, usuario));
    }

    @GetMapping("/solicitudes")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN')")
    public ResponseEntity<List<ReservaDto>> getSolicitudesPendientes() {
        return ResponseEntity.ok(reservaService.getSolicitudesPendientes());
    }

    @GetMapping("/alertas")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN')")
    public ResponseEntity<AlertaResumenDto> getAlertasSemaforo() {
        return ResponseEntity.ok(reservaService.getAlertasSemaforo());
    }

    @GetMapping("/verificar-disponibilidad")
    public ResponseEntity<DisponibilidadCheckDto> verificarDisponibilidad(
            @RequestParam Long canchaId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) LocalTime horaInicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) LocalTime horaFin,
            @RequestParam(required = false) Long excluirReservaId
    ) {
        boolean disponible = reservaService.verificarDisponibilidadConfirmada(canchaId, fecha, horaInicio, horaFin, excluirReservaId);
        return ResponseEntity.ok(new DisponibilidadCheckDto(
                disponible,
                disponible ? "Cancha disponible en este horario." : "La cancha ya cuenta con una reserva confirmada en este horario."
        ));
    }

    @GetMapping("/calendario")
    public ResponseEntity<List<ReservaDto>> getCalendario(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(required = false) Long canchaId,
            @RequestParam(required = false) EstadoReserva estado,
            @RequestParam(required = false) UUID tecnicoId
    ) {
        return ResponseEntity.ok(reservaService.getCalendario(desde, hasta, canchaId, estado, tecnicoId));
    }

    private User getAuthenticatedUser(UserDetails userDetails) {
        if (userDetails == null) {
            throw new SecurityException("No autenticado");
        }
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
    }
}
