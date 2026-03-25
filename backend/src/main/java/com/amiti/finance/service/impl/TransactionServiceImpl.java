package com.amiti.finance.service.impl;
import com.amiti.finance.service.TransactionService;

import com.amiti.finance.entity.Account;
import com.amiti.finance.service.AccountService;
import com.amiti.finance.entity.Category;
import com.amiti.finance.entity.enums.CategoryType;
import com.amiti.finance.service.CategoryService;
import com.amiti.finance.common.exception.BadRequestException;
import com.amiti.finance.common.exception.NotFoundException;
import com.amiti.finance.common.model.PageResponse;
import com.amiti.finance.security.CurrentUserService;
import com.amiti.finance.controller.TransactionController.TransactionFilter;
import com.amiti.finance.controller.TransactionController.TransactionRequest;
import com.amiti.finance.controller.TransactionController.TransactionResponse;
import com.amiti.finance.dao.TransactionRepository;
import com.amiti.finance.entity.FinanceTransaction;
import com.amiti.finance.entity.enums.TransactionType;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class TransactionServiceImpl implements TransactionService {
    private final TransactionRepository transactionRepository;
    private final CurrentUserService currentUserService;
    private final AccountService accountService;
    private final CategoryService categoryService;

    public TransactionServiceImpl(TransactionRepository transactionRepository, CurrentUserService currentUserService, AccountService accountService, CategoryService categoryService) {
        this.transactionRepository = transactionRepository;
        this.currentUserService = currentUserService;
        this.accountService = accountService;
        this.categoryService = categoryService;
    }

    public PageResponse<TransactionResponse> list(TransactionFilter filter, int page, int size) {
        UUID userId = currentUserService.requireUserId();
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100));
        Specification<FinanceTransaction> specification = Specification
                .where(byUser(userId))
                .and(dateFrom(filter.dateFrom()))
                .and(dateTo(filter.dateTo()))
                .and(accountId(filter.accountId()))
                .and(categoryId(filter.categoryId()))
                .and(type(filter.type()))
                .and(search(filter.search()));
        Page<TransactionResponse> result = transactionRepository.findAll(specification, pageable).map(this::toResponse);
        return PageResponse.from(result);
    }

    public TransactionResponse get(UUID id) {
        return toResponse(ownedTransaction(id));
    }

    public TransactionResponse create(TransactionRequest request) {
        UUID userId = currentUserService.requireUserId();
        FinanceTransaction transaction = new FinanceTransaction();
        transaction.setUserId(userId);
        applyRequest(transaction, request, userId);
        transactionRepository.save(transaction);
        return toResponse(transaction);
    }

    public TransactionResponse update(UUID id, TransactionRequest request) {
        UUID userId = currentUserService.requireUserId();
        FinanceTransaction transaction = ownedTransaction(id);
        rollbackEffect(transaction, userId);
        applyRequest(transaction, request, userId);
        return toResponse(transaction);
    }

    public void delete(UUID id) {
        UUID userId = currentUserService.requireUserId();
        FinanceTransaction transaction = ownedTransaction(id);
        rollbackEffect(transaction, userId);
        transactionRepository.delete(transaction);
    }

    public FinanceTransaction createRecurringTransaction(UUID userId, TransactionRequest request) {
        FinanceTransaction transaction = new FinanceTransaction();
        transaction.setUserId(userId);
        applyRequest(transaction, request, userId);
        return transactionRepository.save(transaction);
    }

    private void applyRequest(FinanceTransaction transaction, TransactionRequest request, UUID userId) {
        if (request.amount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Transaction amount must be positive");
        }
        Account account = accountService.requireOwnedAccount(userId, request.accountId());
        transaction.setAccountId(account.getId());
        transaction.setAmount(request.amount());
        transaction.setTransactionDate(request.date());
        transaction.setType(request.type());
        transaction.setMerchant(blankToNull(request.merchant()));
        transaction.setNote(blankToNull(request.note()));
        transaction.setPaymentMethod(blankToNull(request.paymentMethod()));
        transaction.setRecurringTransactionId(request.recurringTransactionId());
        transaction.setTags(request.tags() == null ? List.of() : request.tags().stream().filter(tag -> tag != null && !tag.isBlank()).map(String::trim).toList());

        switch (request.type()) {
            case EXPENSE -> {
                if (request.categoryId() == null) {
                    throw new BadRequestException("Expense category is required");
                }
                Category category = categoryService.requireAccessibleCategory(userId, request.categoryId());
                if (category.getType() != CategoryType.EXPENSE) {
                    throw new BadRequestException("Expense transactions require an expense category");
                }
                transaction.setCategoryId(category.getId());
                transaction.setDestinationAccountId(null);
                account.setCurrentBalance(account.getCurrentBalance().subtract(request.amount()));
            }
            case INCOME -> {
                if (request.categoryId() == null) {
                    throw new BadRequestException("Income category is required");
                }
                Category category = categoryService.requireAccessibleCategory(userId, request.categoryId());
                if (category.getType() != CategoryType.INCOME) {
                    throw new BadRequestException("Income transactions require an income category");
                }
                transaction.setCategoryId(category.getId());
                transaction.setDestinationAccountId(null);
                account.setCurrentBalance(account.getCurrentBalance().add(request.amount()));
            }
            case TRANSFER -> {
                if (request.destinationAccountId() == null) {
                    throw new BadRequestException("Transfer destination account is required");
                }
                if (request.destinationAccountId().equals(request.accountId())) {
                    throw new BadRequestException("Transfer accounts must be different");
                }
                Account destination = accountService.requireOwnedAccount(userId, request.destinationAccountId());
                if (account.getCurrentBalance().compareTo(request.amount()) < 0) {
                    throw new BadRequestException("Insufficient balance for transfer");
                }
                transaction.setCategoryId(null);
                transaction.setDestinationAccountId(destination.getId());
                account.setCurrentBalance(account.getCurrentBalance().subtract(request.amount()));
                destination.setCurrentBalance(destination.getCurrentBalance().add(request.amount()));
            }
        }
    }

    private void rollbackEffect(FinanceTransaction transaction, UUID userId) {
        Account source = accountService.requireOwnedAccount(userId, transaction.getAccountId());
        switch (transaction.getType()) {
            case EXPENSE -> source.setCurrentBalance(source.getCurrentBalance().add(transaction.getAmount()));
            case INCOME -> source.setCurrentBalance(source.getCurrentBalance().subtract(transaction.getAmount()));
            case TRANSFER -> {
                Account destination = accountService.requireOwnedAccount(userId, transaction.getDestinationAccountId());
                source.setCurrentBalance(source.getCurrentBalance().add(transaction.getAmount()));
                destination.setCurrentBalance(destination.getCurrentBalance().subtract(transaction.getAmount()));
            }
        }
    }

    private FinanceTransaction ownedTransaction(UUID id) {
        FinanceTransaction transaction = transactionRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Transaction not found"));
        if (!transaction.getUserId().equals(currentUserService.requireUserId())) {
            throw new NotFoundException("Transaction not found");
        }
        return transaction;
    }

    private TransactionResponse toResponse(FinanceTransaction transaction) {
        return new TransactionResponse(
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
        );
    }

    private List<String> detachedTags(FinanceTransaction transaction) {
        List<String> tags = transaction.getTags();
        return tags == null ? List.of() : tags.stream().toList();
    }

    private Specification<FinanceTransaction> byUser(UUID userId) {
        return (root, query, builder) -> builder.equal(root.get("userId"), userId);
    }

    private Specification<FinanceTransaction> dateFrom(LocalDate value) {
        return value == null ? null : (root, query, builder) -> builder.greaterThanOrEqualTo(root.get("transactionDate"), value);
    }

    private Specification<FinanceTransaction> dateTo(LocalDate value) {
        return value == null ? null : (root, query, builder) -> builder.lessThanOrEqualTo(root.get("transactionDate"), value);
    }

    private Specification<FinanceTransaction> accountId(UUID value) {
        return value == null ? null : (root, query, builder) -> builder.equal(root.get("accountId"), value);
    }

    private Specification<FinanceTransaction> categoryId(UUID value) {
        return value == null ? null : (root, query, builder) -> builder.equal(root.get("categoryId"), value);
    }

    private Specification<FinanceTransaction> type(TransactionType value) {
        return value == null ? null : (root, query, builder) -> builder.equal(root.get("type"), value);
    }

    private Specification<FinanceTransaction> search(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String pattern = "%" + value.trim().toLowerCase() + "%";
        return (root, query, builder) -> builder.or(
                builder.like(builder.lower(root.get("merchant")), pattern),
                builder.like(builder.lower(root.get("note")), pattern)
        );
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
