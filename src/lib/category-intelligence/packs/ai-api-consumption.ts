import { CategoryExpertPackV1 } from "../types";

/**
 * AI API Consumption Pack
 *
 * Scope: direct API calls to AI/ML model providers billed per token, call, media unit,
 * or fine-tuning job. Covers OpenAI, Anthropic, Google Gemini, Mistral, Cohere,
 * AWS Bedrock, Azure OpenAI, and similar model APIs.
 *
 * Distinct from:
 * - cloud-iaas-paas: Cloud infra bills per compute/storage unit, not per token.
 * - saas-subscriptions: SaaS is application-layer per-seat; AI APIs are model consumption.
 *
 * Sources and references:
 * - OpenAI Pricing (https://openai.com/pricing)
 * - Anthropic Pricing (https://www.anthropic.com/pricing)
 * - Google Cloud AI Platform Pricing (https://cloud.google.com/vertex-ai/pricing)
 * - AWS Bedrock Pricing (https://aws.amazon.com/bedrock/pricing/)
 * - Azure OpenAI Pricing (https://azure.microsoft.com/en-us/pricing/details/cognitive-services/openai-service/)
 * - Mistral AI Pricing (https://mistral.ai/pricing)
 * - FinOps Foundation FOCUS Specification (https://focus.finops.org)
 */
export const aiApiConsumptionPack: CategoryExpertPackV1 = {
  schemaVersion: "category-expert-pack-v1",
  categoryKey: "ai-api-consumption",
  displayName: "AI / ML Model API Consumption",
  parentKey: "technology",
  version: "2026.08.1",
  status: "draft",
  jurisdictions: ["US", "Global"],
  effectiveFrom: "2026-01-01",
  effectiveTo: null,
  defaultFreshnessDays: 14,

  scope: {
    includes: [
      "LLM inference via API (input/output tokens)",
      "Cached/prompt caching tokens",
      "Embedding model API calls",
      "Image, audio, and video generation API calls",
      "Speech-to-text and text-to-speech model API calls",
      "Fine-tuning job compute charges",
      "Fine-tuned model hosting fees",
      "Batch inference API (async, lower-cost)",
      "Tool use / function calling charges",
      "AI search / retrieval-augmented generation (RAG) API charges",
      "API rate limit and throughput commitments",
      "Model training jobs (Vertex AI, SageMaker, Azure ML)",
    ],
    excludes: [
      "Cloud compute instances used to self-host open-source models (use cloud-iaas-paas)",
      "SaaS AI applications with per-seat pricing (use saas-subscriptions)",
      "GPU hardware purchases or on-premise AI infrastructure",
      "Human-in-the-loop annotation services (separate category)",
    ],
    adjacentCategories: ["cloud-iaas-paas", "saas-subscriptions"],
  },

  documentTypes: [
    {
      type: "ai_api_provider_invoice",
      indicators: [
        "Token Usage",
        "Input Tokens",
        "Output Tokens",
        "API Calls",
        "Model",
        "GPT-4",
        "Claude",
        "Gemini",
        "Tokens Used",
        "Usage Credits",
      ],
      requiredFields: [
        "account_id",
        "billing_period",
        "model_name",
        "token_count",
        "total_cost",
      ],
    },
    {
      type: "cloud_ai_service_invoice",
      indicators: [
        "AWS Bedrock",
        "Azure OpenAI",
        "Vertex AI",
        "SageMaker",
        "AI Platform",
        "Inference",
        "Throughput",
      ],
      requiredFields: [
        "account_id",
        "service_name",
        "billing_period",
        "total_charges",
        "usage_breakdown",
      ],
    },
  ],

  billAnatomy: {
    identityFields: [
      "organization_id",
      "api_account_id",
      "invoice_or_statement_id",
      "provider_name",
    ],
    periodFields: [
      "billing_period_start",
      "billing_period_end",
    ],
    quantityFields: [
      "input_tokens",
      "output_tokens",
      "cached_tokens",
      "api_requests",
      "images_generated",
      "audio_seconds",
      "fine_tuning_tokens",
    ],
    pricingFields: [
      "input_token_rate_per_1m",
      "output_token_rate_per_1m",
      "cache_read_rate_per_1m",
      "model_name",
      "batch_discount_pct",
    ],
    taxFeeFields: [
      "digital_services_tax",
    ],
    contractFields: [
      "committed_throughput_tpm",
      "provisioned_throughput_cost",
      "enterprise_agreement_term",
    ],
  },

  lineItems: [
    {
      canonicalCode: "AIAPI-INPUT-01",
      label: "LLM Input Token Charge",
      aliases: [
        "Input Tokens",
        "Prompt Tokens",
        "Context Tokens",
        "Input Processing",
      ],
      meaning:
        "Per-million-token charge for text or multimodal tokens passed as input (prompt/context) to a language model API. Rate varies by model, provider, and context length.",
      chargeClass: "usage",
      units: ["tokens (millions)"],
      calculation: "(input_tokens / 1_000_000) * input_rate_per_1m",
      expectedContext: ["ai_api_provider_invoice"],
      benchmarkable: true,
      regulatory: false,
      commonContractTreatment: ["usage_based"],
      anomalyRules: [
        "check_input_context_length_vs_task_requirement",
        "check_system_prompt_redundancy_inflating_input_tokens",
      ],
    },
    {
      canonicalCode: "AIAPI-OUTPUT-01",
      label: "LLM Output Token Charge",
      aliases: [
        "Output Tokens",
        "Completion Tokens",
        "Generated Tokens",
        "Response Tokens",
      ],
      meaning:
        "Per-million-token charge for tokens generated by the model in response. Output is typically priced 3-5x higher than input for the same model.",
      chargeClass: "usage",
      units: ["tokens (millions)"],
      calculation: "(output_tokens / 1_000_000) * output_rate_per_1m",
      expectedContext: ["ai_api_provider_invoice"],
      benchmarkable: true,
      regulatory: false,
      commonContractTreatment: ["usage_based"],
      anomalyRules: [
        "check_output_length_vs_expected_task_output",
        "check_max_tokens_set_unnecessarily_high",
      ],
    },
    {
      canonicalCode: "AIAPI-CACHE-01",
      label: "Cached / Prompt Caching Token Charge",
      aliases: [
        "Cache Read",
        "Cache Write",
        "Prompt Cache",
        "Context Cache",
        "Cache Hit",
      ],
      meaning:
        "Charge for reading or writing a cached prompt prefix. Cache reads are typically 80-90% cheaper than fresh input processing. Cache writes may incur a one-time storage charge.",
      chargeClass: "usage",
      units: ["tokens (millions)"],
      calculation: "(cached_tokens / 1_000_000) * cache_rate_per_1m",
      expectedContext: ["ai_api_provider_invoice"],
      benchmarkable: false,
      regulatory: false,
      commonContractTreatment: ["usage_based"],
      anomalyRules: [
        "check_no_caching_on_repeated_system_prompt",
        "check_cache_miss_rate_above_80_pct_on_stable_prompts",
      ],
    },
    {
      canonicalCode: "AIAPI-EMBED-01",
      label: "Embedding Model API Charge",
      aliases: [
        "Embeddings",
        "text-embedding",
        "Embedding API",
        "ada-002",
        "text-embedding-3",
        "Vector Embedding",
      ],
      meaning:
        "Per-token charge to generate dense vector representations of text for semantic search, retrieval, or classification.",
      chargeClass: "usage",
      units: ["tokens (millions)"],
      calculation: "(tokens / 1_000_000) * embedding_rate_per_1m",
      expectedContext: ["ai_api_provider_invoice"],
      benchmarkable: true,
      regulatory: false,
      commonContractTreatment: ["usage_based"],
      anomalyRules: [
        "check_redundant_re_embedding_of_unchanged_content",
      ],
    },
    {
      canonicalCode: "AIAPI-IMAGE-01",
      label: "Image Generation API Charge",
      aliases: [
        "DALL-E",
        "Imagen",
        "Stable Diffusion API",
        "Image Generation",
        "per-image",
      ],
      meaning:
        "Per-image charge for AI image generation. Price varies by resolution, model, and number of variants.",
      chargeClass: "usage",
      units: ["images"],
      calculation: "images_generated * price_per_image",
      expectedContext: ["ai_api_provider_invoice"],
      benchmarkable: true,
      regulatory: false,
      commonContractTreatment: ["usage_based"],
      anomalyRules: ["check_image_generation_volume_vs_expected_use_case"],
    },
    {
      canonicalCode: "AIAPI-BATCH-01",
      label: "Batch Inference / Async API Charge",
      aliases: [
        "Batch API",
        "Async Batch",
        "Batch Processing",
        "Offline Inference",
      ],
      meaning:
        "Reduced-rate charge for asynchronous batch inference (e.g. OpenAI Batch API at 50% discount, Anthropic Message Batches). Jobs may take hours to complete.",
      chargeClass: "usage",
      units: ["tokens (millions)"],
      calculation: "(tokens / 1_000_000) * batch_rate_per_1m",
      expectedContext: ["ai_api_provider_invoice"],
      benchmarkable: false,
      regulatory: false,
      commonContractTreatment: ["usage_based"],
      anomalyRules: [
        "check_real_time_inference_used_where_batch_suitable",
      ],
    },
    {
      canonicalCode: "AIAPI-FINETUNE-01",
      label: "Fine-Tuning Job Charge",
      aliases: [
        "Fine-Tuning",
        "Training Run",
        "Model Training",
        "PEFT",
        "LoRA Training",
      ],
      meaning:
        "Per-token or per-hour charge for a fine-tuning job that adapts a base model to domain-specific data.",
      chargeClass: "usage",
      units: ["tokens (millions)", "compute-hours"],
      calculation: "(training_tokens / 1_000_000) * finetune_rate OR compute_hours * gpu_rate",
      expectedContext: ["ai_api_provider_invoice"],
      benchmarkable: false,
      regulatory: false,
      commonContractTreatment: ["usage_based"],
      anomalyRules: [
        "check_repeated_fine_tuning_runs_without_evaluation",
      ],
    },
    {
      canonicalCode: "AIAPI-HOSTED-01",
      label: "Hosted Fine-Tuned Model Fee",
      aliases: [
        "Hosted Model",
        "Custom Model Hosting",
        "Fine-Tuned Endpoint",
        "Model Deployment",
      ],
      meaning:
        "Per-hour charge for keeping a fine-tuned or custom model endpoint provisioned and available for inference.",
      chargeClass: "fixed",
      units: ["hours"],
      calculation: "hosting_hours * hosted_model_rate",
      expectedContext: ["ai_api_provider_invoice"],
      benchmarkable: false,
      regulatory: false,
      commonContractTreatment: ["usage_based"],
      anomalyRules: [
        "check_hosted_model_with_near_zero_requests",
      ],
    },
    {
      canonicalCode: "AIAPI-PROV-01",
      label: "Provisioned Throughput / Reserved Capacity",
      aliases: [
        "Provisioned Throughput",
        "Reserved Throughput",
        "Throughput Units",
        "PTU",
        "Committed Throughput",
      ],
      meaning:
        "Pre-committed throughput allocation (tokens per minute or requests per minute) that guarantees consistent latency at a fixed monthly or hourly cost, regardless of actual usage.",
      chargeClass: "fixed",
      units: ["throughput-units", "hours"],
      calculation: "committed_tpm * provisioned_rate OR hourly_ptus * hourly_rate",
      expectedContext: ["ai_api_provider_invoice"],
      benchmarkable: false,
      regulatory: false,
      commonContractTreatment: ["committed_term"],
      anomalyRules: [
        "check_provisioned_throughput_utilization_below_70_pct",
        "check_provisioned_vs_on_demand_breakeven",
      ],
    },
    {
      canonicalCode: "AIAPI-AUDIO-01",
      label: "Audio / Speech Model API Charge",
      aliases: [
        "Whisper",
        "Speech-to-Text",
        "Text-to-Speech",
        "TTS",
        "STT",
        "Audio Transcription",
        "Audio Generation",
      ],
      meaning:
        "Per-minute or per-character charge for speech recognition (STT) or speech synthesis (TTS) model API calls.",
      chargeClass: "usage",
      units: ["minutes", "characters"],
      calculation: "audio_minutes * stt_rate OR characters * tts_rate",
      expectedContext: ["ai_api_provider_invoice"],
      benchmarkable: true,
      regulatory: false,
      commonContractTreatment: ["usage_based"],
      anomalyRules: [],
    },
  ],

  pricingModels: [
    {
      key: "per_token_on_demand",
      explanation:
        "Pay-as-you-go per million input/output tokens. Rates vary by model tier: frontier models (GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro) are 10-100x more expensive per token than smaller or open-weight equivalents. Batch APIs typically offer 50% discount vs. real-time.",
      fixedComponents: [],
      variableComponents: ["input_tokens", "output_tokens", "cached_tokens"],
      passThroughComponents: ["digital_services_tax"],
      formulas: [
        "total = (input_mtokens * input_rate) + (output_mtokens * output_rate) + (cached_mtokens * cache_rate) + tax",
      ],
      requiredDimensions: ["provider", "model_name", "api_type", "batch_vs_realtime"],
    },
    {
      key: "provisioned_throughput",
      explanation:
        "Fixed monthly or hourly commitment for a guaranteed token-per-minute capacity. Cost is fixed regardless of actual usage. Efficient at high utilization (>70%); wasteful below.",
      fixedComponents: ["provisioned_throughput_commitment"],
      variableComponents: [],
      passThroughComponents: [],
      formulas: [
        "total = committed_tpm_capacity * throughput_unit_rate * hours",
      ],
      requiredDimensions: ["provider", "model_name", "committed_tpm", "term_months"],
    },
  ],

  billQuality: {
    goodSignals: [
      {
        ruleId: "signal-aiapi-model-tiering",
        description: "Model selection documented and aligned with task complexity — cheaper models used for simple tasks.",
        severity: "info",
        deterministic: false,
        requiredFields: ["model_name", "task_type"],
        evidenceRequired: false,
        currentResearchRequired: false,
      },
    ],
    anomalyRules: [
      {
        ruleId: "rule-aiapi-frontier-overuse",
        description: "Frontier model (GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro) used for tasks where a smaller model would be sufficient.",
        severity: "medium",
        deterministic: false,
        requiredFields: ["model_name", "task_classification"],
        evidenceRequired: false,
        currentResearchRequired: false,
      },
      {
        ruleId: "rule-aiapi-no-caching",
        description: "Repeated identical system prompts not leveraging prompt caching where supported.",
        severity: "medium",
        deterministic: false,
        requiredFields: ["cache_read_tokens", "cache_write_tokens", "total_input_tokens"],
        evidenceRequired: true,
        currentResearchRequired: false,
      },
      {
        ruleId: "rule-aiapi-prov-low-utilization",
        description: "Provisioned throughput utilization below 70% — committed capacity going unused.",
        severity: "high",
        deterministic: true,
        requiredFields: ["committed_tpm", "actual_tpm_used"],
        evidenceRequired: true,
        currentResearchRequired: false,
      },
      {
        ruleId: "rule-aiapi-idle-hosted-endpoint",
        description: "Fine-tuned model hosted endpoint has near-zero inference requests for 7+ days.",
        severity: "high",
        deterministic: true,
        requiredFields: ["hosted_endpoint_requests", "hosting_cost"],
        evidenceRequired: true,
        currentResearchRequired: false,
      },
    ],
    contractChecks: [
      {
        ruleId: "check-aiapi-prov-breakeven",
        description: "Verify provisioned throughput commitment utilization meets breakeven before renewal.",
        severity: "high",
        deterministic: true,
        requiredFields: ["committed_tpm", "actual_tpm_used", "on_demand_equivalent_cost"],
        evidenceRequired: true,
        currentResearchRequired: false,
      },
    ],
    arithmeticChecks: [
      {
        ruleId: "arith-aiapi-invoice-total",
        description: "Sum of (input_tokens * input_rate) + (output_tokens * output_rate) + other charges equals invoice total.",
        severity: "high",
        deterministic: true,
        requiredFields: ["input_tokens", "output_tokens", "input_rate", "output_rate", "invoice_total"],
        evidenceRequired: true,
        currentResearchRequired: false,
      },
    ],
  },

  benchmarkPolicy: {
    supportedMetrics: [
      "cost_per_1m_input_tokens_by_model",
      "cost_per_1m_output_tokens_by_model",
      "blended_cost_per_task_completion",
    ],
    requiredDimensions: [
      "provider",
      "model_name",
      "model_version",
      "api_type",
      "batch_vs_realtime",
    ],
    minimumComparableCount: 3,
    sourceRequirements: [
      "Provider published pricing pages (openai.com/pricing, anthropic.com/pricing, cloud.google.com/vertex-ai/pricing)",
      "Independent benchmark sources such as artificialanalysis.ai",
    ],
    quoteRequiredWhen: [
      "enterprise_volume_commitment_above_1m_tokens_per_day",
      "custom_model_deployment",
    ],
    prohibitedClaims: [
      "Citing token costs without specifying model name and version — prices change frequently and differ materially across models.",
      "Asserting savings from model downgrade without evaluation of output quality for the specific use case.",
      "Claiming a token price is a 'market rate' — AI model pricing changes on weeks-to-months cycles and must be verified at the provider's current pricing page.",
    ],
  },

  optimizationLevers: [
    {
      key: "model_tiering",
      description:
        "Route tasks by complexity: simple classification, extraction, or summarization to cheaper models (GPT-4o-mini, Claude Haiku, Gemini Flash). Reserve frontier models for complex reasoning.",
      prerequisites: ["task_classification_logic", "output_quality_eval"],
      risks: ["quality_regression_on_complex_tasks"],
      needsAuthorization: false,
    },
    {
      key: "prompt_caching",
      description:
        "Enable prompt caching for static system prompt prefixes. Reduces cache-hit input token cost by 80-90% on providers that support it (Anthropic, OpenAI, Google).",
      prerequisites: ["static_system_prompt_identified"],
      risks: ["cache_staleness_if_system_prompt_changes"],
      needsAuthorization: false,
    },
    {
      key: "batch_api",
      description:
        "Switch non-latency-sensitive workloads (bulk extraction, classification, analysis) to batch API for 50% cost reduction. Accepts async turnaround of minutes to hours.",
      prerequisites: ["workload_tolerates_async_processing"],
      risks: ["throughput_delay_in_latency_sensitive_contexts"],
      needsAuthorization: false,
    },
    {
      key: "idle_endpoint_cleanup",
      description:
        "Deprovision hosted fine-tuned model endpoints with no traffic in the last 7 days.",
      prerequisites: ["usage_metrics_available"],
      risks: ["endpoint_unavailability_if_needed_unexpectedly"],
      needsAuthorization: true,
    },
  ],

  currentResearchPolicy: {
    mandatoryTriggers: [
      "current_model_pricing_question",
      "new_model_availability_question",
      "batch_api_support_question",
      "caching_support_question",
    ],
    preferredSources: [
      "https://openai.com/pricing",
      "https://www.anthropic.com/pricing",
      "https://cloud.google.com/vertex-ai/generative-ai/pricing",
      "https://aws.amazon.com/bedrock/pricing/",
      "https://azure.microsoft.com/en-us/pricing/details/cognitive-services/openai-service/",
    ],
    allowedDomains: [
      "openai.com",
      "anthropic.com",
      "cloud.google.com",
      "aws.amazon.com",
      "microsoft.com",
      "mistral.ai",
      "cohere.com",
    ],
    freshnessDays: 14,
    cacheKeyDimensions: ["provider", "model_name", "api_type"],
  },

  outputPolicy: {
    requiredCaveats: [
      "AI model API pricing changes frequently (weeks to months). Always verify against the provider's current pricing page before citing any per-token cost.",
      "Model performance and cost cannot be compared without evaluating output quality on the specific use case. A cheaper model is not always a safe substitute.",
      "Token counts depend on the tokenizer used by each model. Do not assume 1 token = 1 word or constant across providers.",
    ],
    confidenceThresholds: { extraction: 0.90, classification: 0.93 },
    humanReviewTriggers: [
      "provisioned_throughput_utilization_below_50_pct",
      "spend_spike_exceeds_50_pct_month_over_month",
      "unrecognized_model_or_provider_on_invoice",
    ],
  },

  evalCaseIds: [
    "eval-aiapi-001",
    "eval-aiapi-002",
    "eval-aiapi-003",
    "eval-aiapi-004",
    "eval-aiapi-005",
    "eval-aiapi-006",
    "eval-aiapi-007",
    "eval-aiapi-008",
    "eval-aiapi-009",
    "eval-aiapi-010",
  ],
};
