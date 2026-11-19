package com.empresa.seguridad.domain.repository;

import com.empresa.seguridad.domain.model.SystemConfiguration;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SystemConfigurationRepository extends JpaRepository<SystemConfiguration, String> {

    Optional<SystemConfiguration> findByConfigKey(String configKey);
}
