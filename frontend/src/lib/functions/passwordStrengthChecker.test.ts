import { describe, it, expect } from "bun:test";
import { checkPasswordStrength } from "./passwordStrengthChecker";

describe("checkPasswordStrength", () => {
    it("should return a score and feedback for a given password", () => {
        const password = "password123";
        const userInputs = ["user", "name"];
        const result = checkPasswordStrength(password, userInputs);
        expect(result).toHaveProperty("score");
        expect(result).toHaveProperty("feedback");
    });

    it("should return a low score for a weak password", () => {
        const password = "12345";
        const userInputs: string[] = [];
        const result = checkPasswordStrength(password, userInputs);
        expect(result.score).toBeLessThan(3);
    });

    it("should return a high score for a strong password", () => {
        const password = "Str0ngP@ssw0rd!";
        const userInputs: string[] = [];
        const result = checkPasswordStrength(password, userInputs);
        expect(result.score).toBeGreaterThanOrEqual(3);
    });

    it("check userInputs", () => {
        const password = "userpassword";
        const userInputs = ["user", "password"];
        const result = checkPasswordStrength(password, userInputs);
        expect(result.score).toBeLessThan(3);
    });
});
