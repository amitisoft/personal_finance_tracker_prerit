package com.amiti.finance.security;

import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.Collection;
import java.util.UUID;

public record AuthenticatedUser(UUID userId, String email, Collection<SimpleGrantedAuthority> authorities) {
}
