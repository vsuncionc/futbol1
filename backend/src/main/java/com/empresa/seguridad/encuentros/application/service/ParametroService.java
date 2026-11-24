package com.empresa.seguridad.encuentros.application.service;

import com.empresa.seguridad.encuentros.domain.model.Parametro;
import com.empresa.seguridad.encuentros.domain.repository.ParametroRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ParametroService {

    private final ParametroRepository parametroRepository;

    private static final Map<String, String[]> DEFAULT_PARAMS = Map.ofEntries(
            Map.entry("ALERTA_ROJO_DIAS", new String[]{"2", "Umbral de días para semáforo rojo"}),
            Map.entry("ALERTA_AMBAR_DIAS", new String[]{"3", "Umbral de días para semáforo ámbar"}),
            Map.entry("EQUIPO_MIN_JUGADORES", new String[]{"4", "Mínimo de jugadores por equipo al publicar"}),
            Map.entry("EQUIPO_MAX_JUGADORES", new String[]{"8", "Máximo de jugadores por equipo"}),
            Map.entry("RESERVA_DURACION_MIN_H", new String[]{"1", "Duración mínima de reserva en horas"}),
            Map.entry("RESERVA_DURACION_MAX_H", new String[]{"24", "Duración máxima de reserva en horas"}),
            Map.entry("CANCELACION_HORAS_MIN", new String[]{"24", "Horas mínimas de anticipación para cancelación por técnico"}),
            Map.entry("EDICION_HORAS_MIN", new String[]{"2", "Horas antes para editar jugadores de un encuentro publicado"}),
            Map.entry("COMPROBANTE_OBLIGATORIO_TECNICO", new String[]{"false", "Obliga comprobante en solicitud del técnico"}),
            Map.entry("COMPROBANTE_MAX_MB", new String[]{"5", "Tamaño máximo del comprobante en MB"}),
            Map.entry("FOTO_JUGADOR_MAX_MB", new String[]{"2", "Tamaño máximo de foto en MB"}),
            Map.entry("BANNER_MAX_MB", new String[]{"3", "Tamaño máximo de banner en MB"}),
            Map.entry("ENCUENTROS_POR_RESERVA_MAX", new String[]{"1", "Máximo de encuentros por reserva"}),
            Map.entry("MOSTRAR_SEMAFORO_VERDE", new String[]{"true", "Mostrar reservas sin urgencia en semáforo"})
    );

    @PostConstruct
    @Transactional
    public void initDefaultParameters() {
        DEFAULT_PARAMS.forEach((clave, valDesc) -> {
            parametroRepository.findByClave(clave).ifPresentOrElse(
                    param -> {
                        if ("RESERVA_DURACION_MAX_H".equals(clave)) {
                            try {
                                if (Integer.parseInt(param.getValor()) < 24) {
                                    param.setValor("24");
                                    parametroRepository.save(param);
                                }
                            } catch (Exception ignored) {
                            }
                        }
                    },
                    () -> {
                        parametroRepository.save(Parametro.builder()
                                .clave(clave)
                                .valor(valDesc[0])
                                .descripcion(valDesc[1])
                                .build());
                    });
        });
    }

    public String get(String clave, String defaultValue) {
        return parametroRepository.findByClave(clave)
                .map(Parametro::getValor)
                .orElse(defaultValue);
    }

    public int getInt(String clave, int defaultValue) {
        try {
            return Integer.parseInt(get(clave, String.valueOf(defaultValue)));
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    public boolean getBoolean(String clave, boolean defaultValue) {
        return Boolean.parseBoolean(get(clave, String.valueOf(defaultValue)));
    }

    public List<Parametro> getAll() {
        return parametroRepository.findAll();
    }

    @Transactional
    public Parametro update(String clave, String valor) {
        Parametro p = parametroRepository.findByClave(clave)
                .orElseThrow(() -> new IllegalArgumentException("Parámetro no encontrado: " + clave));
        p.setValor(valor);
        return parametroRepository.save(p);
    }
}
