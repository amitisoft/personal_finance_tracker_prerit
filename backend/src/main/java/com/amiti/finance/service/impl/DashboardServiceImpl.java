package com.amiti.finance.service.impl;
import com.amiti.finance.service.DashboardService;

import com.amiti.finance.service.BudgetService;
import com.amiti.finance.controller.DashboardController.CategorySpend;
import com.amiti.finance.controller.DashboardController.DashboardResponse;
import com.amiti.finance.service.GoalService;
import com.amiti.finance.entity.enums.RecurringStatus;
import com.amiti.finance.service.RecurringService;
import com.amiti.finance.security.CurrentUserService;
import com.amiti.finance.controller.TransactionController.TransactionResponse;
import com.amiti.finance.dao.TransactionRepository;
import com.amiti.finance.entity.FinanceTransaction;
import com.amiti.finance.entity.enums.TransactionType;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class DashboardServiceImpl implements DashboardService {
    private final CurrentUserService currentUserService;
    private final TransactionRepository transactionRepository;
    private final BudgetService budgetService;
    private final RecurringService recurringService;
    private final GoalService goalService;

    public DashboardServiceImpl(CurrentUserService currentUserService, TransactionRepository transactionRepository, BudgetService budgetService, RecurringService recurringService, GoalService goalService) {
        this.currentUserService = currentUserService;
        this.transactionRepository = transactionRepository;
        this.budgetService = budgetService;
        this.recurringService = recurringService;
        this.goalService = goalService;
    }

    public DashboardResponse getDashboard() {
        var userId = currentUserService.requireUserId();
        LocalDate now = LocalDate.now();
        LocalDate monthStart = now.withDayOfMonth(1);
        LocalDate monthEnd = now.withDayOfMonth(now.lengthOfMonth());

        Specification<FinanceTransaction> specification = Specification
                .<FinanceTransaction>where((root, query, builder) -> builder.equal(root.get("userId"), userId))
                .and((root, query, builder) -> builder.between(root.get("transactionDate"), monthStart, monthEnd));
        List<FinanceTransaction> monthTransactions = transactionRepository.findAll(specification);

        BigDecimal income = sumByType(monthTransactions, TransactionType.INCOME);
        BigDecimal expense = sumByType(monthTransactions, TransactionType.EXPENSE);
        List<CategorySpend> categorySpending = monthTransactions.stream()
                .filter(transaction -> transaction.getType() == TransactionType.EXPENSE && transaction.getCategoryId() != null)
                .collect(Collectors.groupingBy(FinanceTransaction::getCategoryId,
                        Collectors.mapping(FinanceTransaction::getAmount,
                                Collectors.reducing(BigDecimal.ZERO, BigDecimal::add))))
                .entrySet()
                .stream()
                .map(entry -> new CategorySpend(entry.getKey(), entry.getValue()))
                .sorted(Comparator.comparing(CategorySpend::amount).reversed())
                .toList();

        List<TransactionResponse> recentTransactions = monthTransactions.stream()
                .sorted(Comparator.comparing(FinanceTransaction::getTransactionDate).reversed())
                .limit(5)
                .map(transaction -> new TransactionResponse(
                        transaction.getId(),
                        transaction.getType(),
                        transaction.getAmount(),
                        transaction.getTransactionDate(),
                        transaction.getAccountId(),
                        transaction.getCategoryId(),
                        transaction.getDestinationAccountId(),
                        transaction.getMerchant(),
                        transaction.getNote(),
                        transaction.getPaymentMethod(),
                        transaction.getRecurringTransactionId(),
                        detachedTags(transaction)
                ))
                .toList();

        var upcomingRecurring = recurringService.list().stream()
                .filter(item -> item.status() == RecurringStatus.ACTIVE)
                .sorted(Comparator.comparing(item -> item.nextRunDate()))
                .limit(5)
                .toList();

        return new DashboardResponse(
                income,
                expense,
                income.subtract(expense),
                budgetService.list(now.getMonthValue(), now.getYear()),
                categorySpending,
                recentTransactions,
                upcomingRecurring,
                goalService.list().stream().limit(5).toList()
        );
    }

    private List<String> detachedTags(FinanceTransaction transaction) {
        List<String> tags = transaction.getTags();
        return tags == null ? List.of() : tags.stream().toList();
    }

    private BigDecimal sumByType(List<FinanceTransaction> transactions, TransactionType type) {
        return transactions.stream()
                .filter(transaction -> transaction.getType() == type)
                .map(FinanceTransaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
