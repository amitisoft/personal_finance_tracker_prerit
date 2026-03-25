package com.amiti.finance.service.impl;
import com.amiti.finance.service.AccountService;

import com.amiti.finance.controller.AccountController.AccountRequest;
import com.amiti.finance.controller.AccountController.AccountResponse;
import com.amiti.finance.controller.AccountController.TransferRequest;
import com.amiti.finance.dao.AccountRepository;
import com.amiti.finance.entity.Account;
import com.amiti.finance.common.exception.BadRequestException;
import com.amiti.finance.common.exception.NotFoundException;
import com.amiti.finance.security.CurrentUserService;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class AccountServiceImpl implements AccountService {
    private final AccountRepository accountRepository;
    private final CurrentUserService currentUserService;

    public AccountServiceImpl(AccountRepository accountRepository, CurrentUserService currentUserService) {
        this.accountRepository = accountRepository;
        this.currentUserService = currentUserService;
    }

    public List<AccountResponse> list() {
        return accountRepository.findAllByUserIdOrderByName(currentUserService.requireUserId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public AccountResponse create(AccountRequest request) {
        Account account = new Account();
        account.setUserId(currentUserService.requireUserId());
        account.setName(request.name().trim());
        account.setType(request.type());
        account.setOpeningBalance(request.openingBalance());
        account.setCurrentBalance(request.openingBalance());
        account.setInstitutionName(blankToNull(request.institutionName()));
        account.setLastUpdatedAt(Instant.now());
        accountRepository.save(account);
        return toResponse(account);
    }

    public AccountResponse update(UUID id, AccountRequest request) {
        Account account = ownedAccount(id);
        BigDecimal delta = request.openingBalance().subtract(account.getOpeningBalance());
        account.setName(request.name().trim());
        account.setType(request.type());
        account.setInstitutionName(blankToNull(request.institutionName()));
        account.setOpeningBalance(request.openingBalance());
        account.setCurrentBalance(account.getCurrentBalance().add(delta));
        account.setLastUpdatedAt(Instant.now());
        return toResponse(account);
    }

    public AccountResponse transfer(TransferRequest request) {
        if (request.fromAccountId().equals(request.toAccountId())) {
            throw new BadRequestException("Transfer accounts must be different");
        }
        Account from = ownedAccount(request.fromAccountId());
        Account to = ownedAccount(request.toAccountId());
        if (from.getCurrentBalance().compareTo(request.amount()) < 0) {
            throw new BadRequestException("Insufficient balance for transfer");
        }
        from.setCurrentBalance(from.getCurrentBalance().subtract(request.amount()));
        to.setCurrentBalance(to.getCurrentBalance().add(request.amount()));
        from.setLastUpdatedAt(Instant.now());
        to.setLastUpdatedAt(Instant.now());
        return toResponse(from);
    }

    public Account ownedAccount(UUID id) {
        Account account = accountRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Account not found"));
        if (!account.getUserId().equals(currentUserService.requireUserId())) {
            throw new NotFoundException("Account not found");
        }
        return account;
    }

    public Account requireOwnedAccount(UUID userId, UUID id) {
        Account account = accountRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Account not found"));
        if (!account.getUserId().equals(userId)) {
            throw new NotFoundException("Account not found");
        }
        return account;
    }

    private AccountResponse toResponse(Account account) {
        return new AccountResponse(
                account.getId(),
                account.getName(),
                account.getType(),
                account.getOpeningBalance(),
                account.getCurrentBalance(),
                account.getInstitutionName()
        );
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
