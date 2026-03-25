package com.amiti.finance.controller;

import com.amiti.finance.entity.enums.AccountType;
import com.amiti.finance.service.AccountService;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/accounts")
public class AccountController {
    private final AccountService accountService;

    public AccountController(AccountService accountService) {
        this.accountService = accountService;
    }

    public record AccountRequest(
            @NotBlank @Size(max = 100) String name,
            @NotNull AccountType type,
            @NotNull BigDecimal openingBalance,
            @Size(max = 120) String institutionName
    ) {
    }

    public record TransferRequest(
            @NotNull UUID fromAccountId,
            @NotNull UUID toAccountId,
            @NotNull @DecimalMin(value = "0.01") BigDecimal amount
    ) {
    }

    public record AccountResponse(
            UUID id,
            String name,
            AccountType type,
            BigDecimal openingBalance,
            BigDecimal currentBalance,
            String institutionName
    ) {
    }

    @GetMapping
    public List<AccountResponse> list() {
        return accountService.list();
    }

    @PostMapping
    public ResponseEntity<AccountResponse> create(@RequestBody @jakarta.validation.Valid AccountRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(accountService.create(request));
    }

    @PutMapping("/{id}")
    public AccountResponse update(@PathVariable UUID id, @RequestBody @jakarta.validation.Valid AccountRequest request) {
        return accountService.update(id, request);
    }

    @PostMapping("/transfer")
    public AccountResponse transfer(@RequestBody @jakarta.validation.Valid TransferRequest request) {
        return accountService.transfer(request);
    }
}
