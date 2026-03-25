package com.amiti.finance.service;

import com.amiti.finance.controller.RecurringController.RecurringRequest;
import com.amiti.finance.controller.RecurringController.RecurringResponse;

import java.util.List;
import java.util.UUID;

public interface RecurringService {
    List<RecurringResponse> list();

    RecurringResponse create(RecurringRequest request);

    RecurringResponse update(UUID id, RecurringRequest request);

    void delete(UUID id);

    void processDueRecurringTransactions();
}
