package com.github.DooMx3.inzynierka.service;

import com.github.DooMx3.inzynierka.dto.user.ChangePasswordRequest;
import com.github.DooMx3.inzynierka.dto.user.DeactivateUserRequest;
import com.github.DooMx3.inzynierka.dto.user.UserPatchRequest;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public void changePassword(ChangePasswordRequest request, String email) {
        User user = userRepository.findByEmail(email).orElseThrow(() -> new IllegalArgumentException("There is no such user"));
        if(!passwordEncoder.matches(request.oldPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Old password is incorrect");
        }
        user.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
    }

    public void deactivateUser(DeactivateUserRequest request, String email) {
        User user = userRepository.findByEmail(email).orElseThrow(() -> new IllegalArgumentException("There is no such user"));
        if(!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new IllegalArgumentException("Password is incorrect");
        }
        user.setActive(false);
        userRepository.save(user);
    }

    public void patchUser(UserPatchRequest request, String email) {
        User existingUser = userRepository.findByEmail(email).orElseThrow(() -> new IllegalArgumentException("There is no such user"));
        if(request.email() != null) {
            Optional<User> byEmail = userRepository.findByEmail(request.email());
            if(byEmail.isPresent()) {
                throw new IllegalArgumentException("Email is already in use");
            }
            existingUser.setEmail(request.email());
        }
        if(request.phoneNumber() != null) {
            existingUser.setPhoneNumber(request.phoneNumber());
        }
        userRepository.save(existingUser);
    }
}
