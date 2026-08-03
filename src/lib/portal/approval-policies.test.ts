import { describe, expect, it } from "vitest";
import {
  approvalActionLabel,
  approvalPolicyInput,
} from "@/lib/portal/approval-policies";

describe("customer approval policy input", () => {
  it("builds a narrow rule from plain customer controls", () => {
    expect(
      approvalPolicyInput({
        name: "Large vendor changes",
        actionType: "account_change",
        minimumApprovers: "2",
        annualValueThreshold: "10000.129",
        category: "Software",
        explicitConsent: true,
      }),
    ).toEqual({
      name: "Large vendor changes",
      isActive: true,
      rule: {
        action_type: "account_change",
        minimum_approvers: 2,
        annual_value_gte: 10000.13,
        category: "Software",
        explicit_consent: true,
      },
    });
  });

  it("keeps contract cancellation at two approvers or more", () => {
    expect(
      approvalPolicyInput({
        name: "Contract cancellation",
        actionType: "contract_cancellation",
        minimumApprovers: 1,
      }).rule.minimum_approvers,
    ).toBe(2);
  });

  it("rejects ambiguous or unsafe values", () => {
    expect(() =>
      approvalPolicyInput({
        name: "x",
        actionType: "all",
        minimumApprovers: 1,
      }),
    ).toThrow(/clear name/i);
    expect(() =>
      approvalPolicyInput({
        name: "Invalid approvers",
        actionType: "all",
        minimumApprovers: 0,
      }),
    ).toThrow(/one and five/i);
    expect(() =>
      approvalPolicyInput({
        name: "Invalid threshold",
        actionType: "all",
        minimumApprovers: 1,
        annualValueThreshold: "-1",
      }),
    ).toThrow(/non-negative/i);
  });

  it("provides human labels for every stored action type", () => {
    expect(approvalActionLabel("external_email")).toBe("External email");
    expect(approvalActionLabel("all")).toBe("All consequential actions");
  });
});
