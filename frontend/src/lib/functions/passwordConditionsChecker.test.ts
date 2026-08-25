import { describe, it, expect } from "bun:test";
import { checkPasswordConditions } from "./passwordConditionsChecker";

describe("checkPasswordConditions", () => {
    it("should return an array of condition results for a given password", () => {
        const password = "password123";
        const result = checkPasswordConditions(password);
        expect(result).toBeInstanceOf(Array);
        expect(result.length).toBeGreaterThan(0);
        result.forEach((condition) => {
            expect(condition).toHaveProperty("description");
            expect(condition).toHaveProperty("isValid");
        });
    });

    it("should validate conditions correctly for a weak password", () => {
        const password = "12345";
        const result = checkPasswordConditions(password);
        const validConditions = result.filter((condition) => condition.isValid);
        expect(validConditions.length).toBeLessThan(result.length);
    });

    it("should validate conditions correctly for a strong password", () => {
        const password = "Str0ngP@ssw0rd!";
        const result = checkPasswordConditions(password);
        const validConditions = result.filter((condition) => condition.isValid);
        expect(validConditions.length).toBe(result.length);
    });

    it("should validate conditions correctly for a password with mixed characters", () => {
        const password = "Abcdef1!";
        const result = checkPasswordConditions(password);
        const validConditions = result.filter((condition) => condition.isValid);
        expect(validConditions.length).toBe(result.length);
    });
});
