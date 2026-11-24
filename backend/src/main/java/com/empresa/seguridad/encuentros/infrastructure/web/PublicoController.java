package com.empresa.seguridad.encuentros.infrastructure.web;

import com.empresa.seguridad.application.dto.AuthDtos.MessageResponse;
import com.empresa.seguridad.application.dto.AuthDtos.RegisterTecnicoRequest;
import com.empresa.seguridad.application.service.AuthService;
import com.empresa.seguridad.encuentros.application.dto.CanchaDtos.CanchaDto;
import com.empresa.seguridad.encuentros.application.dto.EncuentroDtos.EncuentroDto;
import com.empresa.seguridad.encuentros.application.dto.ReservaDtos.DisponibilidadSlotDto;
import com.empresa.seguridad.encuentros.application.service.CanchaService;
import com.empresa.seguridad.encuentros.application.service.EncuentroService;
import com.empresa.seguridad.encuentros.application.service.FileStorageService;
import com.empresa.seguridad.encuentros.application.service.ReservaService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/publico")
@RequiredArgsConstructor
public class PublicoController {

    private final EncuentroService encuentroService;
    private final ReservaService reservaService;
    private final CanchaService canchaService;
    private final AuthService authService;
    private final FileStorageService fileStorageService;

    @GetMapping("/encuentros")
    public ResponseEntity<List<EncuentroDto>> getEncuentrosPublicos(
            @RequestParam(required = false) Long canchaId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha
    ) {
        return ResponseEntity.ok(encuentroService.getPublicEncuentros(canchaId, fecha));
    }

    @GetMapping("/encuentros/pasados")
    public ResponseEntity<List<EncuentroDto>> getEncuentrosPasados() {
        return ResponseEntity.ok(encuentroService.getPastPublicEncuentros());
    }

    @GetMapping("/encuentros/{id}")
    public ResponseEntity<EncuentroDto> getDetalleEncuentro(@PathVariable Long id) {
        return ResponseEntity.ok(encuentroService.getById(id));
    }

    @GetMapping("/disponibilidad")
    public ResponseEntity<List<DisponibilidadSlotDto>> getDisponibilidad(
            @RequestParam(required = false) Long canchaId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta
    ) {
        return ResponseEntity.ok(reservaService.getDisponibilidadPublica(desde, hasta, canchaId));
    }

    @GetMapping("/canchas")
    public ResponseEntity<List<CanchaDto>> getCanchas() {
        return ResponseEntity.ok(canchaService.getAllActivas());
    }

    @PostMapping("/registro-tecnico")
    public ResponseEntity<MessageResponse> registrarTecnico(
            @Valid @RequestBody RegisterTecnicoRequest request,
            HttpServletRequest httpRequest
    ) {
        String ip = httpRequest.getRemoteAddr();
        String userAgent = httpRequest.getHeader("User-Agent");
        authService.registerTecnico(request, ip, userAgent);
        return ResponseEntity.ok(new MessageResponse("Registro exitoso. Tu cuenta será revisada por un administrador. Te avisaremos por correo."));
    }

    @GetMapping("/archivos/{folder}/{filename:.+}")
    public ResponseEntity<Resource> servirArchivoPublico(
            @PathVariable String folder,
            @PathVariable String filename
    ) {
        // Solo fotos de jugadores, banners y avatars son públicos
        if (!"jugadores".equals(folder) && !"banners".equals(folder) && !"avatars".equals(folder)) {
            return ResponseEntity.status(403).build();
        }

        Resource resource = fileStorageService.loadFileAsResource(folder + "/" + filename);
        String contentType = "application/octet-stream";
        try {
            contentType = Files.probeContentType(Paths.get(resource.getFile().getAbsolutePath()));
        } catch (IOException ignored) {}

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType != null ? contentType : "application/octet-stream"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
    }
}
