package com.empresa.seguridad.encuentros.infrastructure.web;

import com.empresa.seguridad.domain.model.User;
import com.empresa.seguridad.domain.repository.UserRepository;
import com.empresa.seguridad.encuentros.application.dto.JugadorDtos.*;
import com.empresa.seguridad.encuentros.application.service.JugadorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/v1/jugadores")
@RequiredArgsConstructor
public class JugadorController {

    private final JugadorService jugadorService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<JugadorDto>> getMisJugadores(@AuthenticationPrincipal UserDetails userDetails) {
        User usuario = getAuthenticatedUser(userDetails);
        return ResponseEntity.ok(jugadorService.getMisJugadores(usuario));
    }

    @GetMapping("/activos")
    public ResponseEntity<List<JugadorDto>> getMisJugadoresActivos(@AuthenticationPrincipal UserDetails userDetails) {
        User usuario = getAuthenticatedUser(userDetails);
        return ResponseEntity.ok(jugadorService.getMisJugadoresActivos(usuario));
    }

    @PostMapping(consumes = {MediaType.MULTIPART_FORM_DATA_VALUE})
    public ResponseEntity<JugadorDto> crearJugador(
            @RequestParam("nombre") String nombre,
            @RequestParam(value = "apodo", required = false) String apodo,
            @RequestParam(value = "posicion", required = false) String posicion,
            @RequestParam("estrellas") Integer estrellas,
            @RequestParam(value = "activo", required = false) Boolean activo,
            @RequestPart(value = "foto", required = false) MultipartFile foto,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User usuario = getAuthenticatedUser(userDetails);
        JugadorCreateRequest req = new JugadorCreateRequest(nombre, apodo, posicion, estrellas, activo);
        return ResponseEntity.ok(jugadorService.crearJugador(req, foto, usuario));
    }

    @GetMapping("/{id}")
    public ResponseEntity<JugadorDto> getById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User usuario = getAuthenticatedUser(userDetails);
        return ResponseEntity.ok(jugadorService.getById(id, usuario));
    }

    @PutMapping(value = "/{id}", consumes = {MediaType.MULTIPART_FORM_DATA_VALUE})
    public ResponseEntity<JugadorDto> actualizarJugador(
            @PathVariable Long id,
            @RequestParam("nombre") String nombre,
            @RequestParam(value = "apodo", required = false) String apodo,
            @RequestParam(value = "posicion", required = false) String posicion,
            @RequestParam("estrellas") Integer estrellas,
            @RequestParam(value = "activo", required = false) Boolean activo,
            @RequestPart(value = "foto", required = false) MultipartFile foto,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User usuario = getAuthenticatedUser(userDetails);
        JugadorCreateRequest req = new JugadorCreateRequest(nombre, apodo, posicion, estrellas, activo);
        return ResponseEntity.ok(jugadorService.actualizarJugador(id, req, foto, usuario));
    }

    @PatchMapping("/{id}/estado")
    public ResponseEntity<JugadorDto> cambiarEstado(
            @PathVariable Long id,
            @RequestParam("activo") boolean activo,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User usuario = getAuthenticatedUser(userDetails);
        return ResponseEntity.ok(jugadorService.cambiarEstado(id, activo, usuario));
    }

    @GetMapping("/{id}/historial")
    public ResponseEntity<List<JugadorHistorialDto>> getHistorial(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User usuario = getAuthenticatedUser(userDetails);
        return ResponseEntity.ok(jugadorService.getHistorialEstrellas(id, usuario));
    }

    private User getAuthenticatedUser(UserDetails userDetails) {
        if (userDetails == null) {
            throw new SecurityException("No autenticado");
        }
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
    }
}
