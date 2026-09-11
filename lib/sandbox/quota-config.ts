/**
 * Operational Quota Configuration for Marketing Sandbox (Phase 3B.1)
 * 
 * Server-side only. Thresholds are operational configurations,
 * NOT hard-coded immutable product promises.
 * 
 * Values are parsed safely from process.env with robust non-zero positive fallbacks.
 */

export interface SandboxQuotaConfig {
  dailySessionLimit: number;
  dailySimulationLimit: number;
  hourlySimulationBurstLimit: number;
}

const DEFAULT_DAILY_SESSION_LIMIT = 10;
const DEFAULT_DAILY_SIMULATION_LIMIT = 30;
const DEFAULT_HOURLY_SIMULATION_BURST_LIMIT = 15;

function parsePositiveInt(val: string | undefined, fallback: number): number {
  if (!val) return fallback;
  const parsed = parseInt(val.trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getSandboxQuotaConfig(): SandboxQuotaConfig {
  return {
    dailySessionLimit: parsePositiveInt(
      process.env.SANDBOX_DAILY_SESSION_LIMIT,
      DEFAULT_DAILY_SESSION_LIMIT,
    ),
    dailySimulationLimit: parsePositiveInt(
      process.env.SANDBOX_DAILY_SIMULATION_LIMIT,
      DEFAULT_DAILY_SIMULATION_LIMIT,
    ),
    hourlySimulationBurstLimit: parsePositiveInt(
      process.env.SANDBOX_HOURLY_SIMULATION_BURST_LIMIT,
      DEFAULT_HOURLY_SIMULATION_BURST_LIMIT,
    ),
  };
}

