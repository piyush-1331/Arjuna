import { describe, expect, it, beforeAll } from "vitest";
import {
  generateHistoricalConsumption,
  calculateSMA,
  calculateEMA,
  calculateLinearRegression,
  categorizeStockOutRisk,
  computeReorderRecommendation,
  calculateMedicineForecast,
  getFacilityDemandForecasts,
  getDetailedMedicineForecast,
  getDistrictDemandForecasts,
  PROTOTYPE_FORECAST_DISCLAIMER,
  ACCURACY_LIMITATION_NOTICE,
  DailyConsumptionPoint,
} from "./demandForecastingService";
import { initMemoryStore } from "./db";

beforeAll(() => {
  initMemoryStore();
});

describe("Synthetic Historical Consumption Generation", () => {
  const sampleMed = {
    id: 1,
    name: "Amlodipine 5mg",
    category: "Hypertension",
    facilityId: 1,
    currentStock: 18,
  };

  it("generates default 60-day historical time series with non-negative quantities", () => {
    const series = generateHistoricalConsumption(sampleMed, "phc", 60);
    expect(series).toHaveLength(60);
    series.forEach((pt, idx) => {
      expect(pt.dispensedQuantity).toBeGreaterThanOrEqual(0);
      expect(pt.prescriptionsCount).toBeGreaterThanOrEqual(0);
      expect(pt.dayIndex).toBe(idx);
      expect(pt.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(typeof pt.dayOfWeek).toBe("string");
    });
  });

  it("exhibits day-of-week seasonality (Sunday has lower dispensing than Monday peak)", () => {
    const series = generateHistoricalConsumption(sampleMed, "phc", 90);
    const sundayPoints = series.filter((pt) => pt.dayOfWeek === "Sun");
    const mondayPoints = series.filter((pt) => pt.dayOfWeek === "Mon");

    expect(sundayPoints.length).toBeGreaterThan(0);
    expect(mondayPoints.length).toBeGreaterThan(0);

    const avgSunday = sundayPoints.reduce((sum, p) => sum + p.dispensedQuantity, 0) / sundayPoints.length;
    const avgMonday = mondayPoints.reduce((sum, p) => sum + p.dispensedQuantity, 0) / mondayPoints.length;

    // Monday peak OPD should be substantially higher than skeleton Sunday emergency dispensing
    expect(avgMonday).toBeGreaterThan(avgSunday);
  });

  it("produces deterministic reproducible series for identical medicine seeds", () => {
    const series1 = generateHistoricalConsumption(sampleMed, "phc", 30);
    const series2 = generateHistoricalConsumption(sampleMed, "phc", 30);
    expect(series1).toEqual(series2);
  });

  it("scales baseline consumption according to facility tier", () => {
    const subCentreSeries = generateHistoricalConsumption(sampleMed, "sub_centre", 30);
    const sdhSeries = generateHistoricalConsumption(sampleMed, "sdh", 30);

    const avgSubCentre = subCentreSeries.reduce((s, p) => s + p.dispensedQuantity, 0) / 30;
    const avgSDH = sdhSeries.reduce((s, p) => s + p.dispensedQuantity, 0) / 30;

    expect(avgSDH).toBeGreaterThan(avgSubCentre);
  });
});

describe("Statistical Baselines: Moving Average & Exponential Smoothing", () => {
  const mockSeries: DailyConsumptionPoint[] = [
    { date: "2026-08-01", dayIndex: 0, dispensedQuantity: 10, prescriptionsCount: 5, isSynthetic: true, dayOfWeek: "Sat" },
    { date: "2026-08-02", dayIndex: 1, dispensedQuantity: 12, prescriptionsCount: 6, isSynthetic: true, dayOfWeek: "Sun" },
    { date: "2026-08-03", dayIndex: 2, dispensedQuantity: 14, prescriptionsCount: 7, isSynthetic: true, dayOfWeek: "Mon" },
    { date: "2026-08-04", dayIndex: 3, dispensedQuantity: 16, prescriptionsCount: 8, isSynthetic: true, dayOfWeek: "Tue" },
    { date: "2026-08-05", dayIndex: 4, dispensedQuantity: 18, prescriptionsCount: 9, isSynthetic: true, dayOfWeek: "Wed" },
    { date: "2026-08-06", dayIndex: 5, dispensedQuantity: 20, prescriptionsCount: 10, isSynthetic: true, dayOfWeek: "Thu" },
    { date: "2026-08-07", dayIndex: 6, dispensedQuantity: 22, prescriptionsCount: 11, isSynthetic: true, dayOfWeek: "Fri" },
  ];

  it("calculates correct Simple Moving Average (SMA)", () => {
    // 7-day sum = 10+12+14+16+18+20+22 = 112 / 7 = 16
    const sma7 = calculateSMA(mockSeries, 7);
    expect(sma7).toBe(16);

    // 3-day window: (18+20+22)/3 = 60/3 = 20
    const sma3 = calculateSMA(mockSeries, 3);
    expect(sma3).toBe(20);
  });

  it("calculates Exponential Moving Average (EMA) with alpha weighting", () => {
    const ema = calculateEMA(mockSeries, 0.3);
    expect(ema).toBeGreaterThan(10);
    expect(ema).toBeLessThan(22);
  });
});

describe("ML Linear Trend Regression", () => {
  it("detects upward demand acceleration", () => {
    const upwardSeries: DailyConsumptionPoint[] = Array.from({ length: 10 }, (_, i) => ({
      date: `2026-08-${String(i + 1).padStart(2, "0")}`,
      dayIndex: i,
      dispensedQuantity: 10 + i * 2, // 10, 12, 14, 16...
      prescriptionsCount: 5,
      isSynthetic: true,
      dayOfWeek: "Mon",
    }));

    const reg = calculateLinearRegression(upwardSeries);
    expect(reg.slope).toBeCloseTo(2.0, 2);
    expect(reg.intercept).toBeCloseTo(10.0, 2);
    expect(reg.r2).toBeGreaterThan(0.95);
  });

  it("detects downward demand deceleration", () => {
    const downwardSeries: DailyConsumptionPoint[] = Array.from({ length: 10 }, (_, i) => ({
      date: `2026-08-${String(i + 1).padStart(2, "0")}`,
      dayIndex: i,
      dispensedQuantity: 30 - i * 1.5,
      prescriptionsCount: 5,
      isSynthetic: true,
      dayOfWeek: "Mon",
    }));

    const reg = calculateLinearRegression(downwardSeries);
    expect(reg.slope).toBeLessThan(0);
    expect(reg.intercept).toBeCloseTo(30, 1);
  });
});

describe("Stock-Out Risk Categorization & Reorder Recommendation", () => {
  it("categorizes CRITICAL when currentStock is 0", () => {
    expect(categorizeStockOutRisk(0, 0)).toBe("CRITICAL");
  });

  it("categorizes CRITICAL when days until stock-out is <= 7", () => {
    expect(categorizeStockOutRisk(20, 5)).toBe("CRITICAL");
    expect(categorizeStockOutRisk(20, 7)).toBe("CRITICAL");
  });

  it("categorizes HIGH when days until stock-out is between 8 and 15", () => {
    expect(categorizeStockOutRisk(50, 8)).toBe("HIGH");
    expect(categorizeStockOutRisk(50, 14)).toBe("HIGH");
  });

  it("categorizes MODERATE when days until stock-out is between 16 and 30", () => {
    expect(categorizeStockOutRisk(100, 20)).toBe("MODERATE");
    expect(categorizeStockOutRisk(100, 29)).toBe("MODERATE");
  });

  it("categorizes SAFE when days until stock-out exceeds 30 days", () => {
    expect(categorizeStockOutRisk(500, 45)).toBe("SAFE");
  });

  it("generates urgent reorder recommendation with lead-time rationale when stock is depleted", () => {
    const rec = computeReorderRecommendation(0, 50, 10, 0, 7, 45);
    expect(rec.shouldReorder).toBe(true);
    expect(rec.urgency).toBe("immediate");
    expect(rec.suggestedReorderQuantity).toBe(450); // 45 days * 10 - 0 = 450
    expect(rec.rationale).toContain("CRITICAL");
  });

  it("generates safe recommendation when buffer is adequate", () => {
    const rec = computeReorderRecommendation(400, 50, 5, 80, 7, 45);
    expect(rec.shouldReorder).toBe(false);
    expect(rec.urgency).toBe("none");
    expect(rec.suggestedReorderQuantity).toBe(0);
  });
});

describe("Core Medicine Demand Forecast Calculation", () => {
  const medicine = {
    id: 1,
    facilityId: 1,
    name: "Amlodipine 5mg",
    category: "Hypertension",
    currentStock: 18,
    reorderLevel: 50,
    unit: "strips",
    batchNumber: "AML-2026-08",
  };

  const facility = {
    id: 1,
    name: "Sundarpur Primary Health Centre (PHC)",
    facilityType: "phc",
    district: "Ahmedabad Rural",
  };

  it("calculates all 6 user-requested metrics and returns prototype disclaimers", () => {
    const forecast = calculateMedicineForecast(medicine, facility, 60, 30);

    // 1. Current stock
    expect(forecast.currentStock).toBe(18);

    // 2. Average daily consumption
    expect(forecast.averageDailyConsumption).toBeGreaterThan(0);

    // 3. Predicted 7-day demand
    expect(forecast.predicted7DayDemand).toBeGreaterThan(0);

    // 4. Predicted 30-day demand
    expect(forecast.predicted30DayDemand).toBeGreaterThan(forecast.predicted7DayDemand);

    // 5. Predicted stock-out date
    expect(forecast.predictedStockOutDate).toBeDefined();
    expect(typeof forecast.predictedStockOutDate).toBe("string");
    expect(forecast.daysUntilStockOut).toBeDefined();
    expect(forecast.daysUntilStockOut).toBeLessThanOrEqual(15); // 18 strips with ~10-12 daily consumption will run out quickly!

    // 6. Reorder recommendation
    expect(forecast.reorderRecommendation).toBeDefined();
    expect(forecast.reorderRecommendation.shouldReorder).toBe(true);
    expect(forecast.reorderRecommendation.suggestedReorderQuantity).toBeGreaterThan(0);

    // Disclaimers
    expect(forecast.disclaimer).toBe(PROTOTYPE_FORECAST_DISCLAIMER);
    expect(forecast.accuracyNotice).toBe(ACCURACY_LIMITATION_NOTICE);
    expect(forecast.disclaimer.toLowerCase()).toContain("prototype forecasting");
    expect(forecast.disclaimer.toLowerCase()).toContain("do not claim production accuracy");
  });

  it("generates chart data containing historical actuals, forecast, confidence intervals, and burn-down", () => {
    const forecast = calculateMedicineForecast(medicine, facility, 60, 30);
    const chart = forecast.chartData;

    expect(chart.length).toBe(60); // 30 past history + 30 future forecast
    const historicalPoints = chart.filter((p) => p.isHistorical);
    const forecastPoints = chart.filter((p) => p.isForecast);

    expect(historicalPoints.length).toBe(30);
    expect(forecastPoints.length).toBe(30);

    historicalPoints.forEach((p) => {
      expect(p.actualConsumption).not.toBeNull();
      expect(p.forecastDemand).toBeNull();
      expect(p.reorderThreshold).toBe(50);
    });

    forecastPoints.forEach((p) => {
      expect(p.actualConsumption).toBeNull();
      expect(p.forecastDemand).not.toBeNull();
      expect(p.forecastConfidenceUpper).toBeGreaterThanOrEqual(p.forecastDemand!);
      expect(p.forecastConfidenceLower).toBeLessThanOrEqual(p.forecastDemand!);
      expect(p.remainingStockBurnDown).toBeDefined();
    });
  });
});

describe("Facility and District Forecast Queries", () => {
  it("fetches forecasts for all medicines in facility 1", async () => {
    const list = await getFacilityDemandForecasts(1);
    expect(list.length).toBeGreaterThan(0);

    const amlodipine = list.find((m) => m.medicineName.includes("Amlodipine"));
    expect(amlodipine).toBeDefined();
    expect(amlodipine?.currentStock).toBe(18);
    expect(amlodipine?.stockOutRisk).toMatch(/CRITICAL|HIGH/);

    const pcm = list.find((m) => m.medicineName.includes("Paracetamol"));
    expect(pcm).toBeDefined();
    expect(pcm?.currentStock).toBe(340);
  });

  it("fetches detailed forecast for single medicine with chart series", async () => {
    const detailed = await getDetailedMedicineForecast(1, 1);
    expect(detailed.medicineName).toBe("Amlodipine 5mg");
    expect(detailed.historicalSeries.length).toBe(60);
    expect(detailed.forecastSeries.length).toBe(30);
    expect(detailed.chartData.length).toBe(60);
    expect(detailed.modelComparison.linearRegressionR2).toBeDefined();
    expect(detailed.modelComparison.emaDailyRate).toBeGreaterThan(0);
    expect(detailed.modelComparison.sma7DailyRate).toBeGreaterThan(0);
  });

  it("fetches district-wide aggregated demand forecasts", async () => {
    const district = await getDistrictDemandForecasts("Ahmedabad Rural");
    expect(district.district).toBe("Ahmedabad Rural");
    expect(district.totalSKUs).toBeGreaterThan(10);
    expect(district.criticalStockOutCount).toBeGreaterThan(0);
    expect(district.facilitySummaries.length).toBeGreaterThan(0);
    expect(district.topRiskMedicines.length).toBeGreaterThan(0);
    expect(district.disclaimer).toBe(PROTOTYPE_FORECAST_DISCLAIMER);
  });
});
