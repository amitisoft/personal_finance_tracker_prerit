package com.amiti.finance.service;

import com.amiti.finance.controller.GoalController.GoalAdjustmentRequest;
import com.amiti.finance.controller.GoalController.GoalRequest;
import com.amiti.finance.controller.GoalController.GoalResponse;

import java.util.List;
import java.util.UUID;

public interface GoalService {
    List<GoalResponse> list();

    GoalResponse create(GoalRequest request);

    GoalResponse update(UUID id, GoalRequest request);

    GoalResponse contribute(UUID id, GoalAdjustmentRequest request);

    GoalResponse withdraw(UUID id, GoalAdjustmentRequest request);
}
