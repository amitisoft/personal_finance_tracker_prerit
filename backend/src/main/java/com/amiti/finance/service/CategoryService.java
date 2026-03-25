package com.amiti.finance.service;

import com.amiti.finance.controller.CategoryController.CategoryRequest;
import com.amiti.finance.controller.CategoryController.CategoryResponse;
import com.amiti.finance.entity.Category;

import java.util.List;
import java.util.UUID;

public interface CategoryService {
    List<CategoryResponse> list();

    CategoryResponse create(CategoryRequest request);

    CategoryResponse update(UUID id, CategoryRequest request);

    void archive(UUID id);

    Category requireAccessibleCategory(UUID userId, UUID categoryId);
}
