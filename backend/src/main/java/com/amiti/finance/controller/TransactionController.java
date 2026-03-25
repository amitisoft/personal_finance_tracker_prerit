package com.amiti.finance.controller;

import com.amiti.finance.common.model.PageResponse;
import com.amiti.finance.entity.enums.TransactionType;
import com.amiti.finance.service.TransactionService;
import jakarta.validation.constraints.DecimalMin;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {
    private final TransactionService transactionService;

    public TransactionController(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    public record TransactionRequest(
            @NotNull TransactionType type,
            @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
            @NotNull LocalDate date,
            @NotNull UUID accountId,
            UUID categoryId,
            UUID destinationAccountId,
            String merchant,
            String note,
            String paymentMethod,
            UUID recurringTransactionId,
            List<String> tags
    ) {
    }

    public record TransactionResponse(
            UUID id,
            TransactionType type,
            BigDecimal amount,
            LocalDate date,
            UUID accountId,
            UUID categoryId,
            UUID destinationAccountId,
            String merchant,
            String note,
            String paymentMethod,
            UUID recurringTransactionId,
            List<String> tags
    ) {
    }

    public record TransactionFilter(
            LocalDate dateFrom,
            LocalDate dateTo,
            UUID accountId,
            UUID categoryId,
            TransactionType type,
            String search
    ) {
    }

    @GetMapping
    public PageResponse<TransactionResponse> list(
            @RequestParam(required = false) LocalDate dateFrom,
            @RequestParam(required = false) LocalDate dateTo,
            @RequestParam(required = false) UUID accountId,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) TransactionType type,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return transactionService.list(new TransactionFilter(dateFrom, dateTo, accountId, categoryId, type, search), page, size);
    }

    @GetMapping("/{id}")
    public TransactionResponse get(@PathVariable UUID id) {
        return transactionService.get(id);
    }

    @PostMapping
    public ResponseEntity<TransactionResponse> create(@RequestBody @jakarta.validation.Valid TransactionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(transactionService.create(request));
    }

    @PutMapping("/{id}")
    public TransactionResponse update(@PathVariable UUID id, @RequestBody @jakarta.validation.Valid TransactionRequest request) {
        return transactionService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        transactionService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
