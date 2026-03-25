package com.amiti.finance.service;

import com.amiti.finance.common.model.PageResponse;
import com.amiti.finance.controller.TransactionController.TransactionFilter;
import com.amiti.finance.controller.TransactionController.TransactionRequest;
import com.amiti.finance.controller.TransactionController.TransactionResponse;
import com.amiti.finance.entity.FinanceTransaction;

import java.util.UUID;

public interface TransactionService {
    PageResponse<TransactionResponse> list(TransactionFilter filter, int page, int size);

    TransactionResponse get(UUID id);

    TransactionResponse create(TransactionRequest request);

    TransactionResponse update(UUID id, TransactionRequest request);

    void delete(UUID id);

    FinanceTransaction createRecurringTransaction(UUID userId, TransactionRequest request);
}
