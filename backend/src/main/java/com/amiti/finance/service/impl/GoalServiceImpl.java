package com.amiti.finance.service.impl;
import com.amiti.finance.service.GoalService;

import com.amiti.finance.entity.Account;
import com.amiti.finance.service.AccountService;
import com.amiti.finance.common.exception.BadRequestException;
import com.amiti.finance.common.exception.NotFoundException;
import com.amiti.finance.controller.GoalController.GoalAdjustmentRequest;
import com.amiti.finance.controller.GoalController.GoalRequest;
import com.amiti.finance.controller.GoalController.GoalResponse;
import com.amiti.finance.dao.GoalEntryRepository;
import com.amiti.finance.dao.GoalRepository;
import com.amiti.finance.entity.Goal;
import com.amiti.finance.entity.GoalEntry;
import com.amiti.finance.entity.enums.GoalEntryType;
import com.amiti.finance.entity.enums.GoalStatus;
import com.amiti.finance.security.CurrentUserService;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class GoalServiceImpl implements GoalService {
    private final GoalRepository goalRepository;
    private final GoalEntryRepository goalEntryRepository;
    private final CurrentUserService currentUserService;
    private final AccountService accountService;

    public GoalServiceImpl(GoalRepository goalRepository, GoalEntryRepository goalEntryRepository, CurrentUserService currentUserService, AccountService accountService) {
        this.goalRepository = goalRepository;
        this.goalEntryRepository = goalEntryRepository;
        this.currentUserService = currentUserService;
        this.accountService = accountService;
    }

    public List<GoalResponse> list() {
        return goalRepository.findAllByUserIdOrderByCreatedAtDesc(currentUserService.requireUserId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public GoalResponse create(GoalRequest request) {
        Goal goal = new Goal();
        goal.setUserId(currentUserService.requireUserId());
        goal.setName(request.name().trim());
        goal.setTargetAmount(request.targetAmount());
        goal.setTargetDate(request.targetDate());
        goal.setLinkedAccountId(request.linkedAccountId());
        goal.setIcon(blankToNull(request.icon()));
        goal.setColor(blankToNull(request.color()));
        if (request.linkedAccountId() != null) {
            accountService.requireOwnedAccount(goal.getUserId(), request.linkedAccountId());
        }
        goalRepository.save(goal);
        return toResponse(goal);
    }

    public GoalResponse update(UUID id, GoalRequest request) {
        Goal goal = ownedGoal(id);
        if (request.linkedAccountId() != null) {
            accountService.requireOwnedAccount(goal.getUserId(), request.linkedAccountId());
        }
        goal.setName(request.name().trim());
        goal.setTargetAmount(request.targetAmount());
        goal.setTargetDate(request.targetDate());
        goal.setLinkedAccountId(request.linkedAccountId());
        goal.setIcon(blankToNull(request.icon()));
        goal.setColor(blankToNull(request.color()));
        goal.setStatus(goal.getCurrentAmount().compareTo(goal.getTargetAmount()) >= 0 ? GoalStatus.COMPLETED : GoalStatus.ACTIVE);
        return toResponse(goal);
    }

    public GoalResponse contribute(UUID id, GoalAdjustmentRequest request) {
        Goal goal = ownedGoal(id);
        if (request.accountId() != null) {
            Account account = accountService.requireOwnedAccount(goal.getUserId(), request.accountId());
            if (account.getCurrentBalance().compareTo(request.amount()) < 0) {
                throw new BadRequestException("Insufficient account balance for contribution");
            }
            account.setCurrentBalance(account.getCurrentBalance().subtract(request.amount()));
        }
        goal.setCurrentAmount(goal.getCurrentAmount().add(request.amount()));
        goal.setStatus(goal.getCurrentAmount().compareTo(goal.getTargetAmount()) >= 0 ? GoalStatus.COMPLETED : GoalStatus.ACTIVE);
        addEntry(goal, GoalEntryType.CONTRIBUTION, request);
        return toResponse(goal);
    }

    public GoalResponse withdraw(UUID id, GoalAdjustmentRequest request) {
        Goal goal = ownedGoal(id);
        if (goal.getCurrentAmount().compareTo(request.amount()) < 0) {
            throw new BadRequestException("Cannot withdraw more than current goal balance");
        }
        if (request.accountId() != null) {
            Account account = accountService.requireOwnedAccount(goal.getUserId(), request.accountId());
            account.setCurrentBalance(account.getCurrentBalance().add(request.amount()));
        }
        goal.setCurrentAmount(goal.getCurrentAmount().subtract(request.amount()));
        goal.setStatus(goal.getCurrentAmount().compareTo(goal.getTargetAmount()) >= 0 ? GoalStatus.COMPLETED : GoalStatus.ACTIVE);
        addEntry(goal, GoalEntryType.WITHDRAWAL, request);
        return toResponse(goal);
    }

    private void addEntry(Goal goal, GoalEntryType type, GoalAdjustmentRequest request) {
        GoalEntry entry = new GoalEntry();
        entry.setGoalId(goal.getId());
        entry.setUserId(goal.getUserId());
        entry.setType(type);
        entry.setAmount(request.amount());
        entry.setAccountId(request.accountId());
        goalEntryRepository.save(entry);
    }

    private Goal ownedGoal(UUID id) {
        Goal goal = goalRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Goal not found"));
        if (!goal.getUserId().equals(currentUserService.requireUserId())) {
            throw new NotFoundException("Goal not found");
        }
        return goal;
    }

    private GoalResponse toResponse(Goal goal) {
        int progress = goal.getTargetAmount().compareTo(BigDecimal.ZERO) == 0
                ? 0
                : goal.getCurrentAmount().multiply(BigDecimal.valueOf(100)).divide(goal.getTargetAmount(), 0, RoundingMode.HALF_UP).intValue();
        return new GoalResponse(
                goal.getId(),
                goal.getName(),
                goal.getTargetAmount(),
                goal.getCurrentAmount(),
                goal.getTargetDate(),
                goal.getLinkedAccountId(),
                goal.getIcon(),
                goal.getColor(),
                goal.getStatus(),
                progress
        );
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
