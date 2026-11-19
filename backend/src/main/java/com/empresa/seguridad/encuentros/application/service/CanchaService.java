package com.empresa.seguridad.encuentros.application.service;

import com.empresa.seguridad.encuentros.application.dto.CanchaDtos.CanchaDto;
import com.empresa.seguridad.encuentros.domain.model.Cancha;
import com.empresa.seguridad.encuentros.domain.repository.CanchaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CanchaService {

    private final CanchaRepository canchaRepository;

    @Transactional(readOnly = true)
    public List<CanchaDto> getAllActivas() {
        return canchaRepository.findByActivaTrue().stream()
                .map(this::mapToDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public CanchaDto getById(Long id) {
        Cancha c = canchaRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Cancha no encontrada con id: " + id));
        return mapToDto(c);
    }

    public CanchaDto mapToDto(Cancha c) {
        return new CanchaDto(c.getId(), c.getNombre(), c.getTipo(), c.getTarifaHora(), c.isActiva());
    }
}
