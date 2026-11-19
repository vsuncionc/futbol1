package com.empresa.seguridad.domain.repository;

import com.empresa.seguridad.domain.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    @Query("SELECT DISTINCT u FROM User u " +
           "LEFT JOIN FETCH u.roles r " +
           "LEFT JOIN FETCH r.permissions " +
           "WHERE LOWER(u.email) = LOWER(:email)")
    Optional<User> findByEmailWithRolesAndPermissions(@Param("email") String email);

    @Query("SELECT DISTINCT u FROM User u " +
           "LEFT JOIN FETCH u.roles r " +
           "LEFT JOIN FETCH r.permissions " +
           "WHERE u.id = :id")
    Optional<User> findByIdWithRolesAndPermissions(@Param("id") UUID id);

    @EntityGraph(attributePaths = {"roles"})
    @Query("SELECT u FROM User u")
    Page<User> findAllWithRoles(Pageable pageable);

    @Modifying
    @Query("UPDATE User u SET u.enabled = :enabled WHERE u.id IN :ids")
    int updateStatusInBatch(@Param("ids") Collection<UUID> ids, @Param("enabled") boolean enabled);

    List<User> findByEstadoAprobacionOrderByCreatedAtDesc(com.empresa.seguridad.domain.model.EstadoAprobacion estadoAprobacion);

    long countByEstadoAprobacion(com.empresa.seguridad.domain.model.EstadoAprobacion estadoAprobacion);

    @Query("SELECT u FROM User u JOIN u.roles r WHERE r.code IN ('ROLE_ADMIN', 'ROLE_SUPER_ADMIN')")
    List<User> findAdmins();
}
