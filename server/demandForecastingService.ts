import { getFacilities, getInventory, getMedicineTransactions } from "./db";

export const PROTOTYPE_FORECAST_DISCLAIMER =
  "PROTOTYPE FORECASTING: Experimental statistical and ML regression models for health supply chain decision support only. Do not claim production accuracy. Physical inventory verification is mandatory prior to procurement decisions.";

export const ACCURACY_LIMITATION_NOTICE =
  "Notice: Forecast estimates are generated using moving averages, exponential smoothing, and ordinary least squares linear trend models parameterized on synthetic and logged facility dispense history. Real-world demand may deviate due to epidemics, seasonal spikes, supply disruptions, or demographic shifts.";

export type StockOutRiskLevel = "CRITICAL" | "HIGH" | "MODERATE" | "SAFE";

export interface DailyConsumptionPoint {
  date: string; // YYYY-MM-DD
  dayIndex: number;
  dispensedQuantity: number;
  prescriptionsCount: number;
  isSynthetic: boolean;
  dayOfWeek: string;
}

export interface ModelComparison {
  sma7DailyRate: number;
  sma14DailyRate: number;
  sma30DailyRate: number;
  emaDailyRate: number;
  linearRegressionSlope: number; // units per day trend
  linearRegressionIntercept: number;
  linearRegressionR2: number;
  ensembleDailyRate: number;
  standardError: number;
}

export interface ReorderRecommendation {
  shouldReorder: boolean;
  suggestedReorderQuantity: number;
  urgency: "immediate" | "urgent" | "normal" | "none";
  leadTimeDays: number;
  targetBufferDays: number;
  rationale: string;
}

export interface MedicineForecastSummary {
  medicineId: number;
  facilityId: number;
  facilityName: string;
  facilityType: string;
  district: string;
  medicineName: string;
  category: string;
  unit: string;
  currentStock: number;
  reorderLevel: number;
  averageDailyConsumption: number; // ADC
  predicted7DayDemand: number;
  predicted30DayDemand: number;
  predictedStockOutDate: string | null; // ISO string or null if zero demand
  daysUntilStockOut: number | null;
  stockOutRisk: StockOutRiskLevel;
  reorderRecommendation: ReorderRecommendation;
  trendDirection: "accelerating" | "stable" | "decelerating";
  trendPercentage: number;
  disclaimer: string;
}

export interface ChartDataPoint {
  date: string;
  displayDate: string;
  isHistorical: boolean;
  isForecast: boolean;
  actualConsumption: number | null;
  forecastDemand: number | null;
  forecastConfidenceUpper: number | null;
  forecastConfidenceLower: number | null;
  remainingStockBurnDown: number | null;
  reorderThreshold: number;
}

export interface DetailedMedicineForecast extends MedicineForecastSummary {
  historicalSeries: DailyConsumptionPoint[];
  forecastSeries: Array<{
    date: string;
    dayIndex: number;
    predictedDemand: number;
    confidenceUpper80: number;
    confidenceLower80: number;
    projectedRemainingStock: number;
  }>;
  chartData: ChartDataPoint[];
  modelComparison: ModelComparison;
  accuracyNotice: string;
}

export interface DistrictForecastOverview {
  district: string;
  totalSKUs: number;
  criticalStockOutCount: number;
  highStockOutCount: number;
  moderateStockOutCount: number;
  safeStockOutCount: number;
  totalCurrentStockUnits: number;
  totalPredicted30DayDemandUnits: number;
  urgentReorderSKUs: number;
  facilitySummaries: Array<{
    facilityId: number;
    facilityName: string;
    facilityType: string;
    skusCount: number;
    criticalCount: number;
    predicted30DayDemand: number;
  }>;
  topRiskMedicines: MedicineForecastSummary[];
  disclaimer: string;
}

/**
 * Deterministic pseudo-random generator seeded by number
 * Guarantees stable synthetic historical series for each medicine
 */
function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Classifies volume tier based on medicine category and name
 */
function getMedicineBaselineVolume(name: string, category: string, facilityType: string): number {
  const cleanName = name.toLowerCase();
  const cleanCat = category.toLowerCase();

  // Facility multiplier: Sub-Centre < PHC < CHC < SDH / Hospital
  let facilityMultiplier = 1.0;
  if (facilityType === "sub_centre" || facilityType === "hsc") facilityMultiplier = 0.4;
  else if (facilityType === "phc") facilityMultiplier = 1.0;
  else if (facilityType === "chc") facilityMultiplier = 2.2;
  else if (facilityType === "sdh" || facilityType === "district_hospital") facilityMultiplier = 4.0;

  // Base units per day for a standard PHC
  let baseDailyUnits = 5;

  if (cleanName.includes("paracetamol") || cleanName.includes("pcm")) {
    baseDailyUnits = 18; // High turnover analgesic
  } else if (cleanName.includes("amlodipine") || cleanName.includes("telmisartan") || cleanCat.includes("hypertension")) {
    baseDailyUnits = 12; // Chronic daily compliance
  } else if (cleanName.includes("metformin") || cleanCat.includes("diabetes")) {
    baseDailyUnits = 10;
  } else if (cleanName.includes("ors") || cleanName.includes("iron") || cleanName.includes("ifa")) {
    baseDailyUnits = 8;
  } else if (cleanName.includes("amoxicillin") || cleanName.includes("azithromycin") || cleanCat.includes("antibiotic")) {
    baseDailyUnits = 6;
  } else if (cleanName.includes("pantoprazole") || cleanCat.includes("gastro")) {
    baseDailyUnits = 7;
  } else if (cleanName.includes("salbutamol") || cleanCat.includes("respiratory")) {
    baseDailyUnits = 3;
  } else if (cleanName.includes("insulin")) {
    baseDailyUnits = 2;
  } else {
    baseDailyUnits = 5;
  }

  return Math.max(1, Math.round(baseDailyUnits * facilityMultiplier));
}

/**
 * Generates synthetic historical consumption records for a medicine over past N days (default 60 days)
 * Includes day-of-week seasonality (Mondays/Thursdays high OPD, Sundays low)
 * and realistic variance, merged with actual logged transactions if available.
 */
export function generateHistoricalConsumption(
  medicine: { id: number; name: string; category?: string; facilityId: number; currentStock: number },
  facilityType: string = "phc",
  historyDays: number = 60,
  recordedTransactions: Array<{ quantity: number; transactionType: string; createdAt: Date | string }> = []
): DailyConsumptionPoint[] {
  const series: DailyConsumptionPoint[] = [];
  const baseVolume = getMedicineBaselineVolume(medicine.name, medicine.category || "General", facilityType);
  const rand = seededRandom(medicine.id * 1000 + medicine.facilityId * 37 + 1337);

  // Group real recorded transactions by YYYY-MM-DD
  const realDispensedByDate: Record<string, number> = {};
  recordedTransactions.forEach((tx) => {
    if (tx.transactionType === "DISPENSED") {
      const d = new Date(tx.createdAt).toISOString().split("T")[0];
      const qty = Math.abs(Number(tx.quantity));
      realDispensedByDate[d] = (realDispensedByDate[d] || 0) + qty;
    }
  });

  const now = new Date();
  // Generate backwards from today - 1 day to today - historyDays
  for (let i = historyDays; i >= 1; i--) {
    const targetDate = new Date(now.getTime() - i * 86400000);
    const dateStr = targetDate.toISOString().split("T")[0];
    const dayOfWeekIdx = targetDate.getDay(); // 0 = Sun, 1 = Mon ...
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayOfWeek = dayNames[dayOfWeekIdx];

    // Day-of-week seasonality weight
    // Mondays (1) and Thursdays (4) are peak OPD clinic days in rural India
    // Sunday (0) has minimal emergency-only dispensing
    let seasonality = 1.0;
    if (dayOfWeekIdx === 1) seasonality = 1.45; // Monday peak
    else if (dayOfWeekIdx === 4) seasonality = 1.35; // Thursday peak
    else if (dayOfWeekIdx === 2 || dayOfWeekIdx === 3) seasonality = 1.1;
    else if (dayOfWeekIdx === 5) seasonality = 0.95;
    else if (dayOfWeekIdx === 6) seasonality = 0.8; // Saturday half-day
    else if (dayOfWeekIdx === 0) seasonality = 0.25; // Sunday skeleton OPD

    // Subtle 60-day slow trend (seasonal disease burden shift)
    const trendEffect = 1.0 + ((historyDays - i) / historyDays) * 0.15;

    // Clinical random variance (+/- 25%)
    const noise = 0.75 + rand() * 0.5;

    let dispensedQuantity = Math.max(0, Math.round(baseVolume * seasonality * trendEffect * noise));
    let isSynthetic = true;

    // If real recorded transaction exists for this day, fuse or use real data
    if (realDispensedByDate[dateStr] !== undefined) {
      dispensedQuantity = realDispensedByDate[dateStr];
      isSynthetic = false;
    }

    const prescriptionsCount = Math.max(1, Math.round(dispensedQuantity / (1.5 + rand() * 0.8)));

    series.push({
      date: dateStr,
      dayIndex: historyDays - i, // 0 to historyDays - 1
      dispensedQuantity,
      prescriptionsCount,
      isSynthetic,
      dayOfWeek,
    });
  }

  return series;
}

/**
 * Calculates Simple Moving Average (SMA) over the last `window` points
 */
export function calculateSMA(series: DailyConsumptionPoint[], window: number): number {
  if (!series.length) return 0;
  const slice = series.slice(-window);
  const sum = slice.reduce((acc, pt) => acc + pt.dispensedQuantity, 0);
  return Number((sum / slice.length).toFixed(2));
}

/**
 * Calculates Exponential Moving Average (EMA) with smoothing factor alpha (default 0.3)
 */
export function calculateEMA(series: DailyConsumptionPoint[], alpha: number = 0.3): number {
  if (!series.length) return 0;
  let ema = series[0].dispensedQuantity;
  for (let i = 1; i < series.length; i++) {
    ema = alpha * series[i].dispensedQuantity + (1 - alpha) * ema;
  }
  return Number(ema.toFixed(2));
}

/**
 * Machine Learning: Ordinary Least Squares (OLS) Linear Trend Regression
 * Models y = alpha + beta * t over the historical daily series
 */
export function calculateLinearRegression(series: DailyConsumptionPoint[]): {
  slope: number;
  intercept: number;
  r2: number;
  standardError: number;
} {
  const n = series.length;
  if (n < 2) {
    return { slope: 0, intercept: series[0]?.dispensedQuantity || 0, r2: 0, standardError: 1 };
  }

  let sumT = 0;
  let sumY = 0;
  let sumT2 = 0;
  let sumTY = 0;

  for (let i = 0; i < n; i++) {
    const t = series[i].dayIndex;
    const y = series[i].dispensedQuantity;
    sumT += t;
    sumY += y;
    sumT2 += t * t;
    sumTY += t * y;
  }

  const denominator = n * sumT2 - sumT * sumT;
  if (denominator === 0) {
    return { slope: 0, intercept: sumY / n, r2: 0, standardError: 1 };
  }

  const slope = (n * sumTY - sumT * sumY) / denominator;
  const intercept = (sumY - slope * sumT) / n;

  // Calculate R2 and residual standard error
  const meanY = sumY / n;
  let ssTotal = 0;
  let ssResidual = 0;

  for (let i = 0; i < n; i++) {
    const t = series[i].dayIndex;
    const actual = series[i].dispensedQuantity;
    const predicted = intercept + slope * t;
    ssTotal += Math.pow(actual - meanY, 2);
    ssResidual += Math.pow(actual - predicted, 2);
  }

  const r2 = ssTotal === 0 ? 0 : Math.max(0, 1 - ssResidual / ssTotal);
  const standardError = Math.sqrt(ssResidual / Math.max(1, n - 2));

  return {
    slope: Number(slope.toFixed(4)),
    intercept: Number(intercept.toFixed(2)),
    r2: Number(r2.toFixed(3)),
    standardError: Number(standardError.toFixed(2)),
  };
}

/**
 * Evaluates stock-out risk level based on days until exhaustion and stock count
 */
export function categorizeStockOutRisk(currentStock: number, daysUntilStockOut: number | null): StockOutRiskLevel {
  if (currentStock <= 0 || (daysUntilStockOut !== null && daysUntilStockOut <= 7)) {
    return "CRITICAL";
  }
  if (daysUntilStockOut !== null && daysUntilStockOut <= 15) {
    return "HIGH";
  }
  if (daysUntilStockOut !== null && daysUntilStockOut <= 30) {
    return "MODERATE";
  }
  return "SAFE";
}

/**
 * Computes intelligent Reorder Recommendation
 */
export function computeReorderRecommendation(
  currentStock: number,
  reorderLevel: number,
  averageDailyConsumption: number,
  daysUntilStockOut: number | null,
  leadTimeDays: number = 7,
  targetBufferDays: number = 45
): ReorderRecommendation {
  const adc = Math.max(0.2, averageDailyConsumption);
  const targetInventory = Math.ceil(targetBufferDays * adc);
  const suggestedReorderQuantity = Math.max(0, targetInventory - currentStock);

  const isBelowReorder = currentStock <= reorderLevel;
  const isImminentStockOut = daysUntilStockOut !== null && daysUntilStockOut <= leadTimeDays + 7;
  const shouldReorder = isBelowReorder || isImminentStockOut || currentStock <= 0;

  let urgency: "immediate" | "urgent" | "normal" | "none" = "none";
  let rationale = `Current stock (${currentStock}) is healthy. Estimated runway of ${daysUntilStockOut ?? "30+"} days exceeds target buffer of ${targetBufferDays} days.`;

  if (currentStock <= 0) {
    urgency = "immediate";
    rationale = `CRITICAL: Stock is currently exhausted (0 units). Immediate emergency replenishment of ${suggestedReorderQuantity} units requested with ${leadTimeDays}-day delivery lead time.`;
  } else if (daysUntilStockOut !== null && daysUntilStockOut <= 7) {
    urgency = "immediate";
    rationale = `CRITICAL: Stockout projected in ${daysUntilStockOut} days (within lead time of ${leadTimeDays} days). Expedited purchase requisition of ${suggestedReorderQuantity} units required to avoid stock-out.`;
  } else if ((daysUntilStockOut !== null && daysUntilStockOut <= 15) || isBelowReorder) {
    urgency = "urgent";
    rationale = `HIGH: Stock (${currentStock} units) is below or approaching reorder threshold (${reorderLevel} units). Reorder ${suggestedReorderQuantity} units to sustain 45-day clinical buffer.`;
  } else if (shouldReorder) {
    urgency = "normal";
    rationale = `MODERATE: Stock replenishment of ${suggestedReorderQuantity} units recommended to align with district 30-day procurement cycle.`;
  }

  return {
    shouldReorder,
    suggestedReorderQuantity,
    urgency,
    leadTimeDays,
    targetBufferDays,
    rationale,
  };
}

/**
 * Calculates complete demand forecast for a single medicine
 */
export function calculateMedicineForecast(
  medicine: {
    id: number;
    facilityId: number;
    name: string;
    category?: string;
    currentStock: number;
    reorderLevel: number;
    unit?: string;
    batchNumber?: string;
    expiryDate?: Date | string | null;
  },
  facility: {
    id: number;
    name: string;
    facilityType: string;
    district: string;
  },
  historyDays: number = 60,
  forecastHorizonDays: number = 30,
  transactions: Array<{ quantity: number; transactionType: string; createdAt: Date | string }> = []
): DetailedMedicineForecast {
  const historicalSeries = generateHistoricalConsumption(
    medicine,
    facility.facilityType,
    historyDays,
    transactions
  );

  // 1. Baselines
  const sma7 = calculateSMA(historicalSeries, 7);
  const sma14 = calculateSMA(historicalSeries, 14);
  const sma30 = calculateSMA(historicalSeries, 30);
  const ema = calculateEMA(historicalSeries, 0.3);

  // 2. ML Linear Trend
  const regression = calculateLinearRegression(historicalSeries);

  // 3. Ensemble Blending
  // Blend EMA (responsive to recent velocity) + Linear Trend (capturing momentum)
  const currentTrendProjected = Math.max(0.1, regression.intercept + regression.slope * (historyDays - 1));
  const ensembleDailyRate = Number((0.55 * ema + 0.45 * currentTrendProjected).toFixed(2));
  const averageDailyConsumption = Math.max(0.1, ensembleDailyRate);

  // Trend detection
  let trendDirection: "accelerating" | "stable" | "decelerating" = "stable";
  const trendPercentage = Number((((sma7 - sma30) / Math.max(0.1, sma30)) * 100).toFixed(1));
  if (trendPercentage > 7.5) trendDirection = "accelerating";
  else if (trendPercentage < -7.5) trendDirection = "decelerating";

  // 4. Predicted 7-day and 30-day demand
  const forecastSeries: DetailedMedicineForecast["forecastSeries"] = [];
  const chartData: ChartDataPoint[] = [];

  let cum7Day = 0;
  let cum30Day = 0;
  let remainingStock = Number(medicine.currentStock);
  let predictedStockOutDate: string | null = null;
  let daysUntilStockOut: number | null = null;

  if (medicine.currentStock <= 0) {
    daysUntilStockOut = 0;
    predictedStockOutDate = new Date().toISOString();
  }

  // Populate historical points into chartData (last 30 days for clean chart rendering)
  const recentHistory = historicalSeries.slice(-30);
  recentHistory.forEach((pt) => {
    chartData.push({
      date: pt.date,
      displayDate: new Date(pt.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
      isHistorical: true,
      isForecast: false,
      actualConsumption: pt.dispensedQuantity,
      forecastDemand: null,
      forecastConfidenceUpper: null,
      forecastConfidenceLower: null,
      remainingStockBurnDown: null,
      reorderThreshold: Number(medicine.reorderLevel),
    });
  });

  const today = new Date();
  for (let f = 1; f <= forecastHorizonDays; f++) {
    const fDate = new Date(today.getTime() + f * 86400000);
    const dateStr = fDate.toISOString().split("T")[0];
    const dayOfWeekIdx = fDate.getDay();

    // Weekend seasonality applied to future forecast
    let seasonalityFactor = 1.0;
    if (dayOfWeekIdx === 1 || dayOfWeekIdx === 4) seasonalityFactor = 1.35;
    else if (dayOfWeekIdx === 0) seasonalityFactor = 0.3;
    else seasonalityFactor = 1.05;

    const projectedT = historyDays + f - 1;
    const rawTrendRate = Math.max(0.1, regression.intercept + regression.slope * projectedT);
    const dayDemand = Number((Math.max(0.1, (0.5 * ema + 0.5 * rawTrendRate) * seasonalityFactor)).toFixed(1));

    if (f <= 7) cum7Day += dayDemand;
    if (f <= 30) cum30Day += dayDemand;

    // Confidence interval cone expanding over time
    const z80 = 1.282; // 80% confidence interval
    const uncertaintyMargin = Number((z80 * regression.standardError * Math.sqrt(1 + f / 15)).toFixed(1));
    const confidenceUpper80 = Number((dayDemand + uncertaintyMargin).toFixed(1));
    const confidenceLower80 = Math.max(0, Number((dayDemand - uncertaintyMargin).toFixed(1)));

    // Inventory burn-down
    remainingStock = Math.max(0, remainingStock - dayDemand);

    if (remainingStock === 0 && daysUntilStockOut === null) {
      daysUntilStockOut = f;
      predictedStockOutDate = fDate.toISOString();
    }

    forecastSeries.push({
      date: dateStr,
      dayIndex: projectedT,
      predictedDemand: dayDemand,
      confidenceUpper80,
      confidenceLower80,
      projectedRemainingStock: Number(remainingStock.toFixed(1)),
    });

    chartData.push({
      date: dateStr,
      displayDate: fDate.toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
      isHistorical: false,
      isForecast: true,
      actualConsumption: null,
      forecastDemand: dayDemand,
      forecastConfidenceUpper: confidenceUpper80,
      forecastConfidenceLower: confidenceLower80,
      remainingStockBurnDown: Number(remainingStock.toFixed(1)),
      reorderThreshold: Number(medicine.reorderLevel),
    });
  }

  // Fallback if stock did not deplete within 30 days
  if (daysUntilStockOut === null && medicine.currentStock > 0) {
    const rawDays = Math.floor(medicine.currentStock / averageDailyConsumption);
    daysUntilStockOut = rawDays;
    predictedStockOutDate = new Date(today.getTime() + rawDays * 86400000).toISOString();
  }

  const stockOutRisk = categorizeStockOutRisk(medicine.currentStock, daysUntilStockOut);
  const reorderRecommendation = computeReorderRecommendation(
    medicine.currentStock,
    medicine.reorderLevel,
    averageDailyConsumption,
    daysUntilStockOut,
    7,
    45
  );

  return {
    medicineId: medicine.id,
    facilityId: facility.id,
    facilityName: facility.name,
    facilityType: facility.facilityType,
    district: facility.district,
    medicineName: medicine.name,
    category: medicine.category || "General",
    unit: medicine.unit || "packs",
    currentStock: Number(medicine.currentStock),
    reorderLevel: Number(medicine.reorderLevel),
    averageDailyConsumption,
    predicted7DayDemand: Math.round(cum7Day),
    predicted30DayDemand: Math.round(cum30Day),
    predictedStockOutDate,
    daysUntilStockOut,
    stockOutRisk,
    reorderRecommendation,
    trendDirection,
    trendPercentage,
    disclaimer: PROTOTYPE_FORECAST_DISCLAIMER,
    accuracyNotice: ACCURACY_LIMITATION_NOTICE,
    historicalSeries,
    forecastSeries,
    chartData,
    modelComparison: {
      sma7DailyRate: sma7,
      sma14DailyRate: sma14,
      sma30DailyRate: sma30,
      emaDailyRate: ema,
      linearRegressionSlope: regression.slope,
      linearRegressionIntercept: regression.intercept,
      linearRegressionR2: regression.r2,
      ensembleDailyRate,
      standardError: regression.standardError,
    },
  };
}

/**
 * Fetches all forecasts for a facility's inventory
 */
export async function getFacilityDemandForecasts(facilityId: number = 1): Promise<MedicineForecastSummary[]> {
  const facilities = await getFacilities();
  const facility = facilities.find((f) => f.id === facilityId) || {
    id: facilityId,
    name: "Sundarpur Primary Health Centre (PHC)",
    facilityType: "phc",
    district: "Ahmedabad Rural",
  };

  const inventory = await getInventory(facilityId);
  const transactions = await getMedicineTransactions({ facilityId });

  return inventory.map((med) => {
    const medTxs = transactions.filter((t) => t.medicineId === med.id);
    const detailed = calculateMedicineForecast(med, facility, 60, 30, medTxs);
    // Return summary without heavy time-series arrays for fast multi-item listing
    const { historicalSeries, forecastSeries, chartData, ...summary } = detailed;
    return summary;
  });
}

/**
 * Fetches detailed forecast with chart time series for a single medicine
 */
export async function getDetailedMedicineForecast(
  medicineId: number,
  facilityId: number = 1
): Promise<DetailedMedicineForecast> {
  const facilities = await getFacilities();
  const facility = facilities.find((f) => f.id === facilityId) || {
    id: facilityId,
    name: "Sundarpur Primary Health Centre (PHC)",
    facilityType: "phc",
    district: "Ahmedabad Rural",
  };

  const inventory = await getInventory(facilityId);
  const medicine = inventory.find((m) => m.id === medicineId);

  if (!medicine) {
    throw new Error(`Medicine #${medicineId} not found in Facility #${facilityId} inventory.`);
  }

  const transactions = await getMedicineTransactions({ facilityId, medicineId });
  return calculateMedicineForecast(medicine, facility, 60, 30, transactions);
}

/**
 * District-wide aggregated forecast across all facilities
 */
export async function getDistrictDemandForecasts(district: string = "Nandurbar"): Promise<DistrictForecastOverview> {
  let allFacilities = await getFacilities(district);
  if (!allFacilities.length) {
    allFacilities = await getFacilities();
  }
  const allInventory = await getInventory();
  const allTransactions = await getMedicineTransactions();

  const allSummaries: MedicineForecastSummary[] = [];
  const facilitySummaries: DistrictForecastOverview["facilitySummaries"] = [];

  for (const fac of allFacilities) {
    const facMeds = allInventory.filter((m) => m.facilityId === fac.id);
    if (!facMeds.length) continue;

    let fac30DayTotal = 0;
    let facCriticalCount = 0;

    for (const med of facMeds) {
      const medTxs = allTransactions.filter((t) => t.facilityId === fac.id && t.medicineId === med.id);
      const forecast = calculateMedicineForecast(med, fac, 60, 30, medTxs);
      const { historicalSeries, forecastSeries, chartData, ...summary } = forecast;
      allSummaries.push(summary);

      fac30DayTotal += summary.predicted30DayDemand;
      if (summary.stockOutRisk === "CRITICAL") {
        facCriticalCount++;
      }
    }

    facilitySummaries.push({
      facilityId: fac.id,
      facilityName: fac.name,
      facilityType: fac.facilityType,
      skusCount: facMeds.length,
      criticalCount: facCriticalCount,
      predicted30DayDemand: fac30DayTotal,
    });
  }

  const critical = allSummaries.filter((s) => s.stockOutRisk === "CRITICAL");
  const high = allSummaries.filter((s) => s.stockOutRisk === "HIGH");
  const moderate = allSummaries.filter((s) => s.stockOutRisk === "MODERATE");
  const safe = allSummaries.filter((s) => s.stockOutRisk === "SAFE");

  const totalCurrentStockUnits = allSummaries.reduce((sum, s) => sum + s.currentStock, 0);
  const totalPredicted30DayDemandUnits = allSummaries.reduce((sum, s) => sum + s.predicted30DayDemand, 0);
  const urgentReorders = allSummaries.filter((s) => s.reorderRecommendation.urgency === "immediate" || s.reorderRecommendation.urgency === "urgent");

  // Top risk medicines sorted by days until stock-out ascending
  const topRisk = [...allSummaries]
    .sort((a, b) => (a.daysUntilStockOut ?? 999) - (b.daysUntilStockOut ?? 999))
    .slice(0, 8);

  return {
    district,
    totalSKUs: allSummaries.length,
    criticalStockOutCount: critical.length,
    highStockOutCount: high.length,
    moderateStockOutCount: moderate.length,
    safeStockOutCount: safe.length,
    totalCurrentStockUnits,
    totalPredicted30DayDemandUnits,
    urgentReorderSKUs: urgentReorders.length,
    facilitySummaries,
    topRiskMedicines: topRisk,
    disclaimer: PROTOTYPE_FORECAST_DISCLAIMER,
  };
}
