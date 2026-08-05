import type {
  AnalyzeBillInput,
  BenchmarkInput,
  BenchmarkResult,
  BillQualityResult,
  CategoryAiContext,
  CategoryExpertPackV1,
  CategoryResolution,
  MarketResearchInput,
  MarketResearchResult,
  NormalizedLineItem,
  ResolveCategoryInput,
} from "./types";
import { resolveCategory } from "./category-resolver";
import { normalizeLineItems, type RawLineItem } from "./line-item-normalizer";
import { analyzeBillQuality } from "./bill-quality";
import { evaluateMarketBenchmark } from "./benchmark-engine";
import { performMarketResearch } from "./current-market-research";
import { buildCategoryAiContext } from "./context-builder";
import { getExpertPack, getExpertPackWithResolution, type ExpertPackResolution } from "./packs";

type BuildAiContextOptions = {
  includeCurrentResearch?: boolean;
  query?: string;
  jurisdiction?: string;
  vendorName?: string;
};

export class CategoryIntelligenceService {
  async resolveCategory(input: ResolveCategoryInput): Promise<CategoryResolution> {
    return resolveCategory(input);
  }

  async getExpertPack(categoryKey: string): Promise<CategoryExpertPackV1> {
    return getExpertPack(categoryKey);
  }

  async getExpertPackWithResolution(categoryKey: string): Promise<ExpertPackResolution> {
    return getExpertPackWithResolution(categoryKey);
  }

  async loadExpertPack(categoryKey: string): Promise<CategoryExpertPackV1> {
    return this.getExpertPack(categoryKey);
  }

  async normalizeLineItems(
    input: RawLineItem[] | { items: RawLineItem[]; categoryKey?: string },
    categoryKey?: string,
  ): Promise<NormalizedLineItem[]> {
    if (Array.isArray(input)) {
      return normalizeLineItems(input, categoryKey);
    }
    return normalizeLineItems(input.items, input.categoryKey ?? categoryKey);
  }

  async analyzeBill(input: AnalyzeBillInput): Promise<BillQualityResult> {
    return analyzeBillQuality(input);
  }

  async benchmark(input: BenchmarkInput): Promise<BenchmarkResult> {
    return evaluateMarketBenchmark(input);
  }

  async researchCurrentMarket(
    input: MarketResearchInput,
  ): Promise<MarketResearchResult> {
    return performMarketResearch(input);
  }

  async buildAiContext(
    input: string | { categoryKey: string; query?: string; jurisdiction?: string; vendorName?: string; includeCurrentResearch?: boolean },
    options: BuildAiContextOptions = {},
  ): Promise<CategoryAiContext> {
    const categoryKey = typeof input === "string" ? input : input.categoryKey;
    const opts = typeof input === "string" ? options : { ...input, ...options };
    const pack = await this.getExpertPack(categoryKey);
    const research = opts.includeCurrentResearch
      ? await this.researchCurrentMarket({
          categoryKey: pack.categoryKey,
          query: opts.query?.trim() || pack.displayName,
          jurisdiction: opts.jurisdiction,
          vendorName: opts.vendorName,
        })
      : {
          facts: [],
          freshness: "unverified" as const,
          searchPerformed: false,
        };

    return buildCategoryAiContext(pack, research.facts);
  }
}

export const categoryIntelligence = new CategoryIntelligenceService();
