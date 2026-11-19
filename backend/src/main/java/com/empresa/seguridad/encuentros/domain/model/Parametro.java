package com.empresa.seguridad.encuentros.domain.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "parametro")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Parametro {

    @Id
    @Column(name = "clave", length = 60, nullable = false)
    private String clave;

    @Column(name = "valor", length = 200, nullable = false)
    private String valor;

    @Column(name = "descripcion", length = 500)
    private String descripcion;
}
