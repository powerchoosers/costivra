import type { CategoryExpertPackV1, CategoryLineItemDefinition } from "../types";

const PROFESSIONAL_REVIEW_CAVEAT =
  "This is document and cost intelligence, not insurance, benefits, actuarial, legal, tax, or claims advice. A licensed professional must review coverage or benefits changes.";

function line(
  canonicalCode: string,
  label: string,
  aliases: string[],
  meaning: string,
  chargeClass: CategoryLineItemDefinition["chargeClass"],
  units: string[],
  expectedContext: string[],
  anomalyRules: string[],
): CategoryLineItemDefinition {
  return {
    canonicalCode,
    label,
    aliases,
    meaning,
    chargeClass,
    units,
    expectedContext,
    benchmarkable: false,
    regulatory: false,
    commonContractTreatment: ["policy_or_service_agreement"],
    anomalyRules,
  };
}

function policyPack(input: Omit<CategoryExpertPackV1, "schemaVersion" | "status" | "version" | "jurisdictions" | "effectiveFrom" | "effectiveTo" | "defaultFreshnessDays">): CategoryExpertPackV1 {
  return {
    schemaVersion: "category-expert-pack-v1",
    status: "draft",
    version: "2026.08.2-draft",
    jurisdictions: ["US"],
    effectiveFrom: null,
    effectiveTo: null,
    defaultFreshnessDays: 30,
    ...input,
    outputPolicy: {
      ...input.outputPolicy,
      requiredCaveats: Array.from(new Set([...input.outputPolicy.requiredCaveats, PROFESSIONAL_REVIEW_CAVEAT])),
      humanReviewTriggers: Array.from(new Set([...input.outputPolicy.humanReviewTriggers, "coverage_or_benefit_change_requested"])),
    },
  };
}

export const commercialPropertyPack = policyPack({
  categoryKey: "commercial-property",
  displayName: "Commercial Property Insurance",
  parentKey: "insurance-benefits",
  scope: { includes: ["commercial property", "business interruption", "equipment breakdown"], excludes: ["general liability", "workers compensation", "health benefits"], adjacentCategories: ["general-liability-bop", "umbrella-excess"] },
  documentTypes: [{ type: "insurance_policy_declaration", indicators: ["property limit", "deductible", "insured location"], requiredFields: ["state", "insured_locations", "property_limit", "deductible", "policy_period"] }],
  billAnatomy: { identityFields: ["carrier_name", "policy_number"], periodFields: ["effective_date", "expiration_date"], quantityFields: ["total_insurable_value", "building_limit", "contents_limit"], pricingFields: ["property_premium", "schedule_modification"], taxFeeFields: ["policy_fee", "surplus_lines_tax"], contractFields: ["deductible", "coinsurance", "endorsements"] },
  lineItems: [
    line("PROP-PREM-01", "Property Premium", ["Building Premium", "Property Coverage"], "Premium for physical property coverage under the policy.", "fixed", ["currency"], ["property_policy"], ["check_policy_premium_against_declaration"]),
    line("PROP-BI-01", "Business Interruption Premium", ["Business Income", "Loss of Income"], "Premium component for covered business-income loss.", "fixed", ["currency"], ["property_policy"], ["check_business_income_limit_and_period"]),
    line("PROP-DED-01", "Property Deductible", ["All Other Perils Deductible", "AOP Deductible"], "Amount retained by the insured before covered property loss payment, as stated in the policy.", "adjustment", ["currency", "percentage"], ["property_policy"], ["require_professional_review_for_deductible_change"]),
    line("PROP-FEE-01", "Policy Fee", ["Policy Fee", "Inspection Fee"], "Policy-level fee that should be traceable to the declaration, endorsement, or invoice.", "surcharge", ["currency"], ["property_policy"], ["check_fee_against_policy_documents"]),
  ],
  pricingModels: [{ key: "property-exposure", explanation: "Coverage terms and premium are evaluated only with state, location, values, occupancy, construction, protection, catastrophe exposure, limits, deductibles, and policy term.", fixedComponents: ["property_premium"], variableComponents: ["insured_values"], passThroughComponents: ["policy_fee"], formulas: ["No savings calculation without a sourced, comparable professional review."], requiredDimensions: ["state", "location", "values", "occupancy", "construction", "deductible", "term"] }],
  billQuality: { goodSignals: [], anomalyRules: [], contractChecks: [], arithmeticChecks: [] },
  benchmarkPolicy: { supportedMetrics: [], requiredDimensions: ["state", "locations", "values", "construction", "occupancy", "deductible", "loss_history"], minimumComparableCount: null, sourceRequirements: ["Customer policy documents", "licensed professional review"], quoteRequiredWhen: ["any premium or coverage comparison"], prohibitedClaims: ["Premium alone is not comparable pricing.", "Do not recommend binding, cancelling, or changing coverage."] },
  optimizationLevers: [],
  currentResearchPolicy: { mandatoryTriggers: ["state filing update", "renewal review"], preferredSources: ["https://www.serff.com/serff_filing_access.htm"], allowedDomains: ["serff.com"], freshnessDays: 30, cacheKeyDimensions: ["state", "line_of_business"] },
  outputPolicy: { requiredCaveats: ["Property coverage comparisons require a licensed professional and full risk details."], confidenceThresholds: { extraction: 0.9, classification: 0.94 }, humanReviewTriggers: ["missing_property_limit_or_deductible"] },
  evalCaseIds: ["eval-prop-001", "eval-prop-002", "eval-prop-003", "eval-prop-004", "eval-prop-005", "eval-prop-006", "eval-prop-007", "eval-prop-008", "eval-prop-009", "eval-prop-010"],
});

export const generalLiabilityBopPack = policyPack({
  categoryKey: "general-liability-bop",
  displayName: "General Liability & Business Owners Policy",
  parentKey: "insurance-benefits",
  scope: { includes: ["general liability", "business owners policy", "products and completed operations"], excludes: ["property valuation", "workers compensation", "health benefits"], adjacentCategories: ["commercial-property", "umbrella-excess"] },
  documentTypes: [{ type: "insurance_policy_declaration", indicators: ["general aggregate", "each occurrence", "BOP"], requiredFields: ["state", "operations", "revenue_or_payroll", "limits", "policy_period"] }],
  billAnatomy: { identityFields: ["carrier_name", "policy_number"], periodFields: ["effective_date", "expiration_date"], quantityFields: ["revenue", "payroll", "area"], pricingFields: ["liability_premium", "endorsement_premium"], taxFeeFields: ["policy_fee", "surplus_lines_tax"], contractFields: ["each_occurrence_limit", "aggregate_limit", "sir", "endorsements"] },
  lineItems: [
    line("GL-PREM-01", "General Liability Premium", ["CGL Premium", "Liability Premium"], "Premium for third-party liability coverage subject to stated limits and exclusions.", "fixed", ["currency"], ["liability_policy"], ["check_premium_against_declaration"]),
    line("GL-END-01", "Endorsement Premium", ["Policy Endorsement", "Additional Coverage"], "Additional premium or credit tied to a named policy endorsement.", "adjustment", ["currency"], ["liability_policy"], ["check_endorsement_against_policy_schedule"]),
    line("GL-SIR-01", "Self-Insured Retention", ["SIR", "Retention"], "Loss amount retained before the insurer responds, as defined by the policy.", "adjustment", ["currency"], ["liability_policy"], ["require_professional_review_for_sir_change"]),
    line("GL-FEE-01", "Policy Fee", ["Policy Fee", "Installment Fee"], "Policy or payment-plan fee that should be tied to policy documentation.", "surcharge", ["currency"], ["liability_policy"], ["check_fee_against_policy_documents"]),
  ],
  pricingModels: [{ key: "liability-exposure", explanation: "Liability review needs operations, revenue/payroll/area, locations, limits, SIR, products/completed operations, claims, endorsements, state, and term.", fixedComponents: ["liability_premium"], variableComponents: ["revenue", "payroll"], passThroughComponents: ["policy_fee"], formulas: ["No rate or savings calculation without comparable professional evidence."], requiredDimensions: ["operations", "state", "limits", "sir", "term"] }],
  billQuality: { goodSignals: [], anomalyRules: [], contractChecks: [], arithmeticChecks: [] },
  benchmarkPolicy: { supportedMetrics: [], requiredDimensions: ["operations", "revenue_or_payroll", "state", "limits", "sir", "claims", "endorsements"], minimumComparableCount: null, sourceRequirements: ["Customer policy documents", "licensed professional review"], quoteRequiredWhen: ["any premium or coverage comparison"], prohibitedClaims: ["Premium alone is not comparable pricing.", "Do not suggest coverage binding or cancellation."] },
  optimizationLevers: [],
  currentResearchPolicy: { mandatoryTriggers: ["state filing update", "renewal review"], preferredSources: ["https://www.serff.com/serff_filing_access.htm"], allowedDomains: ["serff.com"], freshnessDays: 30, cacheKeyDimensions: ["state", "line_of_business"] },
  outputPolicy: { requiredCaveats: ["General liability/BOP comparisons require a licensed professional and complete exposure information."], confidenceThresholds: { extraction: 0.9, classification: 0.94 }, humanReviewTriggers: ["missing_limits_or_operations"] },
  evalCaseIds: ["eval-gl-001", "eval-gl-002", "eval-gl-003", "eval-gl-004", "eval-gl-005", "eval-gl-006", "eval-gl-007", "eval-gl-008", "eval-gl-009", "eval-gl-010"],
});

export const workersCompensationPack = policyPack({
  categoryKey: "workers-compensation",
  displayName: "Workers Compensation",
  parentKey: "insurance-benefits",
  scope: { includes: ["workers compensation", "experience modification", "class-code payroll"], excludes: ["property limits", "health plan tiers", "general liability"], adjacentCategories: ["commercial-property", "group-health"] },
  documentTypes: [{ type: "workers_comp_policy", indicators: ["class code", "experience mod", "estimated annual premium"], requiredFields: ["state", "class_codes", "payroll", "experience_mod", "policy_period"] }],
  billAnatomy: { identityFields: ["carrier_name", "policy_number"], periodFields: ["effective_date", "expiration_date"], quantityFields: ["payroll_by_class", "experience_mod"], pricingFields: ["manual_rate", "carrier_multiplier", "schedule_credit_debit"], taxFeeFields: ["assessments", "expense_constant"], contractFields: ["audit_terms", "minimum_premium"] },
  lineItems: [
    line("WC-MAN-01", "Manual or Loss-Cost Premium", ["Manual Premium", "Loss Cost"], "Premium component based on class codes, payroll, state rules, and the applicable rate basis.", "usage", ["payroll"], ["workers_comp_policy"], ["check_class_code_and_payroll_support"]),
    line("WC-EMOD-01", "Experience Modification", ["Experience Mod", "Experience Rating"], "Policy adjustment based on the stated experience modification factor.", "adjustment", ["factor"], ["workers_comp_policy"], ["check_experience_mod_against_rating_worksheet"]),
    line("WC-SCHED-01", "Schedule Credit or Debit", ["Schedule Rating", "Schedule Modifier"], "Documented carrier adjustment subject to applicable state rules and underwriting documentation.", "adjustment", ["percentage"], ["workers_comp_policy"], ["require_review_of_schedule_adjustment"]),
    line("WC-ASSESS-01", "Workers Compensation Assessment", ["State Assessment", "Residual Market Assessment"], "State or policy assessment shown on the workers compensation invoice.", "assessment", ["currency", "percentage"], ["workers_comp_policy"], ["check_assessment_against_state_and_policy"]),
  ],
  pricingModels: [{ key: "class-code-payroll", explanation: "Workers compensation review uses state, class codes, payroll, manual/loss-cost rate, carrier multiplier, experience mod, schedule adjustments, assessments, audit, minimum premium, and term.", fixedComponents: ["expense_constant"], variableComponents: ["payroll_by_class"], passThroughComponents: ["assessments"], formulas: ["No pricing conclusion without the applicable rating worksheet and policy evidence."], requiredDimensions: ["state", "class_codes", "payroll", "experience_mod", "term"] }],
  billQuality: { goodSignals: [], anomalyRules: [], contractChecks: [], arithmeticChecks: [] },
  benchmarkPolicy: { supportedMetrics: [], requiredDimensions: ["state", "class_codes", "payroll", "experience_mod", "carrier_multiplier", "loss_history", "term"], minimumComparableCount: null, sourceRequirements: ["Customer policy and rating documents", "licensed professional review"], quoteRequiredWhen: ["any premium comparison"], prohibitedClaims: ["Do not use property values or health-plan attributes for workers compensation analysis.", "Premium alone is insufficient." ] },
  optimizationLevers: [],
  currentResearchPolicy: { mandatoryTriggers: ["state rate table update", "experience mod review"], preferredSources: ["https://www.ncci.com/ServicesTools/Pages/RATETABLEDATA.aspx"], allowedDomains: ["ncci.com"], freshnessDays: 30, cacheKeyDimensions: ["state", "class_code"] },
  outputPolicy: { requiredCaveats: ["Workers compensation rating requires state-specific rating evidence and professional review."], confidenceThresholds: { extraction: 0.9, classification: 0.94 }, humanReviewTriggers: ["missing_class_code_or_payroll", "experience_mod_question"] },
  evalCaseIds: ["eval-wc-001", "eval-wc-002", "eval-wc-003", "eval-wc-004", "eval-wc-005", "eval-wc-006", "eval-wc-007", "eval-wc-008", "eval-wc-009", "eval-wc-010"],
});

export const groupHealthPack = policyPack({
  categoryKey: "group-health",
  displayName: "Group Health Benefits",
  parentKey: "insurance-benefits",
  scope: { includes: ["group medical", "health plan administration", "employee benefit premiums"], excludes: ["property values", "workers comp class codes", "individual medical records"], adjacentCategories: ["stop-loss-pbm-benefits-admin", "dental-vision-life-disability"] },
  documentTypes: [{ type: "group_health_invoice", indicators: ["employee tier", "plan option", "COBRA", "administrative fee"], requiredFields: ["state", "group_size", "plan_design", "enrollment_tiers", "renewal_date"] }],
  billAnatomy: { identityFields: ["carrier_or_tpa", "group_number"], periodFields: ["coverage_month", "renewal_date"], quantityFields: ["enrollment_by_tier", "group_size"], pricingFields: ["employee_rate", "employer_rate", "admin_fee"], taxFeeFields: ["state_assessment"], contractFields: ["plan_design", "network", "funding_type", "contribution_strategy"] },
  lineItems: [
    line("GH-PREM-01", "Medical Plan Premium", ["Medical Premium", "Employee Tier Rate"], "Premium tied to a stated plan, tier, enrollment, and funding arrangement.", "fixed", ["member_month"], ["group_health_plan"], ["check_enrollment_tier_against_invoice"]),
    line("GH-ADMIN-01", "Benefits Administration Fee", ["TPA Fee", "Administrative Fee"], "Fee for group-health administration or enrollment services.", "fixed", ["member_month", "currency"], ["group_health_plan"], ["check_admin_fee_against_service_agreement"]),
    line("GH-COBRA-01", "COBRA Administration Fee", ["COBRA Fee", "Continuation Administration"], "Fee associated with continuation-coverage administration.", "fixed", ["participant_month"], ["group_health_plan"], ["check_cobra_fee_against_participant_count"]),
    line("GH-CREDIT-01", "Eligibility or Premium Credit", ["Premium Credit", "Eligibility Adjustment"], "Invoice credit or adjustment that should be supported by documented enrollment or eligibility changes.", "credit", ["currency"], ["group_health_plan"], ["check_credit_against_eligibility_record"]),
  ],
  pricingModels: [{ key: "group-health-plan", explanation: "Group-health review requires state, group size, age/composite rating, plan design, network, funding, participation, contribution, tiers, renewal, and administration terms. Individual health information never enters research.", fixedComponents: ["admin_fee"], variableComponents: ["enrollment_by_tier"], passThroughComponents: ["state_assessment"], formulas: ["No plan-price conclusion without a comparable plan design and lawful professional review."], requiredDimensions: ["state", "group_size", "plan_design", "network", "funding_type", "tiers", "renewal"] }],
  billQuality: { goodSignals: [], anomalyRules: [], contractChecks: [], arithmeticChecks: [] },
  benchmarkPolicy: { supportedMetrics: [], requiredDimensions: ["state", "group_size", "plan_design", "network", "funding_type", "tiers", "renewal"], minimumComparableCount: null, sourceRequirements: ["Customer plan documents", "licensed benefits professional review"], quoteRequiredWhen: ["any plan or premium comparison"], prohibitedClaims: ["Do not use property rules or values for group health.", "Never send PHI, diagnoses, medications, claims, or employee identity to public research.", "Premium alone is insufficient."] },
  optimizationLevers: [],
  currentResearchPolicy: { mandatoryTriggers: ["renewal review", "regulatory update"], preferredSources: ["https://www.cms.gov/marketplace/private-health-insurance/medical-loss-ratio"], allowedDomains: ["cms.gov"], freshnessDays: 30, cacheKeyDimensions: ["state", "group_size", "funding_type"] },
  outputPolicy: { requiredCaveats: ["Group-health analysis must not expose PHI and requires a licensed benefits professional for plan changes."], confidenceThresholds: { extraction: 0.9, classification: 0.94 }, humanReviewTriggers: ["health_information_present", "missing_plan_design"] },
  evalCaseIds: ["eval-gh-001", "eval-gh-002", "eval-gh-003", "eval-gh-004", "eval-gh-005", "eval-gh-006", "eval-gh-007", "eval-gh-008", "eval-gh-009", "eval-gh-010"],
});

export const stopLossPbmBenefitsAdminPack = policyPack({
  categoryKey: "stop-loss-pbm-benefits-admin",
  displayName: "Stop-Loss, PBM & Benefits Administration",
  parentKey: "insurance-benefits",
  scope: { includes: ["stop-loss", "PBM", "benefits administration", "COBRA administration"], excludes: ["employee diagnoses", "medication details", "property coverage"], adjacentCategories: ["group-health", "dental-vision-life-disability"] },
  documentTypes: [{ type: "benefits_vendor_invoice", indicators: ["specific deductible", "aggregate attachment", "PBM fee", "rebate", "PEPM"], requiredFields: ["service_period", "funding_type", "participant_count", "agreement_terms"] }],
  billAnatomy: { identityFields: ["vendor_name", "group_number"], periodFields: ["service_period", "contract_basis"], quantityFields: ["participant_count", "eligibility_count"], pricingFields: ["stop_loss_premium", "pbm_fee", "admin_fee"], taxFeeFields: ["assessments"], contractFields: ["specific_deductible", "aggregate_attachment", "rebate_terms", "compensation_disclosure"] },
  lineItems: [
    line("SL-PREM-01", "Stop-Loss Premium", ["Specific Stop-Loss", "Aggregate Stop-Loss"], "Premium for stated specific or aggregate stop-loss coverage terms.", "fixed", ["member_month", "currency"], ["stop_loss"], ["check_stop_loss_terms_against_agreement"]),
    line("PBM-ADMIN-01", "PBM Administration Fee", ["PBM Fee", "Pharmacy Administration"], "Administrative or service fee under the pharmacy-benefit agreement.", "fixed", ["claim", "member_month", "currency"], ["pbm"], ["check_fee_basis_against_agreement"]),
    line("PBM-REBATE-01", "PBM Rebate Credit", ["Rebate", "Manufacturer Rebate"], "Credit or reported amount governed by PBM rebate terms; it is not treated as verified value without contract and settlement evidence.", "credit", ["currency"], ["pbm"], ["require_contract_and_settlement_evidence"]),
    line("BEN-ADMIN-01", "Benefits Administration Fee", ["Eligibility Fee", "COBRA Administration"], "Fee for eligibility, COBRA, or benefits-administration services.", "fixed", ["participant_month", "currency"], ["benefits_administration"], ["check_participant_count_and_contract_rate"]),
  ],
  pricingModels: [{ key: "benefits-admin", explanation: "Review requires specific and aggregate terms, contract basis, premium, funding, PBM fee basis, rebate terms, administration/network fees, eligibility, COBRA, and compensation disclosure. PHI and claims detail are excluded.", fixedComponents: ["admin_fee"], variableComponents: ["participant_count"], passThroughComponents: ["assessments"], formulas: ["No savings or rebate conclusion without contract, settlement, and authorized professional review."], requiredDimensions: ["funding_type", "contract_basis", "participant_count", "specific_deductible", "aggregate_attachment", "fee_basis"] }],
  billQuality: { goodSignals: [], anomalyRules: [], contractChecks: [], arithmeticChecks: [] },
  benchmarkPolicy: { supportedMetrics: [], requiredDimensions: ["funding_type", "contract_basis", "participant_count", "stop_loss_terms", "pbm_model", "fee_basis"], minimumComparableCount: null, sourceRequirements: ["Customer agreement documents", "authorized benefits professional review"], quoteRequiredWhen: ["any pricing, rebate, or plan comparison"], prohibitedClaims: ["Do not infer PBM spread, rebate, or savings without contract and settlement evidence.", "Never send PHI, medication, claims, or employee identity to public research."] },
  optimizationLevers: [],
  currentResearchPolicy: { mandatoryTriggers: ["renewal review", "benefit regulation update"], preferredSources: ["https://www.dol.gov/agencies/ebsa"], allowedDomains: ["dol.gov"], freshnessDays: 30, cacheKeyDimensions: ["funding_type", "service_type"] },
  outputPolicy: { requiredCaveats: ["Stop-loss, PBM, and benefits-administration changes require authorized professional review and complete agreement evidence."], confidenceThresholds: { extraction: 0.9, classification: 0.94 }, humanReviewTriggers: ["health_information_present", "missing_agreement_terms", "rebate_or_spread_claim"] },
  evalCaseIds: ["eval-sl-001", "eval-sl-002", "eval-sl-003", "eval-sl-004", "eval-sl-005", "eval-sl-006", "eval-sl-007", "eval-sl-008", "eval-sl-009", "eval-sl-010"],
});
