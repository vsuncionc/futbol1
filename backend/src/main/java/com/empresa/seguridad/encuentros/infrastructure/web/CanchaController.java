package com.empresa.seguridad.encuentros.infrastructure.web;

import com.empresa.seguridad.encuentros.application.dto.CanchaDtos.CanchaDto;
import com.empresa.seguridad.encuentros.application.service.CanchaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/canchas")
@RequiredArgsConstructor
public class CanchaController {

    private final CanchaService canchaService;

    @GetMapping
    public ResponseEntity<List<CanchaDto>> getCanchas() {
        return ResponseEntity.ok(canchaService.getAllActivas());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CanchaDto> getCanchaById(@PathVariable Long id) {
        return ResponseEntity.ok(canchaService.getById(id));
    }
}
