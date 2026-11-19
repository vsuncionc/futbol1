package com.empresa.seguridad.encuentros.infrastructure.web;

import com.empresa.seguridad.domain.model.User;
import com.empresa.seguridad.domain.repository.UserRepository;
import com.empresa.seguridad.encuentros.application.dto.EncuentroDtos.*;
import com.empresa.seguridad.encuentros.application.dto.ReservaDtos.ReservaDto;
import com.empresa.seguridad.encuentros.application.service.EncuentroService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/encuentros")
@RequiredArgsConstructor
public class EncuentroController {

    private final EncuentroService encuentroService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<EncuentroDto>> getMisEncuentros(@AuthenticationPrincipal UserDetails userDetails) {
        User usuario = getAuthenticatedUser(userDetails);
        return ResponseEntity.ok(encuentroService.getMisEncuentros(usuario));
    }

    @GetMapping("/reservas-disponibles")
    public ResponseEntity<List<ReservaDto>> getReservasDisponibles(@AuthenticationPrincipal UserDetails userDetails) {
        User usuario = getAuthenticatedUser(userDetails);
        return ResponseEntity.ok(encuentroService.getReservasDisponibles(usuario));
    }

    @PostMapping(consumes = {MediaType.MULTIPART_FORM_DATA_VALUE})
    public ResponseEntity<EncuentroDto> crearEncuentro(
            @RequestParam("reservaId") Long reservaId,
            @RequestParam("nombre") String nombre,
            @RequestParam(value = "apuestaMonto", required = false) BigDecimal apuestaMonto,
            @RequestPart(value = "banner", required = false) MultipartFile banner,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User usuario = getAuthenticatedUser(userDetails);
        EncuentroCreateRequest req = new EncuentroCreateRequest(reservaId, nombre, apuestaMonto);
        return ResponseEntity.ok(encuentroService.crearEncuentro(req, banner, usuario));
    }

    @GetMapping("/{id}")
    public ResponseEntity<EncuentroDto> getById(@PathVariable Long id) {
        return ResponseEntity.ok(encuentroService.getById(id));
    }

    @PutMapping(value = "/{id}", consumes = {MediaType.MULTIPART_FORM_DATA_VALUE})
    public ResponseEntity<EncuentroDto> actualizarEncuentro(
            @PathVariable Long id,
            @RequestParam("nombre") String nombre,
            @RequestParam(value = "apuestaMonto", required = false) BigDecimal apuestaMonto,
            @RequestPart(value = "banner", required = false) MultipartFile banner,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User usuario = getAuthenticatedUser(userDetails);
        EncuentroUpdateRequest req = new EncuentroUpdateRequest(nombre, apuestaMonto);
        return ResponseEntity.ok(encuentroService.actualizarEncuentro(id, req, banner, usuario));
    }

    @PutMapping("/{id}/equipos")
    public ResponseEntity<EncuentroDto> actualizarEquipos(
            @PathVariable Long id,
            @Valid @RequestBody ActualizarEquiposRequest req,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User usuario = getAuthenticatedUser(userDetails);
        return ResponseEntity.ok(encuentroService.actualizarEquipos(id, req, usuario));
    }

    @PostMapping("/balancear")
    public ResponseEntity<List<SugerenciaEquipoDto>> balancear(
            @Valid @RequestBody BalancearRequest req,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User usuario = getAuthenticatedUser(userDetails);
        return ResponseEntity.ok(encuentroService.balancearEquipos(req, usuario));
    }

    @PatchMapping("/{id}/publicar")
    public ResponseEntity<EncuentroDto> publicarEncuentro(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User usuario = getAuthenticatedUser(userDetails);
        return ResponseEntity.ok(encuentroService.publicarEncuentro(id, usuario));
    }

    @PatchMapping("/{id}/cancelar")
    public ResponseEntity<EncuentroDto> cancelarEncuentro(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User usuario = getAuthenticatedUser(userDetails);
        return ResponseEntity.ok(encuentroService.cancelarEncuentro(id, usuario));
    }

    private User getAuthenticatedUser(UserDetails userDetails) {
        if (userDetails == null) {
            throw new SecurityException("No autenticado");
        }
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
    }
}
