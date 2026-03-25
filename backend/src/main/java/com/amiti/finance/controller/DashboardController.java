package com.amiti.finance.controller;

import com.amiti.finance.controller.BudgetController.BudgetResponse;
import com.amiti.finance.service.DashboardService;
import com.amiti.finance.controller.GoalController.GoalResponse;
import com.amiti.finance.controller.RecurringController.RecurringResponse;
import com.amiti.finance.controller.TransactionController.TransactionResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {
    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    public record CategorySpend(UUID categoryId, BigDecimal amount) {
    }

    public record DashboardResponse(
            BigDecimal monthIncome,
            BigDecimal monthExpense,
            BigDecimal netBalance,
            List<BudgetResponse> budgets,
            List<CategorySpend> categorySpending,
            List<TransactionResponse> recentTransactions,
            List<RecurringResponse> upcomingRecurring,
            List<GoalResponse> goals
    ) {
    }

    @GetMapping
    public DashboardResponse getDashboard() {
        return dashboardService.getDashboard();
    }
}
