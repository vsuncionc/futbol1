package com.empresa.seguridad.encuentros.domain.repository;

import com.empresa.seguridad.encuentros.domain.model.Equipo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EquipoRepository extends JpaRepository<Equipo, Long> {
    List<Equipo> findByEncuentroId(Long encuentroId);
}
