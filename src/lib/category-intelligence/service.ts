import {
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
import { normalizeLineItems, RawLineItem } from "./line-item-normalizer";
import { analyzeBillQuality } from "./bill-quality";
import { evaluateMarketBenchmark } from "./benchmark-engine";
import { performMarketResearch } from "./current-market-research";
import { buildCategoryAiContext } from "./context-builder";
import { getExpertPack } from "./packs";

export class CategoryIntelligenceService {
  async resolveCategory(input: ResolveCategoryInput): Promise<CategoryResolution> {
    return resolveCategory(input);
  }

  async loadExpertPack(categoryKey: string): Promise<CategoryExpertPackV1> {
    return getExpertPack(categoryKey);
  }

  async normalizeLineItems(items: RawLineItem[], categoryKey?: string): Promise<NormalizedLineItem[]> {
    return normalizeLineItems(items, categoryKey);
  }

  async analyzeBill(input: AnalyzeBillInput): Promise<BillQualityResult> {
    return analyzeBillQuality(input);
  }

  async benchmark(input: BenchmarkInput): Promise<BenchmarkResult> {
    return evaluateMarketBenchmark(input);
  }

  async researchCurrentMarket(input: MarketResearchInput): Promise<MarketResearchResult> {
    return performMarketResearch(input);
  }

  async buildAiContext(categoryKey: string): Promise<CategoryAiContext> {
    const pack = await this.loadExpertPack(categoryKey);
    const research = await this.researchCurrentMarket({ categoryKey, query: pack.displayName });
    return buildCategoryAiContext(pack, research.facts);
  }
}

export const categoryIntelligence = new CategoryIntelligenceService();
