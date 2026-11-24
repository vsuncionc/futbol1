package com.empresa.seguridad.encuentros.application.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.*;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
public class FileStorageService {

    private final Path rootLocation = Paths.get("uploads").toAbsolutePath().normalize();
    private final Path comprobantesLocation = rootLocation.resolve("comprobantes");
    private final Path jugadoresLocation = rootLocation.resolve("jugadores");
    private final Path bannersLocation = rootLocation.resolve("banners");
    private final Path avatarsLocation = rootLocation.resolve("avatars");

    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of("image/jpeg", "image/png", "image/webp");
    private static final Set<String> ALLOWED_COMPROBANTE_TYPES = Set.of("image/jpeg", "image/png", "application/pdf");

    public FileStorageService() {
        try {
            Files.createDirectories(comprobantesLocation);
            Files.createDirectories(jugadoresLocation);
            Files.createDirectories(bannersLocation);
            Files.createDirectories(avatarsLocation);
        } catch (IOException e) {
            log.error("No se pudo inicializar el almacenamiento de archivos", e);
        }
    }

    public String storeComprobante(MultipartFile file) {
        validateFile(file, ALLOWED_COMPROBANTE_TYPES, 5 * 1024 * 1024L, "Comprobante");
        return store(file, comprobantesLocation, "comprobantes");
    }

    public String storeFotoJugador(MultipartFile file) {
        validateFile(file, ALLOWED_IMAGE_TYPES, 5 * 1024 * 1024L, "Foto del jugador");
        return store(file, jugadoresLocation, "jugadores");
    }

    public String storeBanner(MultipartFile file) {
        validateFile(file, ALLOWED_IMAGE_TYPES, 5 * 1024 * 1024L, "Banner");
        return store(file, bannersLocation, "banners");
    }

    public String storeAvatar(MultipartFile file) {
        validateFile(file, ALLOWED_IMAGE_TYPES, 5 * 1024 * 1024L, "Foto de perfil");
        return store(file, avatarsLocation, "avatars");
    }

    private void validateFile(MultipartFile file, Set<String> allowedTypes, long maxBytes, String label) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException(label + " es obligatorio y no puede estar vacío");
        }
        if (file.getSize() > maxBytes) {
            throw new IllegalArgumentException(label + " excede el tamaño máximo permitido de " + (maxBytes / (1024 * 1024)) + " MB");
        }
        String contentType = file.getContentType();
        if (contentType == null || !allowedTypes.contains(contentType.toLowerCase())) {
            throw new IllegalArgumentException("Formato no permitido para " + label + ". Permitidos: " + allowedTypes);
        }
    }

    private String store(MultipartFile file, Path destinationFolder, String folderName) {
        String originalFilename = StringUtils.cleanPath(file.getOriginalFilename() != null ? file.getOriginalFilename() : "file");
        String extension = "";
        int dotIdx = originalFilename.lastIndexOf('.');
        if (dotIdx >= 0) {
            extension = originalFilename.substring(dotIdx).toLowerCase();
        }

        String uniqueFilename = UUID.randomUUID() + extension;
        Path targetPath = destinationFolder.resolve(uniqueFilename);

        try (InputStream inputStream = file.getInputStream()) {
            Files.copy(inputStream, targetPath, StandardCopyOption.REPLACE_EXISTING);
            return folderName + "/" + uniqueFilename;
        } catch (IOException e) {
            throw new RuntimeException("Error al almacenar el archivo: " + e.getMessage(), e);
        }
    }

    public Resource loadFileAsResource(String relativePath) {
        try {
            Path filePath = rootLocation.resolve(relativePath).normalize();
            if (!filePath.startsWith(rootLocation)) {
                throw new SecurityException("Acceso no permitido fuera del directorio base");
            }
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new RuntimeException("Archivo no encontrado o no legible: " + relativePath);
            }
        } catch (MalformedURLException e) {
            throw new RuntimeException("Ruta de archivo inválida: " + relativePath, e);
        }
    }
}
