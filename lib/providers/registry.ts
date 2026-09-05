import type { IProviderAdapter } from './types';
import { DigiflazzAdapter } from './adapters/digiflazz.adapter';
import { APIGamesAdapter } from './adapters/apigames.adapter';
import { VipResellerAdapter } from './adapters/vip-reseller.adapter';
import { UniplayAdapter } from './adapters/uniplay.adapter';
import { RajabillerAdapter } from './adapters/rajabiller.adapter';

/**
 * In-Memory Code-Level Provider Adapter Registry.
 *
 * Distinguishes CODE REGISTRY from DATABASE REGISTRY:
 * - Database Registry (`public.providers`): Tracks operational switches (is_enabled,
 *   is_catalog_enabled, is_execution_enabled, is_maintenance), balances, and telemetries.
 * - Code Registry (`ProviderRegistry`): Manages executable TypeScript adapter instances
 *   available in the codebase.
 *
 * An adapter can only be executed if it is registered in this code registry AND
 * is enabled/configured in the database registry.
 */
export class ProviderRegistry {
  private adapters = new Map<string, IProviderAdapter>();

  /**
   * Registers a provider adapter implementation into the runtime registry.
   * Codes are normalized to uppercase for case-insensitive resolution.
   */
  register(adapter: IProviderAdapter): void {
    if (!adapter || !adapter.providerCode) {
      throw new Error('Cannot register provider adapter without a valid providerCode.');
    }
    const code = adapter.providerCode.trim().toUpperCase();
    this.adapters.set(code, adapter);
  }

  /**
   * Retrieves an adapter by its provider code.
   */
  get(providerCode: string): IProviderAdapter | undefined {
    if (!providerCode) return undefined;
    return this.adapters.get(providerCode.trim().toUpperCase());
  }

  /**
   * Checks whether an adapter implementation exists in code for the given provider code.
   */
  has(providerCode: string): boolean {
    if (!providerCode) return false;
    return this.adapters.has(providerCode.trim().toUpperCase());
  }

  /**
   * Returns a list of all provider codes currently registered in code.
   */
  getRegisteredCodes(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Unregisters an adapter (useful for testing or dynamic lifecycle).
   */
  unregister(providerCode: string): boolean {
    if (!providerCode) return false;
    return this.adapters.delete(providerCode.trim().toUpperCase());
  }

  /**
   * Clears all registered adapters (primarily for test suite isolation).
   */
  clear(): void {
    this.adapters.clear();
  }
}

/**
 * Global singleton instance for the application's runtime provider registry.
 * In P.4B foundation phase, no fake or stub adapters are registered.
 * Executable adapters will be registered as they are implemented in subsequent phases.
 */
export const providerRegistry = new ProviderRegistry();
providerRegistry.register(new DigiflazzAdapter());
providerRegistry.register(new APIGamesAdapter());
providerRegistry.register(new VipResellerAdapter());
providerRegistry.register(new UniplayAdapter());
providerRegistry.register(new RajabillerAdapter());


