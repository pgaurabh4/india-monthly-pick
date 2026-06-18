
export const meta = {
  name: 'india-monthly-pick',
  description: 'Rigorous India small/mid cap monthly pick: sector → broad universe (no pre-exclusions) → screen → concall deep dive on ALL survivors → 1 winner',
  phases: [
    { title: 'Sector Ranking', detail: 'Rank 10 India growth sectors by 5yr CAGR potential' },
    { title: 'Company Universe', detail: 'Find ALL small/mid cap companies in top 5 sectors — no pre-exclusions' },
    { title: 'Financial Screen', detail: 'Hard filter: growth + ROE + red flags on every company' },
    { title: 'Concall Deep Dive', detail: 'Read latest concall + IR + management guidance for EVERY survivor, derive forward PE from mgmt guidance' },
    { title: 'Final Pick', detail: 'Select 1 winner based on concall-verified thesis' },
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
          description: { type: 'string' }
        },
        required: ['name','nse_symbol','market_cap_cr','current_price','description']
      }
    }
  },
  required: ['sector','companies']
}

const SCREEN_SCHEMA = {
  type: 'object',
  properties: {
    symbol: { type: 'string' },
    name: { type: 'string' },
    sector: { type: 'string' },
    revenue_fy26_cr: { type: 'number' },
    revenue_growth_pct: { type: 'number' },
    pat_cr: { type: 'number' },
    pat_growth_pct: { type: 'number' },
    roe_pct: { type: 'number' },
    ebitda_margin_pct: { type: 'number' },
    trailing_pe: { type: 'number' },
    debt_to_equity: { type: 'number' },
    promoter_pledge_pct: { type: 'number' },
    operating_cf_positive: { type: 'boolean' },
    red_flags: { type: 'array', items: { type: 'string' } },
    green_flags: { type: 'array', items: { type: 'string' } },
    passes_screen: { type: 'boolean' },
    screen_verdict: { type: 'string' }
  },
  required: ['symbol','name','sector','revenue_growth_pct','pat_growth_pct','roe_pct','ebitda_margin_pct','trailing_pe','debt_to_equity','promoter_pledge_pct','operating_cf_positive','red_flags','green_flags','passes_screen','screen_verdict']
}

const CONCALL_DIVE_SCHEMA = {
  type: 'object',
  properties: {
    symbol: { type: 'string' },
    name: { type: 'string' },
    sector: { type: 'string' },
    // Concall sourced data
    latest_concall_date: { type: 'string' },
    concall_revenue_guidance: { type: 'string' },
    concall_margin_guidance: { type: 'string' },
    concall_capex_guidance: { type: 'string' },
    concall_order_book: { type: 'string' },
    management_tone: { type: 'string' },
    key_mgmt_quotes: { type: 'array', items: { type: 'string' } },
    guidance_track_record: { type: 'string' },
    // Forward PE derived from mgmt guidance (not analyst estimates)
    mgmt_guided_revenue_fy27: { type: 'number' },
    mgmt_guided_pat_fy27: { type: 'number' },
    forward_pe_from_mgmt_guidance: { type: 'number' },
    forward_pe_derivation: { type: 'string' },
    // Full thesis
    thesis: { type: 'string' },
    india_growth_alignment: { type: 'string' },
    competitive_moat: { type: 'string' },
    upcoming_catalysts: { type: 'array', items: { type: 'string' } },
    bear_case: { type: 'string' },
    not_value_trap_proof: { type: 'string' },
    conviction_score: { type: 'number' },
    recommended_entry: { type: 'string' }
  },
  required: ['symbol','name','sector','latest_concall_date','concall_revenue_guidance','concall_margin_guidance','concall_order_book','management_tone','key_mgmt_quotes','guidance_track_record','mgmt_guided_revenue_fy27','mgmt_guided_pat_fy27','forward_pe_from_mgmt_guidance','forward_pe_derivation','thesis','india_growth_alignment','competitive_moat','upcoming_catalysts','bear_case','not_value_trap_proof','conviction_score','recommended_entry']
}

// ─── PHASE 1: Rank sectors ────────────────────────────────────────────────────
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

For each sector, use web search to verify:
- Realistic 5yr industry CAGR estimate (India-specific, cite the source)
- Key government policy tailwinds (PLI, budgets, mandates)
- India-specific structural growth driver
- Score out of 10: (CAGR potential × policy support × structural durability)

Return ALL 10 sectors ranked by score. Top 5 will go to Phase 2.`,
  { schema: SECTOR_SCHEMA, phase: 'Sector Ranking', label: 'rank-sectors' }
)

const top5Sectors = sectorRanking.sectors.sort((a,b) => b.score - a.score).slice(0,5)
log(`Top 5 sectors: ${top5Sectors.map(s => `${s.name}(${s.score})`).join(', ')}`)

// ─── PHASE 2: BROAD company universe — NO pre-exclusions ─────────────────────
phase('Company Universe')
log('Finding ALL small/mid cap companies in each sector — no financial pre-filter, cast wide net...')

const companyLists = await parallel(top5Sectors.map(sector => () =>
  agent(
    `Find ALL Indian small cap and mid cap companies (market cap ₹1,500 Cr to ₹35,000 Cr) in the sector: "${sector.name}".

Sector: ${sector.rationale}

IMPORTANT — NO financial pre-filtering at this stage. Include every company in this sector and market cap range, even if you think their financials might be weak. The financial screen happens in the next step. Your only job here is to be COMPREHENSIVE — find every relevant company.

Search: screener.in sector pages, moneycontrol sector lists, NSE sector classifications, tickertape screener, recent "top [sector] stocks India 2025 2026" articles.

Market cap range: ₹1,500 Cr to ₹35,000 Cr (expand slightly from ₹2,000–30,000 to catch borderline cases).

For each company: name, NSE symbol, approximate market cap in Cr, current price, and 1-line description. Aim for 8–12 companies per sector. Include companies even if you are unsure about their financials — better to include and let the screen reject than to miss a winner.`,
    { schema: COMPANY_LIST_SCHEMA, phase: 'Company Universe', label: `universe-${sector.name.slice(0,20)}` }
  )
))

const allCompanies = companyLists.filter(Boolean).flatMap(cl =>
  cl.companies.map(c => ({ ...c, sector: cl.sector || top5Sectors[companyLists.filter(Boolean).indexOf(cl)]?.name || '' }))
)
log(`Total universe: ${allCompanies.length} companies across ${top5Sectors.length} sectors — now screening all`)

// ─── PHASE 3: Screen ALL companies (no cap on survivors) ─────────────────────
phase('Financial Screen')
log(`Screening all ${allCompanies.length} companies — keeping all that pass, no arbitrary top-N cap...`)

const screenResults = await pipeline(
  allCompanies,
  company => agent(
    `Screen this Indian stock rigorously. Find REAL numbers — do NOT invent financials. Search if needed.

Company: ${company.name} (NSE: ${company.nse_symbol})
Sector: ${company.sector}
Current Price: ₹${company.current_price} | Market Cap: ₹${company.market_cap_cr} Cr

Search screener.in/company/${company.nse_symbol} and latest earnings news.

Find (FY26 preferred, FY25 if FY26 not available):
- Revenue (₹ Cr) and YoY growth %
- PAT (₹ Cr) and YoY growth %
- ROE %
- EBITDA margin %
- Debt to equity ratio
- Promoter pledge %
- Is operating cash flow positive? (yes/no)
- Trailing PE (current price / TTM EPS)

HARD DISQUALIFIERS (any one = automatic FAIL):
1. Revenue growth < 10% YoY (or revenue declining)
2. PAT negative (loss-making)
3. ROE < 10%
4. Promoter pledge > 25%
5. SEBI enforcement action or auditor qualification in last 3 years
6. Debt/equity > 2.0x for a non-financial company
7. Operating cash flow negative while PAT is positive (earnings quality concern)

PASS = none of the above disqualifiers apply
FAIL = one or more disqualifiers apply (state which ones clearly)`,
    { schema: SCREEN_SCHEMA, phase: 'Financial Screen', label: `screen-${company.nse_symbol}` }
  )
)

const passed = screenResults.filter(Boolean).filter(r => r.passes_screen)
const failed = screenResults.filter(Boolean).filter(r => !r.passes_screen)
log(`Screen: ${passed.length} PASS, ${failed.length} FAIL`)
log(`Survivors for deep dive: ${passed.map(p => p.symbol).join(', ')}`)

// ─── PHASE 4: FULL concall deep dive on ALL survivors ────────────────────────
phase('Concall Deep Dive')
log(`Running full concall + IR deep dive on ALL ${passed.length} survivors — no cap, every one gets researched...`)

const deepDives = await parallel(passed.map(company => () =>
  agent(
    `You are a senior India equity analyst. Do a FULL deep dive on this stock, anchored on the most recent earnings call and investor relations documents.

Company: ${company.name} (NSE: ${company.symbol})
Sector: ${company.sector}
Screened financials: RevGrowth ${company.revenue_growth_pct}%, PAT growth ${company.pat_growth_pct}%, ROE ${company.roe_pct}%, EBITDA margin ${company.ebitda_margin_pct}%, D/E ${company.debt_to_equity}, Trailing PE ${company.trailing_pe}x

STEP 1 — FIND THE LATEST CONCALL:
Search for: "${company.name} Q4 FY26 concall transcript" OR "${company.name} Q3 FY26 earnings call" OR "${company.name} investor presentation 2026"
Check: screener.in concall notes, Tijori Finance, BSE filings, company IR website, moneycontrol earnings, alphainvestor.in

EXTRACT FROM CONCALL:
- Date of latest concall
- Management's own revenue guidance for FY27 (exact numbers if stated)
- Management's own EBITDA/margin guidance for FY27
- Order book size and composition (direct quote from management)
- Capex plans and funding sources
- Key risks management acknowledged
- Management tone: confident/cautious/defensive?
- 2–3 direct quotes from MD/CEO that reveal strategic intent
- Have they met guidance from their previous concall? (track record)

STEP 2 — DERIVE FORWARD PE FROM MANAGEMENT GUIDANCE:
Using management's own FY27 revenue and margin guidance:
- Estimate FY27 PAT = FY27 revenue × expected PAT margin
- Forward PE = Current Market Cap ÷ FY27 PAT estimate
- Show your working clearly
- DO NOT use analyst consensus estimates — use management's own numbers

STEP 3 — FULL INVESTMENT THESIS:
- What is the core thesis in 3 sentences?
- Which specific India structural theme does this align with?
- What is the competitive moat (why can't this be disrupted in 5 years)?
- Top 3 upcoming catalysts in next 12 months
- Bear case: what single thing would break the thesis entirely?
- Proof it is NOT a value trap (specific evidence, not generic claims)
- Conviction score 1–10
- Recommended entry: buy now / wait for X level / avoid`,
    { schema: CONCALL_DIVE_SCHEMA, phase: 'Concall Deep Dive', label: `concall-${company.symbol}` }
  )
))

const validDives = deepDives.filter(Boolean).sort((a,b) => b.conviction_score - a.conviction_score)
log(`Concall dives complete: ${validDives.map(d => `${d.symbol}(${d.conviction_score}/10 FwdPE:${d.forward_pe_from_mgmt_guidance}x)`).join(', ')}`)

// ─── PHASE 5: Final selection ─────────────────────────────────────────────────
phase('Final Pick')
log('Selecting the single best pick from concall-verified candidates...')

const winner = await agent(
  `You are the final decision maker. Select EXACTLY 1 stock for a 5–10 year buy-and-hold from these concall-verified deep dives.

Selection criteria (in order of importance):
1. Forward PE based on MANAGEMENT'S OWN GUIDANCE — not analyst estimates
2. India structural growth story — hard policy mandate or structural shift, not cyclical
3. Management credibility — have they delivered on prior guidance?
4. Competitive moat — why can't a large cap or foreign company take this market?
5. Valuation attractiveness — cheap relative to the growth rate (low PEG)
6. Balance sheet quality — not over-leveraged during growth phase

ALL CANDIDATES (sorted by conviction score):
${validDives.map(d => `
--- ${d.symbol}: ${d.name} ---
Sector: ${d.sector}
Conviction: ${d.conviction_score}/10
Latest Concall: ${d.latest_concall_date}
Revenue Guidance FY27: ₹${d.mgmt_guided_revenue_fy27} Cr
PAT Guidance FY27: ₹${d.mgmt_guided_pat_fy27} Cr
Forward PE (mgmt-guided): ${d.forward_pe_from_mgmt_guidance}x
PE Derivation: ${d.forward_pe_derivation}
Management Tone: ${d.management_tone}
Key Quotes: ${d.key_mgmt_quotes?.slice(0,2).join(' | ')}
Guidance Track Record: ${d.guidance_track_record}
Order Book: ${d.concall_order_book}
Moat: ${d.competitive_moat}
Bear Case: ${d.bear_case}
Not Value Trap: ${d.not_value_trap_proof}
Catalysts: ${d.upcoming_catalysts?.slice(0,3).join('; ')}
Entry: ${d.recommended_entry}
`).join('\n')}

REJECTED IN SCREEN (for context):
${failed.slice(0,8).map(f => `${f.symbol}: ${f.screen_verdict}`).join('\n')}

Make the final call with full reasoning:
- Pick 1 winner
- Explain why it beats every other candidate specifically
- Explain why forward PE from management guidance is compelling vs growth rate
- Give the 5-year and 10-year picture in numbers
- Watchlist for next month (2nd and 3rd place)`,
  { phase: 'Final Pick', label: 'final-selector' }
)

return {
  winner: validDives[0],
  all_deep_dives: validDives,
  all_screened: passed.length,
  total_universe: allCompanies.length,
  sectors: top5Sectors,
  screen_pass: passed.map(p => p.symbol),
  screen_fail: failed.map(f => ({ symbol: f.symbol, reason: f.screen_verdict })),
  final_analysis: winner
}
