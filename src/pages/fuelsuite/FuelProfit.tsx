/**
 * FuelSuite — LPG & Accessories Profit dashboard.
 * Revenue, cost of goods and profit for every non-fuel product (LPG cylinders,
 * burners, grills, accessories), with daily trend, product & station breakdowns.
 * White Oils (machine fuels) are excluded — they are tracked on Daily Records.
 */
import React, { useMemo } from 'react';
import {
  TrendingUp, Package, Coins, Percent, ShoppingCart, ShoppingBag, AlertTriangle,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, Cell,
} from 'recharts';
import {
  useFuelProductSales, useFuelProducts, useFuelPurchases,
} from '../../lib/fuelDb';
import { useFuelStationScope } from './fuelStationContext';
import {
  FuelPageShell, FuelSection, FuelKpiGrid, FuelTable, FuelBadge, FuelStationBadge,
  FuelExportButton, ksh, kshShort, fmtQty, fmtDate, fuelInputClass,
} from './fuelShared';
import { useFuelDateRange } from './fuelShared';

const BAR_COLORS = ['#34D399', '#8B5CF6', '#6366F1', '#F59E0B', '#38BDF8', '#A3E635', '#F87171', '#94A3B8'];

export default function FuelProfit() {
  const { data: sales } = useFuelProductSales();
  const { data: products } = useFuelProducts();
  const { data: purchases } = useFuelPurchases();
  const { isAll, scopeName, inScope } = useFuelStationScope();
  const range = useFuelDateRange();

  // Product lookup: category decides what counts as LPG & Accessories.
  const catOf = useMemo(() => new Map(products.map(p => [p.id, p.category])), [products]);
  const priceOf = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);

  // Every LPG/Accessories sale in range & scope, with its unit economics.
  const rows = useMemo(() => sales
    .filter(s => range.inRange(s.date) && inScope(s.stationId) && catOf.get(s.productId) !== 'White Oils')
    .map(s => {
      const p = priceOf.get(s.productId);
      const cost = (p?.buyingPrice || 0) * s.qty;
      return {
        ...s,
        category: p?.category || '—',
        cost,
        profit: s.total - cost,
        margin: s.total > 0 ? ((s.total - cost) / s.total) * 100 : 0,
      };
    }), [sales, range.start, range.end, inScope, catOf, priceOf]);

  const lpgPurchases = useMemo(() => purchases
    .filter(p => range.inRange(p.date) && inScope(p.stationId) && catOf.get(p.productId) !== 'White Oils')
    .reduce((a, p) => a + p.totalCost, 0), [purchases, range.start, range.end, inScope, catOf]);

  const stats = useMemo(() => {
    const revenue = rows.reduce((a, r) => a + r.total, 0);
    const cogs = rows.reduce((a, r) => a + r.cost, 0);
    const profit = revenue - cogs;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const creditRevenue = rows.filter(r => r.onCredit).reduce((a, r) => a + r.total, 0);

    // By product — top 8 by profit
    const byProduct = new Map<string, { name: string; revenue: number; profit: number; qty: number }>();
    rows.forEach(r => {
      const e = byProduct.get(r.productName) || { name: r.productName, revenue: 0, profit: 0, qty: 0 };
      e.revenue += r.total; e.profit += r.profit; e.qty += r.qty;
      byProduct.set(r.productName, e);
    });
    const productChart = [...byProduct.values()].sort((a, b) => b.profit - a.profit).slice(0, 8);

    // By station (All Stations view)
    const byStation = new Map<string, { name: string; revenue: number; profit: number }>();
    rows.forEach(r => {
      const name = r.stationName || 'Unassigned';
      const e = byStation.get(name) || { name, revenue: 0, profit: 0 };
      e.revenue += r.total; e.profit += r.profit;
      byStation.set(name, e);
    });
    const stationChart = [...byStation.values()].sort((a, b) => b.profit - a.profit);

    // Daily trend (last 14 days, matching the dashboard style)
    const trend: Array<{ key: string; label: string; revenue: number; profit: number }> = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dayRows = rows.filter(r => r.dateKey === key);
      trend.push({
        key,
        label: fmtDate(key).slice(0, 6),
        revenue: Math.round(dayRows.reduce((a, r) => a + r.total, 0)),
        profit: Math.round(dayRows.reduce((a, r) => a + r.profit, 0)),
      });
    }

    return { revenue, cogs, profit, margin, creditRevenue, productChart, stationChart, trend };
  }, [rows]);

  const negCost = stats.cogs > stats.revenue; // selling below buying price

  return (
    <FuelPageShell
      icon={Coins}
      title="LPG & Accessories Profit"
      subtitle="Revenue, cost of goods and profit from cylinders, burners, grills & accessories"
    >
      <FuelKpiGrid
        kpis={[
          { label: 'Revenue', value: ksh(stats.revenue), sub: `${rows.length} sales`, icon: ShoppingCart, tone: 'green' },
          { label: 'Cost of Goods', value: ksh(stats.cogs), sub: `stock bought: ${kshShort(lpgPurchases)}`, icon: ShoppingBag, tone: 'slate' },
          { label: 'Profit', value: ksh(stats.profit), sub: negCost ? 'selling below cost!' : `${stats.creditRevenue > 0 ? `${kshShort(stats.creditRevenue)} on credit · ` : ''}${range.label}`, icon: TrendingUp, tone: negCost ? 'red' : 'violet' },
          { label: 'Margin', value: `${stats.margin.toFixed(1)}%`, sub: stats.revenue > 0 ? 'profit ÷ revenue' : '—', icon: Percent, tone: negCost ? 'red' : 'green' },
        ]}
      />

      {negCost && rows.length > 0 && (
        <div className="text-[11px] text-amber-400 bg-amber-500/[0.06] border border-amber-500/30 rounded-lg px-3 py-2 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            Some products are selling below their buying price — check the
            buying prices in <span className="font-bold">Products &amp; Prices</span> so the profit here reflects reality.
          </span>
        </div>
      )}

      {/* Daily trend */}
      <FuelSection
        title="Profit trend — last 14 days"
        icon={TrendingUp}
        right={<range.FilterRow />}
      >
        <div style={{ width: '100%', height: 240 }}>
          {rows.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-theme-text-muted">
              No LPG / accessories sales in this period yet
            </div>
          ) : (
            <ResponsiveContainer>
              <AreaChart data={stats.trend} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.03} />
                  </linearGradient>
                  <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34D399" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#34D399" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v: number) => kshShort(v).replace('Ksh ', '')} width={56} />
                <Tooltip
                  contentStyle={{ background: '#0B0B10', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any, name: any) => [ksh(Number(v)), String(name)]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#34D399" strokeWidth={2} fill="url(#gradRevenue)" />
                <Area type="monotone" dataKey="profit" name="Profit" stroke="#8B5CF6" strokeWidth={2} fill="url(#gradProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </FuelSection>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* By product */}
        <FuelSection title="Profit by product" icon={Package}>
          <div style={{ width: '100%', height: 230 }}>
            {stats.productChart.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-theme-text-muted">No sales yet</div>
            ) : (
              <ResponsiveContainer>
                <BarChart data={stats.productChart} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v: number) => kshShort(v).replace('Ksh ', '')} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} width={110} />
                  <Tooltip
                    contentStyle={{ background: '#0B0B10', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                    formatter={(v: any) => [ksh(Number(v)), 'Profit']}
                  />
                  <Bar dataKey="profit" radius={[0, 4, 4, 0]}>
                    {stats.productChart.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </FuelSection>

        {/* By station (All Stations view only) */}
        <FuelSection title={isAll ? 'Profit by station' : `Profit — ${scopeName}`} icon={Package}>
          {isAll && stats.stationChart.length > 0 ? (
            <div style={{ width: '100%', height: 230 }}>
              <ResponsiveContainer>
                <BarChart data={stats.stationChart} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v: number) => kshShort(v).replace('Ksh ', '')} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} width={110} />
                  <Tooltip
                    contentStyle={{ background: '#0B0B10', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                    formatter={(v: any, name: any) => [ksh(Number(v)), String(name)]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="revenue" name="Revenue" fill="#34D399" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="profit" name="Profit" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="space-y-1.5 py-1">
              {stats.stationChart.length === 0 ? (
                <p className="text-xs text-theme-text-muted py-2">No sales in this period yet.</p>
              ) : stats.stationChart.map(s => (
                <div key={s.name} className="flex items-center justify-between gap-2 bg-white/[0.03] border border-theme-border rounded-lg px-3 py-2">
                  <span className="text-xs font-bold text-theme-text truncate">{s.name}</span>
                  <span className="text-[11px] font-mono shrink-0">
                    <span className="text-emerald-400 font-bold">{ksh(s.revenue)}</span>
                    {' · '}
                    <span className="text-violet-400 font-bold">{ksh(s.profit)}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </FuelSection>
      </div>

      {/* Sales detail */}
      <FuelSection
        title="Sales detail (this period)"
        icon={ShoppingCart}
        right={
          <FuelExportButton name="fuelsuite_lpg_accessories_profit" rows={rows
            .sort((a, b) => b.date - a.date)
            .map(r => ({
              Date: r.dateKey, Station: r.stationName || 'Unassigned', Product: r.productName,
              Category: r.category, Qty: r.qty, 'Unit Price': r.unitPrice, Revenue: r.total,
              Cost: r.cost, Profit: r.profit, 'Margin %': r.margin.toFixed(1),
              Payment: r.onCredit ? 'Credit' : r.paymentMethod,
            }))} />
        }
      >
        <div className={`${fuelInputClass ? '' : ''} max-h-[420px] overflow-y-auto rounded-lg border border-theme-border`}>
          <FuelTable
            headers={['Date', 'Station', 'Product', 'Qty', 'Revenue', 'Cost', 'Profit', 'Margin', 'Payment']}
            empty={rows.length === 0}
          >
            {[...rows].sort((a, b) => b.date - a.date).slice(0, 100).map(r => (
              <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="py-2.5 px-2.5 text-xs font-bold text-theme-text whitespace-nowrap">{fmtDate(r.dateKey)}</td>
                <td className="py-2.5 px-2.5"><FuelStationBadge stationName={r.stationName} /></td>
                <td className="py-2.5 px-2.5 text-xs text-theme-text">{r.productName}</td>
                <td className="py-2.5 px-2.5 text-xs font-mono text-theme-text-muted whitespace-nowrap">{fmtQty(r.qty)}</td>
                <td className="py-2.5 px-2.5 text-xs font-mono text-emerald-400 font-bold">{ksh(r.total)}</td>
                <td className="py-2.5 px-2.5 text-xs font-mono text-theme-text-muted">{ksh(r.cost)}</td>
                <td className={`py-2.5 px-2.5 text-xs font-mono font-bold ${r.profit >= 0 ? 'text-violet-400' : 'text-red-400'}`}>{ksh(r.profit)}</td>
                <td className="py-2.5 px-2.5 text-xs font-mono text-theme-text-muted">{r.margin.toFixed(0)}%</td>
                <td className="py-2.5 px-2.5">
                  <FuelBadge tone={r.onCredit ? 'amber' : 'slate'}>{r.onCredit ? 'credit' : 'cash'}</FuelBadge>
                </td>
              </tr>
            ))}
          </FuelTable>
        </div>
        <p className="text-[10px] text-theme-text-muted mt-2">
          Profit uses each product's current buying price (set in Products &amp; Prices) — past price changes are not re-calculated.
          Credit sales count as revenue made, not cash received.
        </p>
      </FuelSection>
    </FuelPageShell>
  );
}
