package com.amiti.finance.controller;

import com.amiti.finance.service.AuthService;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    public record RegisterRequest(
            @Email @NotBlank String email,
            @NotBlank
            @Size(min = 8)
            @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$", message = "Password must contain upper, lower and number")
            String password,
            @NotBlank @Size(max = 120) String displayName
    ) {
    }

    public record LoginRequest(@Email @NotBlank String email, @NotBlank String password) {
    }

    public record RefreshRequest(@NotBlank String refreshToken) {
    }

    public record ForgotPasswordRequest(@Email @NotBlank String email) {
    }

    public record ResetPasswordRequest(
            @NotBlank String token,
            @NotBlank
            @Size(min = 8)
            @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$", message = "Password must contain upper, lower and number")
            String newPassword
    ) {
    }

    public record UserView(UUID id, String email, String displayName) {
    }

    public record AuthResponse(String accessToken, String refreshToken, Instant refreshExpiresAt, UserView user) {
    }

    public record MessageResponse(String message) {
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody @jakarta.validation.Valid RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/login")
    public AuthResponse login(@RequestBody @jakarta.validation.Valid LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(@RequestBody @jakarta.validation.Valid RefreshRequest request) {
        return authService.refresh(request);
    }

    @PostMapping("/forgot-password")
    public MessageResponse forgotPassword(@RequestBody @jakarta.validation.Valid ForgotPasswordRequest request) {
        return authService.forgotPassword(request);
    }

    @PostMapping("/reset-password")
    public MessageResponse resetPassword(@RequestBody @jakarta.validation.Valid ResetPasswordRequest request) {
        return authService.resetPassword(request);
    }
}
