package com.amiti.finance.service.impl;
import com.amiti.finance.service.RecurringService;

import com.amiti.finance.service.AccountService;
import com.amiti.finance.service.CategoryService;
import com.amiti.finance.common.exception.NotFoundException;
import com.amiti.finance.controller.RecurringController.RecurringRequest;
import com.amiti.finance.controller.RecurringController.RecurringResponse;
import com.amiti.finance.dao.RecurringRepository;
import com.amiti.finance.entity.enums.RecurringFrequency;
import com.amiti.finance.entity.enums.RecurringStatus;
import com.amiti.finance.entity.RecurringTransaction;
import com.amiti.finance.security.CurrentUserService;
import com.amiti.finance.controller.TransactionController.TransactionRequest;
import com.amiti.finance.entity.FinanceTransaction;
import com.amiti.finance.service.TransactionService;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class RecurringServiceImpl implements RecurringService {
    private static final Logger log = LoggerFactory.getLogger(RecurringServiceImpl.class);

    private final RecurringRepository recurringRepository;
    private final CurrentUserService currentUserService;
    private final AccountService accountService;
    private final CategoryService categoryService;
    private final TransactionService transactionService;

    public RecurringServiceImpl(RecurringRepository recurringRepository, CurrentUserService currentUserService, AccountService accountService, CategoryService categoryService, TransactionService transactionService) {
        this.recurringRepository = recurringRepository;
        this.currentUserService = currentUserService;
        this.accountService = accountService;
        this.categoryService = categoryService;
        this.transactionService = transactionService;
    }

    public List<RecurringResponse> list() {
        return recurringRepository.findAllByUserIdOrderByNextRunDateAsc(currentUserService.requireUserId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public RecurringResponse create(RecurringRequest request) {
        RecurringTransaction recurring = new RecurringTransaction();
        recurring.setUserId(currentUserService.requireUserId());
        applyRequest(recurring, request);
        recurringRepository.save(recurring);
        return toResponse(recurring);
    }

    public RecurringResponse update(UUID id, RecurringRequest request) {
        RecurringTransaction recurring = ownedRecurring(id);
        applyRequest(recurring, request);
        return toResponse(recurring);
    }

    public void delete(UUID id) {
        recurringRepository.delete(ownedRecurring(id));
    }

    @Scheduled(cron = "${app.recurring.cron}")
    public void processDueRecurringTransactions() {
        LocalDate today = LocalDate.now();
        recurringRepository.findAllByStatusAndAutoCreateTransactionTrueAndNextRunDateLessThanEqual(RecurringStatus.ACTIVE, today)
                .forEach(this::materializeTransaction);
    }

    private void materializeTransaction(RecurringTransaction recurring) {
        if (recurring.getEndDate() != null && recurring.getNextRunDate().isAfter(recurring.getEndDate())) {
            recurring.setStatus(RecurringStatus.PAUSED);
            return;
        }

        transactionService.createRecurringTransaction(recurring.getUserId(), new TransactionRequest(
                recurring.getType(),
                recurring.getAmount(),
                recurring.getNextRunDate(),
                recurring.getAccountId(),
                recurring.getCategoryId(),
                null,
                recurring.getTitle(),
                "Generated from recurring transaction",
                null,
                recurring.getId(),
                List.of("recurring")
        ));
        recurring.setNextRunDate(nextRunDate(recurring.getNextRunDate(), recurring.getFrequency()));
        if (recurring.getEndDate() != null && recurring.getNextRunDate().isAfter(recurring.getEndDate())) {
            recurring.setStatus(RecurringStatus.PAUSED);
        }
        log.info("Generated recurring transaction for {}", recurring.getId());
    }

    private void applyRequest(RecurringTransaction recurring, RecurringRequest request) {
        UUID userId = recurring.getUserId();
        accountService.requireOwnedAccount(userId, request.accountId());
        if (request.categoryId() != null) {
            categoryService.requireAccessibleCategory(userId, request.categoryId());
        }
        recurring.setTitle(request.title().trim());
        recurring.setType(request.type());
        recurring.setAmount(request.amount());
        recurring.setCategoryId(request.categoryId());
        recurring.setAccountId(request.accountId());
        recurring.setFrequency(request.frequency());
        recurring.setStartDate(request.startDate());
        recurring.setEndDate(request.endDate());
        recurring.setAutoCreateTransaction(request.autoCreateTransaction());
        recurring.setStatus(request.status() == null ? RecurringStatus.ACTIVE : request.status());
        recurring.setNextRunDate(recurring.getNextRunDate() == null ? request.startDate() : recurring.getNextRunDate());
        if (recurring.getNextRunDate().isBefore(request.startDate())) {
            recurring.setNextRunDate(request.startDate());
        }
    }

    private LocalDate nextRunDate(LocalDate current, RecurringFrequency frequency) {
        return switch (frequency) {
            case DAILY -> current.plusDays(1);
            case WEEKLY -> current.plusWeeks(1);
            case MONTHLY -> current.plusMonths(1);
            case YEARLY -> current.plusYears(1);
        };
    }

    private RecurringTransaction ownedRecurring(UUID id) {
        RecurringTransaction recurring = recurringRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Recurring transaction not found"));
        if (!recurring.getUserId().equals(currentUserService.requireUserId())) {
            throw new NotFoundException("Recurring transaction not found");
        }
        return recurring;
    }

    private RecurringResponse toResponse(RecurringTransaction recurring) {
        return new RecurringResponse(
                recurring.getId(),
                recurring.getTitle(),
                recurring.getType(),
                recurring.getAmount(),
                recurring.getCategoryId(),
                recurring.getAccountId(),
                recurring.getFrequency(),
                recurring.getStartDate(),
                recurring.getEndDate(),
                recurring.getNextRunDate(),
                recurring.isAutoCreateTransaction(),
                recurring.getStatus()
        );
    }
}
