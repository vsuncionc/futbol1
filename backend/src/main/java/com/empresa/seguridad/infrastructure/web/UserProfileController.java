package com.empresa.seguridad.infrastructure.web;

import com.empresa.seguridad.application.dto.AuthDtos.ChangePasswordRequest;
import com.empresa.seguridad.application.dto.AuthDtos.MessageResponse;
import com.empresa.seguridad.application.dto.AuthDtos.UserSummaryDto;
import com.empresa.seguridad.application.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/profile")
@RequiredArgsConstructor
public class UserProfileController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<UserSummaryDto> getMyProfile(@AuthenticationPrincipal UserDetails userDetails) {
        UserSummaryDto profile = userService.getProfile(userDetails.getUsername());
        return ResponseEntity.ok(profile);
    }

    @PutMapping(value = "/foto", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UserSummaryDto> uploadProfilePhoto(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam("file") MultipartFile file
    ) {
        UserSummaryDto updatedProfile = userService.updateProfilePhoto(userDetails.getUsername(), file);
        return ResponseEntity.ok(updatedProfile);
    }

    @DeleteMapping("/foto")
    public ResponseEntity<UserSummaryDto> deleteProfilePhoto(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        UserSummaryDto updatedProfile = userService.removeProfilePhoto(userDetails.getUsername());
        return ResponseEntity.ok(updatedProfile);
    }

    @PostMapping("/change-password")
    public ResponseEntity<MessageResponse> changePassword(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody ChangePasswordRequest request,
            HttpServletRequest httpRequest
    ) {
        userService.changePassword(
                userDetails.getUsername(),
                request,
                httpRequest.getRemoteAddr(),
                httpRequest.getHeader("User-Agent")
        );
        return ResponseEntity.ok(new MessageResponse("Su contraseña ha sido modificada satisfactoriamente."));
    }
}
