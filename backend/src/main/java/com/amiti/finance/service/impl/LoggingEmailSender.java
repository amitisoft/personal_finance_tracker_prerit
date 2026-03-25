package com.amiti.finance.service.impl;
import com.amiti.finance.service.EmailSender;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class LoggingEmailSender implements EmailSender {
    private static final Logger log = LoggerFactory.getLogger(LoggingEmailSender.class);

    @Override
    public void sendPasswordResetEmail(String email, String resetToken) {
        log.info("Password reset token for {} => {}", email, resetToken);
    }
}
