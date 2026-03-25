package com.amiti.finance.controller;

import com.amiti.finance.service.ReportsService;
import com.amiti.finance.entity.enums.TransactionType;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/reports")
public class ReportsController {
    private final ReportsService reportsService;

    public ReportsController(ReportsService reportsService) {
        this.reportsService = reportsService;
    }

    public record CategorySpendReport(UUID categoryId, BigDecimal amount) {
    }

    public record IncomeExpensePoint(String period, BigDecimal income, BigDecimal expense) {
    }

    public record AccountBalancePoint(String period, UUID accountId, BigDecimal netChange) {
    }

    @GetMapping("/category-spend")
    public List<CategorySpendReport> categorySpend(
            @RequestParam(required = false) LocalDate dateFrom,
            @RequestParam(required = false) LocalDate dateTo,
            @RequestParam(required = false) UUID accountId
    ) {
        return reportsService.categorySpend(dateFrom, dateTo, accountId);
    }

    @GetMapping("/income-vs-expense")
    public List<IncomeExpensePoint> incomeVsExpense(
            @RequestParam(required = false) LocalDate dateFrom,
            @RequestParam(required = false) LocalDate dateTo,
            @RequestParam(required = false) UUID accountId
    ) {
        return reportsService.incomeVsExpense(dateFrom, dateTo, accountId);
    }

    @GetMapping("/account-balance-trend")
    public List<AccountBalancePoint> accountBalanceTrend(
            @RequestParam(required = false) LocalDate dateFrom,
            @RequestParam(required = false) LocalDate dateTo
    ) {
        return reportsService.accountBalanceTrend(dateFrom, dateTo);
    }

    @GetMapping("/transactions/export")
    public void exportTransactions(
            @RequestParam(required = false) LocalDate dateFrom,
            @RequestParam(required = false) LocalDate dateTo,
            @RequestParam(required = false) UUID accountId,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) TransactionType type,
            @RequestParam(defaultValue = "csv") String format,
            HttpServletResponse response
    ) throws IOException {
        reportsService.exportTransactions(dateFrom, dateTo, accountId, categoryId, type, format, response);
    }
}
