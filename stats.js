/* Thống kê thuần (không đụng DOM) cho ngân sách và khách mời; dùng chung cho website và kiểm thử Node.js. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WeddingStats = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const num = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
  const nonneg = v => Math.max(0, num(v));
  const has = v => v !== '' && v != null;
  const DAY = 86400000;
  const dayNumber = d => { const t = Date.parse(d + 'T12:00:00Z'); return Number.isNaN(t) ? null : Math.round(t / DAY); };
  const SOON_DAYS = 14;

  /** Chi phí dự kiến của một khoản: thực tế nếu đã có, không thì dự trù. */
  const cost = x => has(x.actual) ? nonneg(x.actual) : has(x.estimate) ? nonneg(x.estimate) : 0;

  function budgetStats(budget, opts = {}) {
    const target = nonneg(opts.target), expectedGuests = nonneg(opts.expectedGuests), tableSize = Math.max(1, Math.floor(num(opts.tableSize)) || 10);
    const todayNo = opts.today ? dayNumber(opts.today) : null;
    const cats = new Map();
    let est = 0, actual = 0, paid = 0, projected = 0, uncosted = 0;
    const payments = [];
    for (const x of budget) {
      est += nonneg(x.estimate); actual += nonneg(x.actual); paid += nonneg(x.paid);
      const c = cost(x); projected += c;
      if (!has(x.estimate) && !has(x.actual)) uncosted++;
      else {
        const key = x.category || 'Khác';
        const row = cats.get(key) || { cat: key, est: 0, actual: 0, paid: 0, projected: 0, count: 0 };
        row.est += nonneg(x.estimate); row.actual += nonneg(x.actual); row.paid += nonneg(x.paid); row.projected += c; row.count++;
        cats.set(key, row);
      }
      const owed = Math.max(0, c - nonneg(x.paid));
      if (x.due && owed > 0) {
        const dueNo = dayNumber(x.due);
        let state = 'later';
        if (dueNo != null && todayNo != null) state = dueNo < todayNo ? 'overdue' : dueNo - todayNo <= SOON_DAYS ? 'soon' : 'later';
        payments.push({ id: x.id, name: x.name, category: x.category || 'Khác', vendor: x.vendor || '', due: x.due, owed, state });
      }
    }
    payments.sort((a, b) => a.due.localeCompare(b.due));
    const sumState = s => payments.filter(p => p.state === s).reduce((t, p) => t + p.owed, 0);
    const tables = expectedGuests ? Math.ceil(expectedGuests / tableSize) : 0;
    return {
      est, actual, paid, projected, uncosted, payments,
      overdueTotal: sumState('overdue'), soonTotal: sumState('soon'),
      byCategory: [...cats.values()].sort((a, b) => b.projected - a.projected),
      target, targetUsedPct: target ? Math.round(projected / target * 100) : null,
      overTarget: target ? projected > target : false, targetRemaining: target ? target - projected : null,
      perGuest: expectedGuests ? Math.round(projected / expectedGuests) : null,
      perTable: tables ? Math.round(projected / tables) : null
    };
  }

  const party = p => 1 + Math.max(0, Math.floor(num(p.plus)));
  const checked = p => p.rsvp === 'no' ? 0 : Math.min(party(p), Math.max(0, Math.floor(num(p.checkedCount))));
  const normName = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/\s+/g, ' ').trim();
  const digits = s => String(s || '').replace(/\D/g, '');

  function guestStats(groups, opts = {}) {
    const tableSize = Math.max(1, Math.floor(num(opts.tableSize)) || 10);
    const people = { yes: 0, pending: 0, maybe: 0, no: 0 }, entries = { yes: 0, pending: 0, maybe: 0, no: 0 };
    let arrived = 0, invited = 0, notInvited = 0, awaitingReply = 0, unassigned = 0;
    const tableCounts = new Map(), byName = new Map(), byPhone = new Map();
    const byGroup = groups.map(g => {
      const row = { id: g.id, name: g.name, yes: 0, pending: 0, maybe: 0, no: 0, entries: g.guests.length, expected: 0 };
      for (const p of g.guests) {
        const rsvp = people[p.rsvp] !== undefined ? p.rsvp : 'pending', n = party(p);
        entries[rsvp]++;
        if (rsvp === 'no') { continue; }
        people[rsvp] += n; row[rsvp] += n; row.expected += n; arrived += checked(p);
        if (p.invited) { invited++; if (rsvp === 'pending') awaitingReply++; } else notInvited++;
        if (p.table) tableCounts.set(String(p.table), (tableCounts.get(String(p.table)) || 0) + n); else unassigned += n;
      }
      for (const p of g.guests) {
        const nk = normName(p.name); if (nk) (byName.get(nk) || byName.set(nk, []).get(nk)).push(p.name);
        const pk = digits(p.phone); if (pk.length >= 8) (byPhone.get(pk) || byPhone.set(pk, []).get(pk)).push(p.name);
      }
      return row;
    });
    const duplicates = [
      ...[...byName].filter(([, v]) => v.length > 1).map(([key, names]) => ({ type: 'name', key, names })),
      ...[...byPhone].filter(([, v]) => v.length > 1).map(([key, names]) => ({ type: 'phone', key, names }))
    ];
    const expected = people.yes + people.pending + people.maybe;
    const overfullTables = [...tableCounts].filter(([, c]) => c > tableSize).map(([table, count]) => ({ table, count }))
      .sort((a, b) => a.table.localeCompare(b.table, undefined, { numeric: true }));
    return { people, entries, expected, arrived, byGroup, invited, notInvited, awaitingReply, unassigned, duplicates, overfullTables, tableSize, tableCounts: [...tableCounts] };
  }
  /** Màu thẻ "Chi phí thực tế": nhỏ hơn dự trù = info (cùng màu thẻ dự trù), bằng = wait (vàng), lớn hơn = danger (đỏ). */
  const actualTone = (est, actual, hasEstimate, hasActual) => !hasActual || !hasEstimate ? 'neutral' : actual < est ? 'info' : actual === est ? 'wait' : 'danger';
  /** Màu thẻ "Chưa thanh toán": còn nợ = danger (đỏ), đã trả hết = good (mint). */
  const owedTone = (owed, hasActual) => !hasActual ? 'neutral' : owed > 0 ? 'danger' : 'good';
  return { budgetStats, guestStats, cost, party, checked, actualTone, owedTone };
});
