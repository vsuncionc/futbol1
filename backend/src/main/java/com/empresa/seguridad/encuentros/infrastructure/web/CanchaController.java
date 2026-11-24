package com.empresa.seguridad.encuentros.infrastructure.web;

import com.empresa.seguridad.encuentros.application.dto.CanchaDtos.CanchaDto;
import com.empresa.seguridad.encuentros.application.dto.CanchaDtos.UpdateTarifaRequest;
import com.empresa.seguridad.encuentros.application.service.CanchaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/canchas")
@RequiredArgsConstructor
public class CanchaController {

    private final CanchaService canchaService;

    @GetMapping
    public ResponseEntity<List<CanchaDto>> getCanchas() {
        return ResponseEntity.ok(canchaService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CanchaDto> getCanchaById(@PathVariable Long id) {
        return ResponseEntity.ok(canchaService.getById(id));
    }

    @PutMapping("/{id}/tarifa")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN')")
    public ResponseEntity<CanchaDto> actualizarTarifa(
            @PathVariable Long id,
            @Valid @RequestBody UpdateTarifaRequest req
    ) {
        return ResponseEntity.ok(canchaService.actualizarTarifa(id, req.tarifaHora()));
    }
}
