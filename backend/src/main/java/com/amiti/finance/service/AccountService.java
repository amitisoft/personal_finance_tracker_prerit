package com.amiti.finance.service;

import com.amiti.finance.controller.AccountController.AccountRequest;
import com.amiti.finance.controller.AccountController.AccountResponse;
import com.amiti.finance.controller.AccountController.TransferRequest;
import com.amiti.finance.entity.Account;

import java.util.List;
import java.util.UUID;

public interface AccountService {
    List<AccountResponse> list();

    AccountResponse create(AccountRequest request);

    AccountResponse update(UUID id, AccountRequest request);

    AccountResponse transfer(TransferRequest request);

    Account requireOwnedAccount(UUID userId, UUID id);
}
