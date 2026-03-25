package com.amiti.finance.service;

public interface EmailSender {
    void sendPasswordResetEmail(String email, String resetToken);
}
