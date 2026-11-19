package com.empresa.seguridad.encuentros.domain.repository;

import com.empresa.seguridad.encuentros.domain.model.Cancha;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CanchaRepository extends JpaRepository<Cancha, Long> {
    List<Cancha> findByActivaTrue();
    Optional<Cancha> findByNombreIgnoreCase(String nombre);
}
