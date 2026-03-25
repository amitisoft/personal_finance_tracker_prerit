package com.amiti.finance.service;

import com.amiti.finance.controller.ReportsController.AccountBalancePoint;
import com.amiti.finance.controller.ReportsController.CategorySpendReport;
import com.amiti.finance.controller.ReportsController.IncomeExpensePoint;
import com.amiti.finance.entity.enums.TransactionType;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface ReportsService {
    List<CategorySpendReport> categorySpend(LocalDate dateFrom, LocalDate dateTo, UUID accountId);

    List<IncomeExpensePoint> incomeVsExpense(LocalDate dateFrom, LocalDate dateTo, UUID accountId);

    List<AccountBalancePoint> accountBalanceTrend(LocalDate dateFrom, LocalDate dateTo);

    void exportTransactions(LocalDate dateFrom, LocalDate dateTo, UUID accountId, UUID categoryId,
                            TransactionType type, String format, HttpServletResponse response) throws IOException;
}
