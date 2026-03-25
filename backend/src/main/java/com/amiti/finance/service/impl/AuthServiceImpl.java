package com.amiti.finance.service.impl;
import com.amiti.finance.service.AuthService;
import com.amiti.finance.service.EmailSender;

import com.amiti.finance.controller.AuthController.AuthResponse;
import com.amiti.finance.controller.AuthController.ForgotPasswordRequest;
import com.amiti.finance.controller.AuthController.LoginRequest;
import com.amiti.finance.controller.AuthController.MessageResponse;
import com.amiti.finance.controller.AuthController.RefreshRequest;
import com.amiti.finance.controller.AuthController.RegisterRequest;
import com.amiti.finance.controller.AuthController.ResetPasswordRequest;
import com.amiti.finance.controller.AuthController.UserView;
import com.amiti.finance.dao.PasswordResetTokenRepository;
import com.amiti.finance.dao.RefreshTokenRepository;
import com.amiti.finance.dao.UserRepository;
import com.amiti.finance.entity.AppUser;
import com.amiti.finance.entity.PasswordResetToken;
import com.amiti.finance.entity.RefreshToken;
import com.amiti.finance.common.exception.BadRequestException;
import com.amiti.finance.common.exception.NotFoundException;
import com.amiti.finance.common.exception.UnauthorizedException;
import com.amiti.finance.security.JwtService;
import jakarta.transaction.Transactional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

@Service
@Transactional
public class AuthServiceImpl implements AuthService {
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final EmailSender emailSender;

    public AuthServiceImpl(UserRepository userRepository, RefreshTokenRepository refreshTokenRepository, PasswordResetTokenRepository passwordResetTokenRepository, PasswordEncoder passwordEncoder, JwtService jwtService, EmailSender emailSender) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.emailSender = emailSender;
    }

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmailIgnoreCase(request.email())) {
            throw new BadRequestException("Email is already registered");
        }

        AppUser user = new AppUser();
        user.setEmail(request.email().trim().toLowerCase());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setDisplayName(request.displayName().trim());
        userRepository.save(user);
        return issueTokens(user);
    }

    public AuthResponse login(LoginRequest request) {
        AppUser user = userRepository.findByEmailIgnoreCase(request.email().trim())
                .orElseThrow(() -> new UnauthorizedException("Invalid credentials"));
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid credentials");
        }
        revokeActiveRefreshTokens(user.getId());
        return issueTokens(user);
    }

    public AuthResponse refresh(RefreshRequest request) {
        RefreshToken refreshToken = refreshTokenRepository.findByTokenAndRevokedFalse(request.refreshToken())
                .orElseThrow(() -> new UnauthorizedException("Invalid refresh token"));
        if (refreshToken.getExpiresAt().isBefore(Instant.now())) {
            refreshToken.setRevoked(true);
            throw new UnauthorizedException("Refresh token expired");
        }

        AppUser user = userRepository.findById(refreshToken.getUserId())
                .orElseThrow(() -> new UnauthorizedException("User no longer exists"));
        refreshToken.setRevoked(true);
        return issueTokens(user);
    }

    public MessageResponse forgotPassword(ForgotPasswordRequest request) {
        userRepository.findByEmailIgnoreCase(request.email().trim()).ifPresent(user -> {
            PasswordResetToken resetToken = new PasswordResetToken();
            resetToken.setUserId(user.getId());
            resetToken.setToken(jwtService.randomToken());
            resetToken.setExpiresAt(jwtService.passwordResetExpiry());
            resetToken.setUsed(false);
            passwordResetTokenRepository.save(resetToken);
            emailSender.sendPasswordResetEmail(user.getEmail(), resetToken.getToken());
        });
        return new MessageResponse("If the email exists, a reset link has been sent.");
    }

    public MessageResponse resetPassword(ResetPasswordRequest request) {
        PasswordResetToken resetToken = passwordResetTokenRepository.findByTokenAndUsedFalse(request.token())
                .orElseThrow(() -> new BadRequestException("Invalid password reset token"));
        if (resetToken.getExpiresAt().isBefore(Instant.now())) {
            throw new BadRequestException("Password reset token expired");
        }

        AppUser user = userRepository.findById(resetToken.getUserId())
                .orElseThrow(() -> new NotFoundException("User not found"));
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        resetToken.setUsed(true);
        revokeActiveRefreshTokens(user.getId());
        return new MessageResponse("Password updated successfully");
    }

    private AuthResponse issueTokens(AppUser user) {
        String accessToken = jwtService.generateAccessToken(user);
        String refreshTokenValue = jwtService.randomToken();
        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUserId(user.getId());
        refreshToken.setToken(refreshTokenValue);
        refreshToken.setExpiresAt(jwtService.refreshExpiry());
        refreshToken.setRevoked(false);
        refreshTokenRepository.save(refreshToken);
        return new AuthResponse(
                accessToken,
                refreshTokenValue,
                refreshToken.getExpiresAt(),
                new UserView(user.getId(), user.getEmail(), user.getDisplayName())
        );
    }

    private void revokeActiveRefreshTokens(UUID userId) {
        refreshTokenRepository.findAllByUserIdAndRevokedFalse(userId)
                .forEach(token -> token.setRevoked(true));
    }
}

