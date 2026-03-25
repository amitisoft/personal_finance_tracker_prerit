package com.amiti.finance.controller;

import com.amiti.finance.service.BudgetService;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
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
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/budgets")
public class BudgetController {
    private final BudgetService budgetService;

    public BudgetController(BudgetService budgetService) {
        this.budgetService = budgetService;
    }

    public record BudgetRequest(
            @NotNull UUID categoryId,
            @Min(1) @Max(12) int month,
            @Min(2000) int year,
            @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
            @Min(1) @Max(120) int alertThresholdPercent
    ) {
    }

    public record BudgetResponse(
            UUID id,
            UUID categoryId,
            int month,
            int year,
            BigDecimal amount,
            BigDecimal actualSpent,
            int percentageUsed,
            String alertState
    ) {
    }

    @GetMapping
    public List<BudgetResponse> list(@RequestParam int month, @RequestParam int year) {
        return budgetService.list(month, year);
    }

    @PostMapping
    public ResponseEntity<BudgetResponse> create(@RequestBody @jakarta.validation.Valid BudgetRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(budgetService.create(request));
    }

    @PutMapping("/{id}")
    public BudgetResponse update(@PathVariable UUID id, @RequestBody @jakarta.validation.Valid BudgetRequest request) {
        return budgetService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        budgetService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
