"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { addOrderItem, formatOrderDetails, validateFormValues } = require("../app.js");

test("adds a valid bakery item and combines duplicate quantities", () => {
    const first = addOrderItem([], "country-sourdough", 2);
    const second = addOrderItem(first, "country-sourdough", 3);
    assert.deepEqual(second, [{ id: "country-sourdough", name: "Country Sourdough", quantity: 5 }]);
});

test("rejects invalid products and quantities", () => {
    assert.deepEqual(addOrderItem([], "unknown", 1), []);
    assert.deepEqual(addOrderItem([], "honey-wheat", 13), []);
});

test("formats saved items for the contact form", () => {
    const text = formatOrderDetails([{ id: "fruit-danish", name: "Fruit Danish", quantity: 4 }]);
    assert.equal(text, "4 x Fruit Danish");
});

test("returns field-specific errors for invalid form values", () => {
    const errors = validateFormValues({
        name: "A",
        email: "bad-email",
        pickupDate: "2026-01-01",
        requestType: "",
        details: "short"
    }, new Date("2026-11-15T12:00:00"));
    assert.deepEqual(Object.keys(errors).sort(), [
        "customer-email",
        "customer-name",
        "item-details",
        "pickup-date",
        "request-type"
    ]);
});

test("accepts a valid request", () => {
    const errors = validateFormValues({
        name: "Felipe Santana",
        email: "felipe@example.com",
        pickupDate: "2026-11-20",
        requestType: "pre-order",
        details: "2 x Country Sourdough"
    }, new Date("2026-11-15T12:00:00"));
    assert.deepEqual(errors, {});
});
