package com.empresa.seguridad.encuentros.infrastructure.web;

import com.empresa.seguridad.encuentros.application.dto.ParametroDtos.ParametroDto;
import com.empresa.seguridad.encuentros.application.dto.ParametroDtos.UpdateParametroRequest;
import com.empresa.seguridad.encuentros.application.service.ParametroService;
import com.empresa.seguridad.encuentros.domain.model.Parametro;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/parametros")
@RequiredArgsConstructor
@PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN')")
public class ParametroController {

    private final ParametroService parametroService;

    @GetMapping
    public ResponseEntity<List<ParametroDto>> getParametros() {
        List<ParametroDto> list = parametroService.getAll().stream()
                .map(p -> new ParametroDto(p.getClave(), p.getValor(), p.getDescripcion()))
                .toList();
        return ResponseEntity.ok(list);
    }

    @PutMapping("/{clave}")
    public ResponseEntity<ParametroDto> actualizarParametro(
            @PathVariable String clave,
            @Valid @RequestBody UpdateParametroRequest req
    ) {
        Parametro updated = parametroService.update(clave, req.valor());
        return ResponseEntity.ok(new ParametroDto(updated.getClave(), updated.getValor(), updated.getDescripcion()));
    }
}
