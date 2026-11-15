"use strict";

const PRODUCT_CATALOG = [
    { id: "country-sourdough", name: "Country Sourdough" },
    { id: "honey-wheat", name: "Honey Wheat" },
    { id: "rosemary-focaccia", name: "Rosemary Focaccia" },
    { id: "butter-croissant", name: "Butter Croissant" },
    { id: "cinnamon-roll", name: "Cinnamon Roll" },
    { id: "fruit-danish", name: "Fruit Danish" },
    { id: "celebration-cake", name: "Celebration Cake" },
    { id: "event-cake", name: "Event Cake" },
    { id: "small-cake", name: "Small Cake" }
];

const VALIDATED_FIELDS = [
    "customer-name",
    "customer-email",
    "pickup-date",
    "request-type",
    "item-details"
];

const STORAGE_KEYS = {
    order: "northStarPreOrder",
    draft: "northStarContactDraft"
};

function readStoredJson(key, fallback) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
    } catch (error) {
        return fallback;
    }
}

function saveStoredJson(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        return false;
    }
}

function addOrderItem(items, productId, quantity) {
    const product = PRODUCT_CATALOG.find((item) => item.id === productId);
    const safeQuantity = Number(quantity);

    if (!product || !Number.isInteger(safeQuantity) || safeQuantity < 1 || safeQuantity > 12) {
        return items.slice();
    }

    const existing = items.find((item) => item.id === productId);
    if (existing) {
        return items.map((item) => item.id === productId
            ? { ...item, quantity: Math.min(12, item.quantity + safeQuantity) }
            : item);
    }

    return [...items, { id: product.id, name: product.name, quantity: safeQuantity }];
}

function formatOrderDetails(items) {
    return items.map((item) => `${item.quantity} x ${item.name}`).join("\n");
}

function validateFormValues(values, today = new Date()) {
    const errors = {};
    const name = values.name.trim();
    const email = values.email.trim();
    const details = values.details.trim();

    if (name.length < 2) {
        errors["customer-name"] = "Enter a name with at least 2 characters.";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors["customer-email"] = "Enter a valid email address, such as name@example.com.";
    }

    if (!values.pickupDate) {
        errors["pickup-date"] = "Choose a preferred pickup date.";
    } else {
        const selectedDate = new Date(`${values.pickupDate}T00:00:00`);
        const earliestDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2);
        if (Number.isNaN(selectedDate.getTime()) || selectedDate < earliestDate) {
            errors["pickup-date"] = "Choose a pickup date at least 2 days from today.";
        }
    }

    if (!values.requestType) {
        errors["request-type"] = "Choose pre-order or general question.";
    }

    if (details.length < 10) {
        errors["item-details"] = "Provide at least 10 characters of item details.";
    }

    return errors;
}

function initOrderBuilder() {
    const form = document.querySelector("#preorder-builder-form");
    if (!form) return;

    const select = document.querySelector("#product-select");
    const quantity = document.querySelector("#product-quantity");
    const list = document.querySelector("#saved-order-list");
    const emptyMessage = document.querySelector("#saved-order-empty");
    const count = document.querySelector("#saved-order-count");
    const status = document.querySelector("#builder-message");
    let orderItems = readStoredJson(STORAGE_KEYS.order, []);

    PRODUCT_CATALOG.forEach((product) => {
        const option = document.createElement("option");
        option.value = product.id;
        option.textContent = product.name;
        select.append(option);
    });

    function renderOrder() {
        list.replaceChildren();
        emptyMessage.hidden = orderItems.length > 0;

        orderItems.forEach((item) => {
            const row = document.createElement("li");
            const text = document.createElement("span");
            const removeButton = document.createElement("button");
            text.textContent = `${item.quantity} x ${item.name}`;
            removeButton.type = "button";
            removeButton.className = "remove-item";
            removeButton.dataset.productId = item.id;
            removeButton.textContent = "Remove";
            row.append(text, removeButton);
            list.append(row);
        });

        const total = orderItems.reduce((sum, item) => sum + item.quantity, 0);
        count.textContent = total ? `${total} item${total === 1 ? "" : "s"} saved for your request.` : "";
    }

    if (orderItems.length) {
        status.textContent = "Your saved pre-order list was restored from this browser.";
    }
    renderOrder();

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const updatedItems = addOrderItem(orderItems, select.value, Number(quantity.value));
        if (updatedItems.length === orderItems.length && !orderItems.some((item) => item.id === select.value)) {
            status.textContent = "Choose an item and a quantity from 1 to 12.";
            return;
        }
        orderItems = updatedItems;
        saveStoredJson(STORAGE_KEYS.order, orderItems);
        status.textContent = "Item added. Your list is saved in this browser.";
        select.value = "";
        quantity.value = "1";
        renderOrder();
    });

    list.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-product-id]");
        if (!button) return;
        orderItems = orderItems.filter((item) => item.id !== button.dataset.productId);
        saveStoredJson(STORAGE_KEYS.order, orderItems);
        status.textContent = "Item removed. Your saved list was updated.";
        renderOrder();
    });
}

function initRequestForm() {
    const form = document.querySelector("#request-form");
    if (!form) return;

    const storageMessage = document.querySelector("#storage-message");
    const result = document.querySelector("#form-result");
    const draft = readStoredJson(STORAGE_KEYS.draft, {});
    const savedOrder = readStoredJson(STORAGE_KEYS.order, []);

    function getValues() {
        return {
            name: form.elements["customer-name"].value,
            email: form.elements["customer-email"].value,
            pickupDate: form.elements["pickup-date"].value,
            requestType: form.elements["request-type"].value,
            details: form.elements["item-details"].value,
            allergyNotes: form.elements["allergy-notes"].value
        };
    }

    function restoreValues() {
        form.elements["customer-name"].value = draft.name || "";
        form.elements["customer-email"].value = draft.email || "";
        form.elements["pickup-date"].value = draft.pickupDate || "";
        form.elements["allergy-notes"].value = draft.allergyNotes || "";

        if (draft.requestType) {
            const requestType = form.querySelector(`[name="request-type"][value="${draft.requestType}"]`);
            if (requestType) requestType.checked = true;
        }

        if (draft.details) {
            form.elements["item-details"].value = draft.details;
            storageMessage.textContent = "Your saved form draft was restored from this browser.";
        } else if (savedOrder.length) {
            form.elements["item-details"].value = formatOrderDetails(savedOrder);
            form.querySelector("#pre-order").checked = true;
            storageMessage.textContent = "Your saved pre-order list was added to the form.";
        }
    }

    function showErrors(errors) {
        VALIDATED_FIELDS.forEach((fieldId) => {
            const errorElement = document.querySelector(`#${fieldId}-error`);
            const field = fieldId === "request-type"
                ? form.querySelector("fieldset")
                : document.querySelector(`#${fieldId}`);
            errorElement.textContent = errors[fieldId] || "";
            field.setAttribute("aria-invalid", errors[fieldId] ? "true" : "false");
        });
    }

    restoreValues();

    form.addEventListener("input", () => {
        saveStoredJson(STORAGE_KEYS.draft, getValues());
        result.textContent = "";
    });
    form.addEventListener("change", () => saveStoredJson(STORAGE_KEYS.draft, getValues()));

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const errors = validateFormValues(getValues());
        showErrors(errors);

        if (Object.keys(errors).length) {
            result.textContent = "Please correct the highlighted fields before sending your request.";
            const firstField = Object.keys(errors)[0];
            const target = firstField === "request-type"
                ? form.querySelector("[name='request-type']")
                : document.querySelector(`#${firstField}`);
            target.focus();
            return;
        }

        saveStoredJson(STORAGE_KEYS.draft, getValues());
        result.textContent = "Your request is ready. The demo keeps your information in this browser.";
    });
}

if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", () => {
        initOrderBuilder();
        initRequestForm();
    });
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { PRODUCT_CATALOG, addOrderItem, formatOrderDetails, validateFormValues };
}
