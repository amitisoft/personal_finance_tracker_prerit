package com.amiti.finance.service.impl;
import com.amiti.finance.service.ReportsService;

import com.amiti.finance.common.exception.BadRequestException;
import com.amiti.finance.controller.ReportsController.AccountBalancePoint;
import com.amiti.finance.controller.ReportsController.CategorySpendReport;
import com.amiti.finance.controller.ReportsController.IncomeExpensePoint;
import com.amiti.finance.security.CurrentUserService;
import com.amiti.finance.dao.TransactionRepository;
import com.amiti.finance.entity.FinanceTransaction;
import com.amiti.finance.entity.enums.TransactionType;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.PrintWriter;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ReportsServiceImpl implements ReportsService {
    private final TransactionRepository transactionRepository;
    private final CurrentUserService currentUserService;

    public ReportsServiceImpl(TransactionRepository transactionRepository, CurrentUserService currentUserService) {
        this.transactionRepository = transactionRepository;
        this.currentUserService = currentUserService;
    }

    public List<CategorySpendReport> categorySpend(LocalDate dateFrom, LocalDate dateTo, UUID accountId) {
        return filteredTransactions(dateFrom, dateTo, accountId, null, TransactionType.EXPENSE)
                .stream()
                .filter(transaction -> transaction.getCategoryId() != null)
                .collect(Collectors.groupingBy(FinanceTransaction::getCategoryId,
                        Collectors.mapping(FinanceTransaction::getAmount,
                                Collectors.reducing(BigDecimal.ZERO, BigDecimal::add))))
                .entrySet()
                .stream()
                .map(entry -> new CategorySpendReport(entry.getKey(), entry.getValue()))
                .sorted(Comparator.comparing(CategorySpendReport::amount).reversed())
                .toList();
    }

    public List<IncomeExpensePoint> incomeVsExpense(LocalDate dateFrom, LocalDate dateTo, UUID accountId) {
        Map<YearMonth, List<FinanceTransaction>> grouped = filteredTransactions(dateFrom, dateTo, accountId, null, null)
                .stream()
                .collect(Collectors.groupingBy(transaction -> YearMonth.from(transaction.getTransactionDate())));
        return grouped.entrySet()
                .stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> new IncomeExpensePoint(
                        entry.getKey().toString(),
                        sumByType(entry.getValue(), TransactionType.INCOME),
                        sumByType(entry.getValue(), TransactionType.EXPENSE)
                ))
                .toList();
    }

    public List<AccountBalancePoint> accountBalanceTrend(LocalDate dateFrom, LocalDate dateTo) {
        return filteredTransactions(dateFrom, dateTo, null, null, null)
                .stream()
                .collect(Collectors.groupingBy(
                        transaction -> Map.entry(YearMonth.from(transaction.getTransactionDate()).toString(), transaction.getAccountId()),
                        Collectors.mapping(this::netChange, Collectors.reducing(BigDecimal.ZERO, BigDecimal::add))
                ))
                .entrySet()
                .stream()
                .map(entry -> new AccountBalancePoint(entry.getKey().getKey(), entry.getKey().getValue(), entry.getValue()))
                .sorted(Comparator.comparing(AccountBalancePoint::period))
                .toList();
    }

    public void exportTransactions(LocalDate dateFrom, LocalDate dateTo, UUID accountId, UUID categoryId,
                                   TransactionType type, String format, HttpServletResponse response) throws IOException {
        if (!"csv".equalsIgnoreCase(format)) {
            throw new BadRequestException("Only csv export is supported");
        }
        response.setContentType("text/csv");
        response.setHeader("Content-Disposition", "attachment; filename=transactions.csv");
        try (PrintWriter writer = response.getWriter()) {
            writer.println("id,date,type,accountId,categoryId,amount,merchant,note");
            for (FinanceTransaction transaction : filteredTransactions(dateFrom, dateTo, accountId, categoryId, type)) {
                writer.printf(
                        "%s,%s,%s,%s,%s,%s,%s,%s%n",
                        transaction.getId(),
                        transaction.getTransactionDate(),
                        transaction.getType(),
                        transaction.getAccountId(),
                        transaction.getCategoryId(),
                        transaction.getAmount(),
                        safe(transaction.getMerchant()),
                        safe(transaction.getNote())
                );
            }
        }
    }

    private List<FinanceTransaction> filteredTransactions(LocalDate dateFrom, LocalDate dateTo, UUID accountId,
                                                          UUID categoryId, TransactionType type) {
        UUID userId = currentUserService.requireUserId();
        Specification<FinanceTransaction> specification = Specification
                .where((root, query, builder) -> builder.equal(root.get("userId"), userId));
        if (dateFrom != null) {
            specification = specification.and((root, query, builder) -> builder.greaterThanOrEqualTo(root.get("transactionDate"), dateFrom));
        }
        if (dateTo != null) {
            specification = specification.and((root, query, builder) -> builder.lessThanOrEqualTo(root.get("transactionDate"), dateTo));
        }
        if (accountId != null) {
            specification = specification.and((root, query, builder) -> builder.equal(root.get("accountId"), accountId));
        }
        if (categoryId != null) {
            specification = specification.and((root, query, builder) -> builder.equal(root.get("categoryId"), categoryId));
        }
        if (type != null) {
            specification = specification.and((root, query, builder) -> builder.equal(root.get("type"), type));
        }
        return transactionRepository.findAll(specification);
    }

    private BigDecimal sumByType(List<FinanceTransaction> transactions, TransactionType type) {
        return transactions.stream()
                .filter(transaction -> transaction.getType() == type)
                .map(FinanceTransaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal netChange(FinanceTransaction transaction) {
        return switch (transaction.getType()) {
            case INCOME -> transaction.getAmount();
            case EXPENSE, TRANSFER -> transaction.getAmount().negate();
        };
    }

    private String safe(String value) {
        return value == null ? "" : '"' + value.replace("\"", "'") + '"';
    }
}
