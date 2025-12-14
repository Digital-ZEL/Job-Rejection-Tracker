"""
CorMedix Inc. (CRMD) - DCF Valuation Model
As-of Date: December 12, 2025
Current Price: $11.49
"""

import numpy as np

# ============================================================================
# INPUTS TABLE (with source labels and dates)
# ============================================================================
print("=" * 80)
print("INPUTS TABLE")
print("=" * 80)
print(f"{'Input':<40} {'Value':<20} {'Units':<15} {'Source':<30} {'Date':<15}")
print("-" * 80)

inputs = [
    ("Current Stock Price", 11.49, "USD/share", "Market Data", "2025-12-12"),
    ("Shares Outstanding (diluted)", 78.35, "millions", "Market Data", "2025-12-12"),
    ("Market Cap", 900.0, "USD millions", "Calculated", "2025-12-12"),
    ("Cash (Q3 2025)", 55.7, "USD millions", "10-Q Q3 2025", "2025-09-30"),
    ("Cash (June 2025)", 190.7, "USD millions", "10-Q Q2 2025", "2025-06-30"),
    ("Convertible Debt", 150.0, "USD millions", "10-Q Q2 2025", "2025-06-30"),
    ("Net Debt (Q3)", -134.3, "USD millions", "Calculated", "2025-09-30"),
    ("10-Year Treasury Rate", 4.19, "percent", "Treasury Data", "2025-12-12"),
    ("Risk-Free Rate (Rf)", 0.0419, "decimal", "Treasury Data", "2025-12-12"),
    ("Revenue 2020", 0.239, "USD millions", "10-K FY2020", "2020-12-31"),
    ("Revenue 2021", 0.191, "USD millions", "10-K FY2021", "2021-12-31"),
    ("Revenue 2022", 0.065, "USD millions", "10-K FY2022", "2022-12-31"),
    ("Revenue 2023", 0.0, "USD millions", "10-K FY2023", "2023-12-31"),
    ("Revenue 2024", 43.47, "USD millions", "10-K FY2024", "2024-12-31"),
    ("Revenue Q3 2025", 104.3, "USD millions", "10-Q Q3 2025", "2025-09-30"),
    ("Revenue Q3 2025 Annualized", 417.2, "USD millions", "Calculated", "2025-09-30"),
    ("Operating Income 2024", -19.32, "USD millions", "10-K FY2024", "2024-12-31"),
    ("Net Income Q3 2025", 108.6, "USD millions", "10-Q Q3 2025", "2025-09-30"),
    ("Tax Rate (assumed)", 0.21, "decimal", "Assumed (US corporate)", "2025-12-12"),
    ("Beta (assumed)", 1.2, "unitless", "Assumed (small biotech)", "2025-12-12"),
    ("Market Risk Premium", 0.06, "decimal", "Assumed", "2025-12-12"),
    ("Cost of Debt (assumed)", 0.08, "decimal", "Assumed (convertible)", "2025-12-12"),
]

for inp in inputs:
    print(f"{inp[0]:<40} {inp[1]:<20} {inp[2]:<15} {inp[3]:<30} {inp[4]:<15}")

print("\n")

# ============================================================================
# VALUATION ASSUMPTIONS
# ============================================================================
print("=" * 80)
print("VALUATION ASSUMPTIONS")
print("=" * 80)

# Base case assumptions
base_revenue_2025 = 350.0  # Pro forma guidance post-Melinta
base_revenue_2026 = 420.0
base_revenue_2027 = 480.0
base_revenue_2028 = 530.0
base_revenue_2029 = 570.0
base_revenue_2030 = 600.0  # Terminal year

# Growth rates
base_growth_2026 = (base_revenue_2026 / base_revenue_2025) - 1
base_growth_2027 = (base_revenue_2027 / base_revenue_2026) - 1
base_growth_2028 = (base_revenue_2028 / base_revenue_2027) - 1
base_growth_2029 = (base_revenue_2029 / base_revenue_2028) - 1
base_growth_2030 = (base_revenue_2030 / base_revenue_2029) - 1
terminal_growth = 0.03  # 3% long-term growth

# Margin assumptions (improving over time as scale and synergies kick in)
base_op_margin_2025 = 0.05  # 5% operating margin
base_op_margin_2026 = 0.12  # 12%
base_op_margin_2027 = 0.18  # 18%
base_op_margin_2028 = 0.22  # 22%
base_op_margin_2029 = 0.25  # 25%
base_op_margin_2030 = 0.26  # 26% (terminal)

# Tax rate
tax_rate = 0.21

# Depreciation & Amortization (assumed as % of revenue)
da_pct = 0.02  # 2% of revenue

# Capital Expenditures (assumed as % of revenue)
capex_pct = 0.03  # 3% of revenue

# Change in Working Capital (assumed as % of revenue change)
wc_pct = 0.10  # 10% of revenue change

# Bull case (higher growth, better margins)
bull_revenue_2025 = 375.0
bull_revenue_2026 = 470.0
bull_revenue_2027 = 560.0
bull_revenue_2028 = 640.0
bull_revenue_2029 = 710.0
bull_revenue_2030 = 770.0
bull_op_margin_2025 = 0.08
bull_op_margin_2026 = 0.15
bull_op_margin_2027 = 0.22
bull_op_margin_2028 = 0.26
bull_op_margin_2029 = 0.29
bull_op_margin_2030 = 0.30

# Bear case (slower growth, lower margins)
bear_revenue_2025 = 325.0
bear_revenue_2026 = 380.0
bear_revenue_2027 = 420.0
bear_revenue_2028 = 450.0
bear_revenue_2029 = 470.0
bear_revenue_2030 = 480.0
bear_op_margin_2025 = 0.02
bear_op_margin_2026 = 0.08
bear_op_margin_2027 = 0.12
bear_op_margin_2028 = 0.15
bear_op_margin_2029 = 0.18
bear_op_margin_2030 = 0.20

print(f"Base Case Terminal Growth: {terminal_growth*100:.1f}%")
print(f"Tax Rate: {tax_rate*100:.1f}%")
print(f"D&A as % of Revenue: {da_pct*100:.1f}%")
print(f"Capex as % of Revenue: {capex_pct*100:.1f}%")
print(f"Working Capital as % of Revenue Change: {wc_pct*100:.1f}%")
print("\n")

# ============================================================================
# WACC CALCULATION
# ============================================================================
print("=" * 80)
print("WACC CALCULATION")
print("=" * 80)

rf = 0.0419  # Risk-free rate
beta = 1.2  # Assumed beta for small biotech
market_risk_premium = 0.06  # 6% market risk premium
cost_of_equity = rf + beta * market_risk_premium

# Debt structure (as of Q3 2025)
debt = 150.0  # Convertible debt
equity_market_cap = 900.0  # Market cap
total_ev = equity_market_cap + debt - 55.7  # EV = Equity + Debt - Cash

debt_weight = debt / (debt + equity_market_cap)
equity_weight = equity_market_cap / (debt + equity_market_cap)

cost_of_debt = 0.08  # Assumed 8% for convertible debt
tax_rate_wacc = 0.21

wacc = (equity_weight * cost_of_equity) + (debt_weight * cost_of_debt * (1 - tax_rate_wacc))

print(f"Risk-Free Rate (Rf): {rf*100:.2f}%")
print(f"Beta: {beta:.2f}")
print(f"Market Risk Premium: {market_risk_premium*100:.1f}%")
print(f"Cost of Equity: {cost_of_equity*100:.2f}%")
print(f"Cost of Debt: {cost_of_debt*100:.1f}%")
print(f"Tax Rate: {tax_rate_wacc*100:.1f}%")
print(f"Debt Weight: {debt_weight*100:.1f}%")
print(f"Equity Weight: {equity_weight*100:.1f}%")
print(f"WACC: {wacc*100:.2f}%")
print("\n")

# ============================================================================
# BASE CASE DCF
# ============================================================================
print("=" * 80)
print("BASE CASE DCF")
print("=" * 80)

years = [2025, 2026, 2027, 2028, 2029, 2030]
base_revenues = [base_revenue_2025, base_revenue_2026, base_revenue_2027, 
                 base_revenue_2028, base_revenue_2029, base_revenue_2030]
base_margins = [base_op_margin_2025, base_op_margin_2026, base_op_margin_2027,
                base_op_margin_2028, base_op_margin_2029, base_op_margin_2030]

print(f"{'Year':<8} {'Revenue':<15} {'Op Margin':<15} {'EBIT':<15} {'Tax':<15} {'NOPAT':<15}")
print("-" * 80)

base_fcffs = []
base_pvs = []

for i, year in enumerate(years):
    revenue = base_revenues[i]
    margin = base_margins[i]
    ebit = revenue * margin
    tax = ebit * tax_rate
    nopat = ebit - tax
    
    # D&A
    da = revenue * da_pct
    
    # Capex
    capex = revenue * capex_pct
    
    # Change in Working Capital
    if i == 0:
        prev_revenue = 43.47  # 2024 revenue
    else:
        prev_revenue = base_revenues[i-1]
    revenue_change = revenue - prev_revenue
    delta_wc = revenue_change * wc_pct
    
    # FCFF
    fcff = nopat + da - capex - delta_wc
    
    # Discount factor
    discount_factor = 1 / ((1 + wacc) ** (i + 0.25))  # 0.25 for Q4 2025 timing
    pv = fcff * discount_factor
    
    base_fcffs.append(fcff)
    base_pvs.append(pv)
    
    print(f"{year:<8} ${revenue:<14.1f} {margin*100:<14.1f}% ${ebit:<14.1f} ${tax:<14.1f} ${nopat:<14.1f}")

print("\n")
print(f"{'Year':<8} {'FCFF':<15} {'Discount Factor':<20} {'PV of FCFF':<15}")
print("-" * 80)

for i, year in enumerate(years):
    print(f"{year:<8} ${base_fcffs[i]:<14.1f} {1/((1+wacc)**(i+0.25)):<20.4f} ${base_pvs[i]:<14.1f}")

# Terminal Value
terminal_revenue = base_revenue_2030
terminal_ebit = terminal_revenue * base_op_margin_2030
terminal_nopat = terminal_ebit * (1 - tax_rate)
terminal_da = terminal_revenue * da_pct
terminal_capex = terminal_revenue * capex_pct
terminal_delta_wc = terminal_revenue * terminal_growth * wc_pct
terminal_fcff = terminal_nopat + terminal_da - terminal_capex - terminal_delta_wc

terminal_value = terminal_fcff / (wacc - terminal_growth)
pv_terminal = terminal_value / ((1 + wacc) ** 5.25)

print(f"\nTerminal FCFF (2030): ${terminal_fcff:.1f}M")
print(f"Terminal Value: ${terminal_value:.1f}M")
print(f"PV of Terminal Value: ${pv_terminal:.1f}M")

# Enterprise Value
pv_cf_sum = sum(base_pvs)
enterprise_value = pv_cf_sum + pv_terminal

print(f"\nSum of PV of FCFF (2025-2030): ${pv_cf_sum:.1f}M")
print(f"Enterprise Value: ${enterprise_value:.1f}M")

# Equity Value
net_debt_q3 = 150.0 - 55.7  # Debt - Cash
equity_value_base = enterprise_value - net_debt_q3

# Per Share
shares_outstanding = 78.35
value_per_share_base = equity_value_base / shares_outstanding

print(f"Net Debt (Q3 2025): ${net_debt_q3:.1f}M")
print(f"Equity Value: ${equity_value_base:.1f}M")
print(f"Shares Outstanding: {shares_outstanding:.2f}M")
print(f"Intrinsic Value per Share (Base): ${value_per_share_base:.2f}")
print(f"Current Price: $11.49")
print(f"Upside/(Downside): {((value_per_share_base / 11.49) - 1) * 100:.1f}%")
print("\n")

# ============================================================================
# BULL CASE DCF
# ============================================================================
print("=" * 80)
print("BULL CASE DCF")
print("=" * 80)

bull_revenues = [bull_revenue_2025, bull_revenue_2026, bull_revenue_2027,
                 bull_revenue_2028, bull_revenue_2029, bull_revenue_2030]
bull_margins = [bull_op_margin_2025, bull_op_margin_2026, bull_op_margin_2027,
                bull_op_margin_2028, bull_op_margin_2029, bull_op_margin_2030]

bull_fcffs = []
bull_pvs = []

for i, year in enumerate(years):
    revenue = bull_revenues[i]
    margin = bull_margins[i]
    ebit = revenue * margin
    tax = ebit * tax_rate
    nopat = ebit - tax
    da = revenue * da_pct
    capex = revenue * capex_pct
    if i == 0:
        prev_revenue = 43.47
    else:
        prev_revenue = bull_revenues[i-1]
    revenue_change = revenue - prev_revenue
    delta_wc = revenue_change * wc_pct
    fcff = nopat + da - capex - delta_wc
    discount_factor = 1 / ((1 + wacc) ** (i + 0.25))
    pv = fcff * discount_factor
    bull_fcffs.append(fcff)
    bull_pvs.append(pv)

terminal_revenue_bull = bull_revenue_2030
terminal_ebit_bull = terminal_revenue_bull * bull_op_margin_2030
terminal_nopat_bull = terminal_ebit_bull * (1 - tax_rate)
terminal_da_bull = terminal_revenue_bull * da_pct
terminal_capex_bull = terminal_revenue_bull * capex_pct
terminal_delta_wc_bull = terminal_revenue_bull * terminal_growth * wc_pct
terminal_fcff_bull = terminal_nopat_bull + terminal_da_bull - terminal_capex_bull - terminal_delta_wc_bull

terminal_value_bull = terminal_fcff_bull / (wacc - terminal_growth)
pv_terminal_bull = terminal_value_bull / ((1 + wacc) ** 5.25)

pv_cf_sum_bull = sum(bull_pvs)
enterprise_value_bull = pv_cf_sum_bull + pv_terminal_bull
equity_value_bull = enterprise_value_bull - net_debt_q3
value_per_share_bull = equity_value_bull / shares_outstanding

print(f"Intrinsic Value per Share (Bull): ${value_per_share_bull:.2f}")
print(f"Upside/(Downside): {((value_per_share_bull / 11.49) - 1) * 100:.1f}%")
print("\n")

# ============================================================================
# BEAR CASE DCF
# ============================================================================
print("=" * 80)
print("BEAR CASE DCF")
print("=" * 80)

bear_revenues = [bear_revenue_2025, bear_revenue_2026, bear_revenue_2027,
                 bear_revenue_2028, bear_revenue_2029, bear_revenue_2030]
bear_margins = [bear_op_margin_2025, bear_op_margin_2026, bear_op_margin_2027,
                bear_op_margin_2028, bear_op_margin_2029, bear_op_margin_2030]

bear_fcffs = []
bear_pvs = []

for i, year in enumerate(years):
    revenue = bear_revenues[i]
    margin = bear_margins[i]
    ebit = revenue * margin
    tax = ebit * tax_rate
    nopat = ebit - tax
    da = revenue * da_pct
    capex = revenue * capex_pct
    if i == 0:
        prev_revenue = 43.47
    else:
        prev_revenue = bear_revenues[i-1]
    revenue_change = revenue - prev_revenue
    delta_wc = revenue_change * wc_pct
    fcff = nopat + da - capex - delta_wc
    discount_factor = 1 / ((1 + wacc) ** (i + 0.25))
    pv = fcff * discount_factor
    bear_fcffs.append(fcff)
    bear_pvs.append(pv)

terminal_revenue_bear = bear_revenue_2030
terminal_ebit_bear = terminal_revenue_bear * bear_op_margin_2030
terminal_nopat_bear = terminal_ebit_bear * (1 - tax_rate)
terminal_da_bear = terminal_revenue_bear * da_pct
terminal_capex_bear = terminal_revenue_bear * capex_pct
terminal_delta_wc_bear = terminal_revenue_bear * terminal_growth * wc_pct
terminal_fcff_bear = terminal_nopat_bear + terminal_da_bear - terminal_capex_bear - terminal_delta_wc_bear

terminal_value_bear = terminal_fcff_bear / (wacc - terminal_growth)
pv_terminal_bear = terminal_value_bear / ((1 + wacc) ** 5.25)

pv_cf_sum_bear = sum(bear_pvs)
enterprise_value_bear = pv_cf_sum_bear + pv_terminal_bear
equity_value_bear = enterprise_value_bear - net_debt_q3
value_per_share_bear = equity_value_bear / shares_outstanding

print(f"Intrinsic Value per Share (Bear): ${value_per_share_bear:.2f}")
print(f"Upside/(Downside): {((value_per_share_bear / 11.49) - 1) * 100:.1f}%")
print("\n")

# ============================================================================
# SUMMARY
# ============================================================================
print("=" * 80)
print("VALUATION SUMMARY")
print("=" * 80)
print(f"Current Price: $11.49")
print(f"Base Case Intrinsic Value: ${value_per_share_base:.2f} ({((value_per_share_base/11.49)-1)*100:+.1f}%)")
print(f"Bull Case Intrinsic Value: ${value_per_share_bull:.2f} ({((value_per_share_bull/11.49)-1)*100:+.1f}%)")
print(f"Bear Case Intrinsic Value: ${value_per_share_bear:.2f} ({((value_per_share_bear/11.49)-1)*100:+.1f}%)")
print(f"WACC: {wacc*100:.2f}%")
print(f"Terminal Growth: {terminal_growth*100:.1f}%")
print("=" * 80)
