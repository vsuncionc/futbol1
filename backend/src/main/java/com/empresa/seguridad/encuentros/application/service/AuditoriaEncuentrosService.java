package com.empresa.seguridad.encuentros.application.service;

import com.empresa.seguridad.domain.model.User;
import com.empresa.seguridad.encuentros.domain.model.Auditoria;
import com.empresa.seguridad.encuentros.domain.repository.AuditoriaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditoriaEncuentrosService {

    private final AuditoriaRepository auditoriaRepository;

    @Transactional
    public void registrar(User usuario, String entidad, Long entidadId, String accion, String detalle) {
        try {
            Auditoria auditoria = Auditoria.builder()
                    .usuario(usuario)
                    .entidad(entidad)
                    .entidadId(entidadId != null ? entidadId : 0L)
                    .accion(accion)
                    .detalle(detalle)
                    .build();
            auditoriaRepository.save(auditoria);
        } catch (Exception e) {
            log.warn("No se pudo registrar auditoría de encuentros: {}", e.getMessage());
        }
    }
}
