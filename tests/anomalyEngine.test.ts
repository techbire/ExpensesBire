import { detectAnomalies, RawExpenseRow } from "../src/lib/anomalyEngine";
import { AnomalyType, Severity } from "@prisma/client";

describe("anomalyEngine", () => {
  const baseRow: RawExpenseRow = {
    date: "12-02-2026",
    description: "Dinner marina bites",
    paid_by: "Priya",
    amount: "3200",
    currency: "INR",
    split_type: "Equal",
    split_with: "Priya;Rohan;Meera",
    split_details: "",
    notes: "",
  };

  it("should return no anomalies for a perfectly valid row", () => {
    const anomalies = detectAnomalies(baseRow, "INR", ["Priya", "Rohan", "Meera"]);
    expect(anomalies).toEqual([]);
  });

  it("should flag missing paid_by field", () => {
    const row = { ...baseRow, paid_by: "" };
    const anomalies = detectAnomalies(row, "INR", ["Priya", "Rohan", "Meera"]);
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0].anomaly_type).toBe(AnomalyType.MISSING_DATA);
    expect(anomalies[0].severity).toBe(Severity.ERROR);
    expect(anomalies[0].description).toContain("paid_by");
  });

  it("should flag missing currency field", () => {
    const row = { ...baseRow, currency: "" };
    const anomalies = detectAnomalies(row, "INR", ["Priya", "Rohan", "Meera"]);
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0].anomaly_type).toBe(AnomalyType.MISSING_DATA);
    expect(anomalies[0].severity).toBe(Severity.ERROR);
    expect(anomalies[0].description).toContain("currency");
  });

  it("should flag commas in amounts and handle parsing", () => {
    const row = { ...baseRow, amount: "1,200" };
    const anomalies = detectAnomalies(row, "INR", ["Priya", "Rohan", "Meera"]);
    // Should warn about formatting
    expect(anomalies.some(a => a.anomaly_type === AnomalyType.FORMATTING)).toBe(true);
  });

  it("should flag invalid amount formatting", () => {
    const row = { ...baseRow, amount: "abc" };
    const anomalies = detectAnomalies(row, "INR", ["Priya", "Rohan", "Meera"]);
    expect(anomalies.some(a => a.anomaly_type === AnomalyType.FORMATTING && a.severity === Severity.ERROR)).toBe(true);
  });

  it("should flag zero amounts", () => {
    const row = { ...baseRow, amount: "0" };
    const anomalies = detectAnomalies(row, "INR", ["Priya", "Rohan", "Meera"]);
    expect(anomalies.some(a => a.anomaly_type === AnomalyType.ZERO_AMOUNT)).toBe(true);
  });

  it("should flag negative amounts as possible refunds", () => {
    const row = { ...baseRow, amount: "-150" };
    const anomalies = detectAnomalies(row, "INR", ["Priya", "Rohan", "Meera"]);
    expect(anomalies.some(a => a.anomaly_type === AnomalyType.NEGATIVE_AMOUNT)).toBe(true);
  });

  it("should flag foreign currency", () => {
    const row = { ...baseRow, currency: "USD" };
    const anomalies = detectAnomalies(row, "INR", ["Priya", "Rohan", "Meera"]);
    expect(anomalies.some(a => a.anomaly_type === AnomalyType.FOREIGN_CURRENCY)).toBe(true);
  });

  it("should flag settlements disguised as expenses based on keywords", () => {
    const rowPaidBack = { ...baseRow, description: "Rohan paid Aisha back" };
    const anomaliesPaidBack = detectAnomalies(rowPaidBack, "INR", ["Priya", "Rohan", "Meera"]);
    expect(anomaliesPaidBack.some(a => a.anomaly_type === AnomalyType.SETTLEMENT)).toBe(true);

    const rowDeposit = { ...baseRow, description: "Sam deposit share" };
    const anomaliesDeposit = detectAnomalies(rowDeposit, "INR", ["Priya", "Rohan", "Meera"]);
    expect(anomaliesDeposit.some(a => a.anomaly_type === AnomalyType.SETTLEMENT)).toBe(true);
  });

  it("should flag ambiguous or unusual dates", () => {
    const row = { ...baseRow, date: "Mar-14" };
    const anomalies = detectAnomalies(row, "INR", ["Priya", "Rohan", "Meera"]);
    expect(anomalies.some(a => a.anomaly_type === AnomalyType.AMBIGUOUS_DATE)).toBe(true);
  });

  it("should flag equal splits that have custom split_details", () => {
    const row = { ...baseRow, split_type: "Equal", split_details: "Priya: 30; Rohan: 70" };
    const anomalies = detectAnomalies(row, "INR", ["Priya", "Rohan", "Meera"]);
    expect(anomalies.some(a => a.anomaly_type === AnomalyType.SPLIT_CONFLICT)).toBe(true);
  });

  it("should flag percentage splits where details do not sum to 100%", () => {
    const row = { ...baseRow, split_type: "Percentage", split_details: "Priya: 40; Rohan: 50; Meera: 20" }; // Sum is 110%
    const anomalies = detectAnomalies(row, "INR", ["Priya", "Rohan", "Meera"]);
    expect(anomalies.some(a => a.anomaly_type === AnomalyType.SPLIT_CONFLICT)).toBe(true);
  });
});
