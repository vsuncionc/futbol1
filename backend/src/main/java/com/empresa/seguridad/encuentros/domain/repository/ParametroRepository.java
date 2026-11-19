package com.empresa.seguridad.encuentros.domain.repository;

import com.empresa.seguridad.encuentros.domain.model.Parametro;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ParametroRepository extends JpaRepository<Parametro, String> {
    Optional<Parametro> findByClave(String clave);
}
