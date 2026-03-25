package com.amiti.finance.service;

import com.amiti.finance.controller.AuthController.AuthResponse;
import com.amiti.finance.controller.AuthController.ForgotPasswordRequest;
import com.amiti.finance.controller.AuthController.LoginRequest;
import com.amiti.finance.controller.AuthController.MessageResponse;
import com.amiti.finance.controller.AuthController.RefreshRequest;
import com.amiti.finance.controller.AuthController.RegisterRequest;
import com.amiti.finance.controller.AuthController.ResetPasswordRequest;

public interface AuthService {
    AuthResponse register(RegisterRequest request);

    AuthResponse login(LoginRequest request);

    AuthResponse refresh(RefreshRequest request);

    MessageResponse forgotPassword(ForgotPasswordRequest request);

    MessageResponse resetPassword(ResetPasswordRequest request);
}
