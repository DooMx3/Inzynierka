package com.github.DooMx3.inzynierka.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;


@RequiredArgsConstructor
@Service
@Slf4j
public class EmailService {
    private final JavaMailSender mailSender;

    @Async
    public void sendPasswordResetEmail(String toAddress, String resetLink) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(toAddress);
            message.setSubject("Password Reset Request");
            message.setFrom("noreply@example.pl");
            message.setText("To reset your password, click the link below:\n\n" + resetLink + "\n\nIf you did not request a password reset, please ignore this email.");

            mailSender.send(message);
            log.info("Password reset email sent to: {}", toAddress);
        } catch (Exception e) {
            log.error("Failed to send email to: {}", toAddress, e);
        }
    }
}
