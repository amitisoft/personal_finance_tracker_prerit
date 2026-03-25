package com.amiti.finance.service.impl;
import com.amiti.finance.service.CategoryService;

import com.amiti.finance.controller.CategoryController.CategoryRequest;
import com.amiti.finance.controller.CategoryController.CategoryResponse;
import com.amiti.finance.dao.CategoryRepository;
import com.amiti.finance.entity.Category;
import com.amiti.finance.entity.enums.CategoryType;
import com.amiti.finance.common.exception.BadRequestException;
import com.amiti.finance.common.exception.NotFoundException;
import com.amiti.finance.security.CurrentUserService;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class CategoryServiceImpl implements CategoryService {
    private final CategoryRepository categoryRepository;
    private final CurrentUserService currentUserService;

    public CategoryServiceImpl(CategoryRepository categoryRepository, CurrentUserService currentUserService) {
        this.categoryRepository = categoryRepository;
        this.currentUserService = currentUserService;
    }

    public List<CategoryResponse> list() {
        UUID userId = currentUserService.requireUserId();
        return categoryRepository.findByUserIdOrUserIdIsNullOrderByTypeAscNameAsc(userId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public CategoryResponse create(CategoryRequest request) {
        Category category = new Category();
        category.setUserId(currentUserService.requireUserId());
        category.setName(request.name().trim());
        category.setType(request.type());
        category.setColor(blankToNull(request.color()));
        category.setIcon(blankToNull(request.icon()));
        category.setArchived(false);
        categoryRepository.save(category);
        return toResponse(category);
    }

    public CategoryResponse update(UUID id, CategoryRequest request) {
        Category category = ownedCategory(id);
        category.setName(request.name().trim());
        category.setType(request.type());
        category.setColor(blankToNull(request.color()));
        category.setIcon(blankToNull(request.icon()));
        return toResponse(category);
    }

    public void archive(UUID id) {
        Category category = ownedCategory(id);
        category.setArchived(true);
    }

    public Category requireAccessibleCategory(UUID userId, UUID categoryId) {
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new NotFoundException("Category not found"));
        if (category.getUserId() != null && !category.getUserId().equals(userId)) {
            throw new NotFoundException("Category not found");
        }
        if (category.isArchived()) {
            throw new BadRequestException("Category is archived");
        }
        return category;
    }

    private Category ownedCategory(UUID id) {
        return categoryRepository.findByIdAndUserId(id, currentUserService.requireUserId())
                .orElseThrow(() -> new NotFoundException("Category not found"));
    }

    private CategoryResponse toResponse(Category category) {
        return new CategoryResponse(
                category.getId(),
                category.getName(),
                category.getType(),
                category.getColor(),
                category.getIcon(),
                category.isArchived(),
                category.getUserId() == null
        );
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
