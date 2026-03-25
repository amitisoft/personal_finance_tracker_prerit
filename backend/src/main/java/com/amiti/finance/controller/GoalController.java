package com.amiti.finance.controller;

import com.amiti.finance.entity.enums.GoalStatus;
import com.amiti.finance.service.GoalService;
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
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/goals")
public class GoalController {
    private final GoalService goalService;

    public GoalController(GoalService goalService) {
        this.goalService = goalService;
    }

    public record GoalRequest(
            @NotBlank @Size(max = 120) String name,
            @NotNull @DecimalMin(value = "0.01") BigDecimal targetAmount,
            LocalDate targetDate,
            UUID linkedAccountId,
            @Size(max = 50) String icon,
            @Size(max = 20) String color
    ) {
    }

    public record GoalAdjustmentRequest(
            @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
            UUID accountId
    ) {
    }

    public record GoalResponse(
            UUID id,
            String name,
            BigDecimal targetAmount,
            BigDecimal currentAmount,
            LocalDate targetDate,
            UUID linkedAccountId,
            String icon,
            String color,
            GoalStatus status,
            int progressPercent
    ) {
    }

    @GetMapping
    public List<GoalResponse> list() {
        return goalService.list();
    }

    @PostMapping
    public ResponseEntity<GoalResponse> create(@RequestBody @jakarta.validation.Valid GoalRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(goalService.create(request));
    }

    @PutMapping("/{id}")
    public GoalResponse update(@PathVariable UUID id, @RequestBody @jakarta.validation.Valid GoalRequest request) {
        return goalService.update(id, request);
    }

    @PostMapping("/{id}/contribute")
    public GoalResponse contribute(@PathVariable UUID id, @RequestBody @jakarta.validation.Valid GoalAdjustmentRequest request) {
        return goalService.contribute(id, request);
    }

    @PostMapping("/{id}/withdraw")
    public GoalResponse withdraw(@PathVariable UUID id, @RequestBody @jakarta.validation.Valid GoalAdjustmentRequest request) {
        return goalService.withdraw(id, request);
    }
}
