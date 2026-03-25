package com.amiti.finance.controller;

import com.amiti.finance.entity.enums.RecurringFrequency;
import com.amiti.finance.entity.enums.RecurringStatus;
import com.amiti.finance.service.RecurringService;
import com.amiti.finance.entity.enums.TransactionType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/recurring")
public class RecurringController {
    private final RecurringService recurringService;

    public RecurringController(RecurringService recurringService) {
        this.recurringService = recurringService;
    }

    public record RecurringRequest(
            @NotBlank String title,
            @NotNull TransactionType type,
            @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
            UUID categoryId,
            @NotNull UUID accountId,
            @NotNull RecurringFrequency frequency,
            @NotNull LocalDate startDate,
            LocalDate endDate,
            boolean autoCreateTransaction,
            RecurringStatus status
    ) {
    }

    public record RecurringResponse(
            UUID id,
            String title,
            TransactionType type,
            BigDecimal amount,
            UUID categoryId,
            UUID accountId,
            RecurringFrequency frequency,
            LocalDate startDate,
            LocalDate endDate,
            LocalDate nextRunDate,
            boolean autoCreateTransaction,
            RecurringStatus status
    ) {
    }

    @GetMapping
    public List<RecurringResponse> list() {
        return recurringService.list();
    }

    @PostMapping
    public ResponseEntity<RecurringResponse> create(@RequestBody @jakarta.validation.Valid RecurringRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(recurringService.create(request));
    }

    @PutMapping("/{id}")
    public RecurringResponse update(@PathVariable UUID id, @RequestBody @jakarta.validation.Valid RecurringRequest request) {
        return recurringService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        recurringService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
