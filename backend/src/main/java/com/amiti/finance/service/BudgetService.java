package com.amiti.finance.service;

import com.amiti.finance.controller.BudgetController.BudgetRequest;
import com.amiti.finance.controller.BudgetController.BudgetResponse;

import java.util.List;
import java.util.UUID;

public interface BudgetService {
    List<BudgetResponse> list(int month, int year);

    BudgetResponse create(BudgetRequest request);

    BudgetResponse update(UUID id, BudgetRequest request);

    void delete(UUID id);
}
