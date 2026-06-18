
export const meta = {
  name: 'india-monthly-pick',
  description: 'Rigorous multi-stage India small/mid cap monthly stock pick: sector → universe → screen → red flags → deep dive → 1 winner',
  phases: [
    { title: 'Sector Ranking', detail: 'Rank 10 India growth sectors by 5yr CAGR potential' },
    { title: 'Company Universe', detail: 'Find small/mid cap companies in top 5 sectors' },
    { title: 'Financial Screen', detail: 'Apply revenue growth, ROE, PE, red flag filters to each company' },
    { title: 'Deep Dive', detail: 'Full deep dive on top 5 survivors' },
    { title: 'Final Pick', detail: 'Select 1 winner with strongest risk/reward and India growth alignment' },
  ],
}

const SECTOR_SCHEMA = {
  type: 'object',
  properties: {
    sectors: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          cagr_5yr_est: { type: 'string' },
          india_tailwind: { type: 'string' },
          policy_support: { type: 'string' },
          score: { type: 'number' },
          rationale: { type: 'string' }
        },
        required: ['name','cagr_5yr_est','india_tailwind','policy_support','score','rationale']
      }
    }
  },
  required: ['sectors']
}

const COMPANY_LIST_SCHEMA = {
  type: 'object',
  properties: {
    sector: { type: 'string' },
    companies: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          nse_symbol: { type: 'string' },
          market_cap_cr: { type: 'number' },
          current_price: { type: 'number' },
          description: { type: 'string' },
          revenue_growth_pct: { type: 'number' },
          roe_pct: { type: 'number' },
          debt_to_equity: { type: 'number' },
          is_profitable: { type: 'boolean' },
          pre_filter_passed: { type: 'boolean' }
        },
        required: ['name','nse_symbol','market_cap_cr','current_price','description','revenue_growth_pct','roe_pct','debt_to_equity','is_profitable','pre_filter_passed']
      }
    },
    excluded_companies: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          nse_symbol: { type: 'string' },
          reason_excluded: { type: 'string' }
        },
        required: ['name','nse_symbol','reason_excluded']
      }
    }
  },
  required: ['sector','companies','excluded_companies']
}

const SCREEN_SCHEMA = {
  type: 'object',
  properties: {
    symbol: { type: 'string' },
    name: { type: 'string' },
    sector: { type: 'string' },
    revenue_growth_pct: { type: 'number' },
    pat_growth_pct: { type: 'number' },
    roe_pct: { type: 'number' },
    ebitda_margin_pct: { type: 'number' },
    trailing_pe: { type: 'number' },
    forward_pe_est: { type: 'number' },
    debt_to_equity: { type: 'number' },
    order_book_coverage: { type: 'string' },
    red_flags: { type: 'array', items: { type: 'string' } },
    green_flags: { type: 'array', items: { type: 'string' } },
    passes_screen: { type: 'boolean' },
    screen_verdict: { type: 'string' }
  },
  required: ['symbol','name','sector','revenue_growth_pct','pat_growth_pct','roe_pct','ebitda_margin_pct','trailing_pe','forward_pe_est','debt_to_equity','red_flags','green_flags','passes_screen','screen_verdict']
}

const DEEP_DIVE_SCHEMA = {
  type: 'object',
  properties: {
    symbol: { type: 'string' },
    name: { type: 'string' },
    sector: { type: 'string' },
    thesis: { type: 'string' },
    india_growth_alignment: { type: 'string' },
    financials_summary: { type: 'string' },
    order_book_pipeline: { type: 'string' },
    management_quality: { type: 'string' },
    upcoming_catalysts: { type: 'array', items: { type: 'string' } },
    bear_case: { type: 'string' },
    valuation_assessment: { type: 'string' },
    not_value_trap_proof: { type: 'string' },
    conviction_score: { type: 'number' },
    recommended_entry: { type: 'string' }
  },
  required: ['symbol','name','sector','thesis','india_growth_alignment','financials_summary','order_book_pipeline','management_quality','upcoming_catalysts','bear_case','valuation_assessment','not_value_trap_proof','conviction_score','recommended_entry']
}

// ─── PHASE 1: Rank sectors ───────────────────────────────────────────────────
phase('Sector Ranking')
log('Ranking 10 India growth sectors by 5yr CAGR, policy support, and structural tailwind...')

const sectorRanking = await agent(
  `You are a top India equity research analyst. Research and rank these 10 sectors by their 5-year CAGR potential for Indian companies, specifically for small/mid cap opportunities:

1. Defence Electronics & Aerospace
2. Electronics Manufacturing Services (EMS) + Semiconductors
3. Specialty Chemicals
4. Renewable Energy Equipment (solar, wind manufacturing)
5. Railway & Metro Infrastructure
6. Capital Goods & Power Transmission
7. Healthcare / Hospital Chains / Diagnostics
8. Fintech & Digital Payments
9. Logistics & Warehousing
10. Water Treatment & Infrastructure

For each sector, research:
- Realistic 5yr industry CAGR estimate (India-specific, with sources)
- Key government policy tailwinds (PLI, budgets, mandates)
- India-specific structural growth driver (not global, specifically why India)
- Score out of 10 for: (CAGR potential × policy support × structural durability)

Use web search to verify CAGR estimates. Return top sectors ranked by score, with clear rationale for each score. Pick the TOP 5 sectors for further company research.`,
  { schema: SECTOR_SCHEMA, phase: 'Sector Ranking', label: 'rank-sectors' }
)

const top5Sectors = sectorRanking.sectors.sort((a,b) => b.score - a.score).slice(0,5)
log(`Top 5 sectors: ${top5Sectors.map(s => s.name).join(', ')}`)

// ─── PHASE 2: Find companies in parallel ─────────────────────────────────────
phase('Company Universe')
log('Finding small/mid cap companies (₹2,000–30,000 Cr market cap) in each top sector...')

const companyLists = await parallel(top5Sectors.map(sector => () =>
  agent(
    `Find 5-8 Indian small cap or mid cap companies in the sector: "${sector.name}" that already pass a basic financial health filter.

Sector context: ${sector.rationale}

HARD REQUIREMENTS — only include companies that meet ALL of these:
1. Listed on NSE with market cap strictly between ₹2,000 Cr and ₹30,000 Cr (small/mid cap only)
2. Primary business is in this sector (not a conglomerate where this is a minor division)
3. Revenue growth ≥ 12% in the most recent full financial year (FY25 or FY26)
4. PAT positive — the company must be profitable, not burning cash pre-revenue
5. Debt-to-equity ≤ 1.5x (no over-leveraged businesses)
6. ROE ≥ 10% (basic capital efficiency, not a destroyer of shareholder value)
7. No SEBI action, fraud allegation, or auditor qualification in the last 3 years

HOW TO FIND THEM:
- Search screener.in with filters for this sector + market cap range
- Search "[sector name] small cap stocks India FY26" on web
- Check moneycontrol sector pages, tickertape sector screener
- Verify each company's recent annual results before including

For each company you include, you MUST have verified the financial metrics above — do not include a company just because it is in the sector. If you cannot verify recent financials, exclude it.

Return: name, NSE symbol, approximate market cap in Cr, current price, and 1-line description. Only include companies that genuinely pass the filter above.`,
    { schema: COMPANY_LIST_SCHEMA, phase: 'Company Universe', label: `universe-${sector.name}` }
  )
))

const allCompanies = companyLists.filter(Boolean).flatMap(cl =>
  cl.companies
    .filter(c => c.pre_filter_passed)
    .map(c => ({ ...c, sector: cl.sector }))
)
const excluded = companyLists.filter(Boolean).flatMap(cl =>
  (cl.excluded_companies || []).map(e => `${e.nse_symbol}: ${e.reason_excluded}`)
)
log(`Pre-filter excluded: ${excluded.length} companies (${excluded.slice(0,5).join('; ')}${excluded.length > 5 ? '...' : ''})`)
log(`Passed pre-filter: ${allCompanies.length} companies into Stage 3 screen`)

// ─── PHASE 3: Screen each company ────────────────────────────────────────────
phase('Financial Screen')
log(`Screening ${allCompanies.length} companies on financials, PE, ROE, red flags...`)

const screenResults = await pipeline(
  allCompanies,
  company => agent(
    `Deep screen this Indian stock for investment quality. You must find REAL numbers from web search — do NOT make up financials.

Company: ${company.name} (NSE: ${company.nse_symbol})
Sector: ${company.sector}
Current Price: ₹${company.current_price} | Market Cap: ₹${company.market_cap_cr} Cr

Search screener.in/company/${company.nse_symbol} and recent earnings reports/news to find:

FINANCIALS (FY25 or FY26 latest available):
- Revenue YoY growth %
- PAT YoY growth %
- ROE %
- EBITDA margin %
- Debt to equity ratio
- Trailing PE
- Forward PE estimate (FY27 or FY28)
- Order book or revenue visibility (months of coverage)

RED FLAGS to check (search for these specifically):
- Promoter pledge > 20%
- Debt/equity > 1.5x
- Revenue declining or < 10% growth
- ROE < 12%
- Accounting irregularities, SEBI actions, auditor qualifications
- Working capital crisis (receivables > 200 days)
- Promoter selling large stakes recently
- Negative operating cash flow while PAT positive

GREEN FLAGS:
- Order book > 1.5x annual revenue
- Revenue growth accelerating
- Debt-free or net cash
- Promoter buying
- New large customer wins
- Margin expansion

Screening criteria — PASSES if ALL of:
1. Revenue growth >= 15% YoY
2. ROE >= 12%
3. No major accounting red flags
4. Forward PE < 60x (expensive but justifiable for high-growth)
5. Not a commodity business with no pricing power

Give honest verdict: passes or fails, with specific reasons.`,
    { schema: SCREEN_SCHEMA, phase: 'Financial Screen', label: `screen-${company.nse_symbol}` }
  )
)

const passed = screenResults.filter(Boolean).filter(r => r.passes_screen)
const failed = screenResults.filter(Boolean).filter(r => !r.passes_screen)
log(`Screen results: ${passed.length} PASS, ${failed.length} FAIL`)
log(`Survivors: ${passed.map(p => p.symbol).join(', ')}`)

// Take top 5 by forward PE attractiveness (lower is better, relative to growth)
// PEG-style: forward_pe / pat_growth_pct — lower = more attractive
const ranked = passed
  .filter(p => p.forward_pe_est > 0 && p.pat_growth_pct > 0)
  .map(p => ({ ...p, peg: p.forward_pe_est / p.pat_growth_pct }))
  .sort((a,b) => a.peg - b.peg)
  .slice(0, 5)

log(`Top 5 by PEG ratio for deep dive: ${ranked.map(r => r.symbol).join(', ')}`)

// ─── PHASE 4: Deep dive on top 5 survivors ───────────────────────────────────
phase('Deep Dive')
log('Running full deep dive on top 5 survivors...')

const deepDives = await parallel(ranked.map(company => () =>
  agent(
    `You are a senior India equity analyst. Do a comprehensive deep dive on this stock for a 5-10 year hold.

Company: ${company.name} (NSE: ${company.symbol})
Sector: ${company.sector}
Financials summary: Revenue growth ${company.revenue_growth_pct}%, PAT growth ${company.pat_growth_pct}%, ROE ${company.roe_pct}%, EBITDA margin ${company.ebitda_margin_pct}%, Forward PE ${company.forward_pe_est}x, D/E ${company.debt_to_equity}

Search extensively for:
1. Latest earnings call / management commentary (FY26 or Q4 FY26)
2. Order book size and composition (which customers, which segments)
3. Management track record — have they delivered on past guidance?
4. Upcoming catalysts in next 12 months (new contracts expected, capacity coming online, policy benefits)
5. Competitive moat — why can't a large cap or foreign company take this business?
6. Bear case — what would make this thesis completely wrong?
7. Valuation vs peers — how does forward PE compare to listed peers?
8. Proof it is NOT a value trap — specific evidence that growth is real and sustainable

India growth story alignment:
- Which specific government initiative or structural shift does this company directly benefit from?
- Is there a hard policy mandate (like 75% defence procurement) that protects revenue?
- Is the market they serve growing structurally, not cyclically?

Score conviction out of 10 (10 = absolute conviction, buy without hesitation).
Recommended entry: at current price / wait for dip to X / avoid.`,
    { schema: DEEP_DIVE_SCHEMA, phase: 'Deep Dive', label: `deepdive-${company.symbol}` }
  )
))

const validDives = deepDives.filter(Boolean).sort((a,b) => b.conviction_score - a.conviction_score)
log(`Deep dives complete. Conviction scores: ${validDives.map(d => `${d.symbol}:${d.conviction_score}`).join(', ')}`)

// ─── PHASE 5: Final selection ─────────────────────────────────────────────────
phase('Final Pick')
log('Selecting the single best pick...')

const winner = await agent(
  `You are the final decision maker for a monthly India stock pick. You must choose EXACTLY 1 stock for a 5-10 year buy-and-hold position.

The criteria the user cares about most:
1. Best alignment with India's structural growth story
2. NOT a value trap — forward PE must be attractive RELATIVE to growth
3. Small or mid cap that can realistically become large cap in 10 years
4. Strongest fundamentals and clearest competitive moat
5. Best upcoming catalysts and growth visibility

Here are the deep dives on the top survivors. Read all of them and pick the single best:

${validDives.map(d => `
--- ${d.symbol}: ${d.name} (${d.sector}) ---
Conviction: ${d.conviction_score}/10
Thesis: ${d.thesis}
India Growth Alignment: ${d.india_growth_alignment}
Financials: ${d.financials_summary}
Order Book/Pipeline: ${d.order_book_pipeline}
Management: ${d.management_quality}
Upcoming Catalysts: ${d.upcoming_catalysts.join('; ')}
Bear Case: ${d.bear_case}
Valuation: ${d.valuation_assessment}
Not Value Trap Proof: ${d.not_value_trap_proof}
Entry: ${d.recommended_entry}
`).join('\n')}

Also consider these that were screened out and why they were rejected:
${failed.slice(0,5).map(f => `${f.symbol} (${f.sector}): FAILED — ${f.screen_verdict}`).join('\n')}

Make the final call. Explain in detail:
- WHY this one over the others
- What makes it the best India growth story right now
- Why the valuation is compelling (not cheap for a reason)
- The 5-10 year picture in numbers
- What to watch for — what would make you change your mind

Return your complete analysis as a detailed final recommendation.`,
  { phase: 'Final Pick', label: 'final-selector' }
)

return {
  winner: validDives[0],
  all_deep_dives: validDives,
  top5_screened: ranked,
  sectors: top5Sectors,
  total_companies_considered: allCompanies.length,
  passed_screen: passed.length,
  final_analysis: winner
}
