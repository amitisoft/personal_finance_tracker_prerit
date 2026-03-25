package com.amiti.finance.service.impl;
import com.amiti.finance.service.BudgetService;

import com.amiti.finance.controller.BudgetController.BudgetRequest;
import com.amiti.finance.controller.BudgetController.BudgetResponse;
import com.amiti.finance.dao.BudgetRepository;
import com.amiti.finance.entity.Budget;
import com.amiti.finance.entity.Category;
import com.amiti.finance.entity.enums.CategoryType;
import com.amiti.finance.service.CategoryService;
import com.amiti.finance.common.exception.BadRequestException;
import com.amiti.finance.common.exception.NotFoundException;
import com.amiti.finance.security.CurrentUserService;
import com.amiti.finance.dao.TransactionRepository;
import com.amiti.finance.entity.FinanceTransaction;
import com.amiti.finance.entity.enums.TransactionType;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class BudgetServiceImpl implements BudgetService {
    private final BudgetRepository budgetRepository;
    private final CategoryService categoryService;
    private final CurrentUserService currentUserService;
    private final TransactionRepository transactionRepository;

    public BudgetServiceImpl(BudgetRepository budgetRepository, CategoryService categoryService, CurrentUserService currentUserService, TransactionRepository transactionRepository) {
        this.budgetRepository = budgetRepository;
        this.categoryService = categoryService;
        this.currentUserService = currentUserService;
        this.transactionRepository = transactionRepository;
    }

    public List<BudgetResponse> list(int month, int year) {
        UUID userId = currentUserService.requireUserId();
        return budgetRepository.findAllByUserIdAndMonthAndYearOrderByCreatedAtAsc(userId, month, year)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public BudgetResponse create(BudgetRequest request) {
        UUID userId = currentUserService.requireUserId();
        Category category = categoryService.requireAccessibleCategory(userId, request.categoryId());
        if (category.getType() != CategoryType.EXPENSE) {
            throw new BadRequestException("Budgets can only be created for expense categories");
        }
        if (budgetRepository.existsByUserIdAndCategoryIdAndMonthAndYear(userId, request.categoryId(), request.month(), request.year())) {
            throw new BadRequestException("Budget already exists for category and month");
        }
        Budget budget = new Budget();
        budget.setUserId(userId);
        budget.setCategoryId(request.categoryId());
        budget.setMonth(request.month());
        budget.setYear(request.year());
        budget.setAmount(request.amount());
        budget.setAlertThresholdPercent(request.alertThresholdPercent());
        budgetRepository.save(budget);
        return toResponse(budget);
    }

    public BudgetResponse update(UUID id, BudgetRequest request) {
        Budget budget = ownedBudget(id);
        Category category = categoryService.requireAccessibleCategory(budget.getUserId(), request.categoryId());
        if (category.getType() != CategoryType.EXPENSE) {
            throw new BadRequestException("Budgets can only be created for expense categories");
        }
        if (!budget.getCategoryId().equals(request.categoryId()) || budget.getMonth() != request.month() || budget.getYear() != request.year()) {
            boolean exists = budgetRepository.existsByUserIdAndCategoryIdAndMonthAndYear(budget.getUserId(), request.categoryId(), request.month(), request.year());
            if (exists) {
                throw new BadRequestException("Budget already exists for category and month");
            }
        }
        budget.setCategoryId(request.categoryId());
        budget.setMonth(request.month());
        budget.setYear(request.year());
        budget.setAmount(request.amount());
        budget.setAlertThresholdPercent(request.alertThresholdPercent());
        return toResponse(budget);
    }

    public void delete(UUID id) {
        budgetRepository.delete(ownedBudget(id));
    }

    private Budget ownedBudget(UUID id) {
        Budget budget = budgetRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Budget not found"));
        if (!budget.getUserId().equals(currentUserService.requireUserId())) {
            throw new NotFoundException("Budget not found");
        }
        return budget;
    }

    private BudgetResponse toResponse(Budget budget) {
        BigDecimal spent = actualSpent(budget);
        int percentage = budget.getAmount().compareTo(BigDecimal.ZERO) == 0
                ? 0
                : spent.multiply(BigDecimal.valueOf(100)).divide(budget.getAmount(), 0, RoundingMode.HALF_UP).intValue();
        String alertState = percentage >= 120 ? "CRITICAL" : percentage >= 100 ? "EXCEEDED" : percentage >= budget.getAlertThresholdPercent() ? "WARNING" : "HEALTHY";
        return new BudgetResponse(
                budget.getId(),
                budget.getCategoryId(),
                budget.getMonth(),
                budget.getYear(),
                budget.getAmount(),
                spent,
                percentage,
                alertState
        );
    }

    private BigDecimal actualSpent(Budget budget) {
        LocalDate start = LocalDate.of(budget.getYear(), budget.getMonth(), 1);
        LocalDate end = start.withDayOfMonth(start.lengthOfMonth());
        Specification<FinanceTransaction> specification = Specification
                .<FinanceTransaction>where((root, query, builder) -> builder.equal(root.get("userId"), budget.getUserId()))
                .and((root, query, builder) -> builder.equal(root.get("type"), TransactionType.EXPENSE))
                .and((root, query, builder) -> builder.equal(root.get("categoryId"), budget.getCategoryId()))
                .and((root, query, builder) -> builder.between(root.get("transactionDate"), start, end));
        return transactionRepository.findAll(specification)
                .stream()
                .map(FinanceTransaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
