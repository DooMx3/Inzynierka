package com.github.DooMx3.inzynierka.configuration;

import com.github.DooMx3.inzynierka.service.JwtService;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

  private final JwtService jwtService;
  private final UserDetailsService userDetailsService;

  @Value("${app.cookie.secure:true}")
  private boolean secureCookies = true;

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    return "/api/auth/refresh".equals(request.getServletPath());
  }

  @Override
  protected void doFilterInternal(
      @NonNull HttpServletRequest request,
      @NonNull HttpServletResponse response,
      @NonNull FilterChain filterChain)
      throws ServletException, IOException {

    String jwt = null;
    String userEmail;

    if (request.getCookies() != null) {
      for (Cookie cookie : request.getCookies()) {
        if (JwtService.ACCESS_TOKEN_COOKIE.equals(cookie.getName())) {
          jwt = cookie.getValue();
          break;
        }
      }
    }

    if (jwt == null) {
      filterChain.doFilter(request, response);
      return;
    }

    try {
      userEmail = jwtService.extractUsername(jwt);

      if (userEmail != null && SecurityContextHolder.getContext().getAuthentication() == null) {
        UserDetails userDetails = this.userDetailsService.loadUserByUsername(userEmail);

        if (userDetails.isEnabled() && jwtService.isAccessTokenValid(jwt, userDetails)) {
          UsernamePasswordAuthenticationToken authToken =
              new UsernamePasswordAuthenticationToken(
                  userDetails, null, userDetails.getAuthorities());
          authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
          SecurityContextHolder.getContext().setAuthentication(authToken);
        } else if (!userDetails.isEnabled()) {
          SecurityContextHolder.clearContext();
          expireAuthCookies(response);
        } else {
          expireAccessTokenCookie(response);
        }
      } else if (userEmail == null) {
        expireAccessTokenCookie(response);
      }
    } catch (UsernameNotFoundException exception) {
      SecurityContextHolder.clearContext();
      expireAuthCookies(response);
    } catch (JwtException | IllegalArgumentException exception) {
      SecurityContextHolder.clearContext();
      expireAccessTokenCookie(response);
    }
    filterChain.doFilter(request, response);
  }

  private void expireAuthCookies(HttpServletResponse response) {
    expireCookie(response, JwtService.ACCESS_TOKEN_COOKIE);
    expireCookie(response, JwtService.REFRESH_TOKEN_COOKIE);
  }

  private void expireAccessTokenCookie(HttpServletResponse response) {
    expireCookie(response, JwtService.ACCESS_TOKEN_COOKIE);
  }

  private void expireCookie(HttpServletResponse response, String name) {
    Cookie cookie = new Cookie(name, null);
    cookie.setHttpOnly(true);
    cookie.setSecure(secureCookies);
    cookie.setPath("/");
    cookie.setMaxAge(0);
    response.addCookie(cookie);
  }
}
