'use strict';
const assert = require('assert/strict'), M = require('../js/model.js');
let checks = 0;
function ok(c, message) { checks++; assert.ok(c, message); }
function eq(a, b, message) { checks++; assert.deepEqual(a, b, message); }
function near(a, b, message, tolerance = 1e-8) { ok(Math.abs(a - b) <= tolerance, `${message}: ${a} vs ${b}`); }
const clone = x => JSON.parse(JSON.stringify(x));
const baseCosts = [[1, 2], [2, 1], [2, 4], [1, 1]], equalCosts = [[1, 2], [2, 4], [3, 6], [.5, 1]];
const shipment = (from, to, good, amount) => ({ from, to, good, amount });
// Independent oracle: direct accounting over a fixed route matrix, no model helpers.
function oracle(s, d) {
  const cost = s.scenario === 'equal' ? equalCosts : baseCosts;
  const transport = [[0, .1, .4, .4], [.1, 0, .1, .4], [.4, .1, 0, .4], [.4, .4, .4, 0]], multiplier = s.scenario === 'expensive' ? 15 : 1;
  const rows = cost.map((c, i) => ({ active: s.members.includes(M.ids[i]) || d.candidates.includes(M.ids[i]), t: 0, incoming: [0, 0], outgoing: [0, 0], baseline: 100 / Math.sqrt(c[0] * c[1]) }));
  for (const r of d.shipments) {
    const a = M.ids.indexOf(r.from), b = M.ids.indexOf(r.to), g = r.good === 'grain' ? 0 : 1;
    rows[a].t += Number(r.amount) * transport[a][b] * multiplier; rows[a].outgoing[g] += Number(r.amount); rows[b].incoming[g] += Number(r.amount);
  }
  for (let i = 0; i < 4; i++) {
    const r = rows[i], share = r.active ? Number(d.shares[i]) / 100 : .5;
    r.labor = [(100 - r.t) * share, (100 - r.t) * (1 - share)];
    r.production = r.labor.map((v, g) => v / cost[i][g]);
    r.consumption = r.production.map((v, g) => v + r.incoming[g] - r.outgoing[g]);
    r.utility = 2 * Math.sqrt(r.consumption[0] * r.consumption[1]); r.gain = r.active ? r.utility - r.baseline : 0;
  }
  return rows;
}
function compare(s, d) {
  const before = JSON.stringify([s, d]), p = M.preview(s, d), r = oracle(s, d);
  ok(p.valid, 'Fixture physically feasible');
  for (let i = 0; i < 4; i++) {
    const actual = p.rows[i], expected = r[i];
    near(actual.transport, expected.t, 'Transport'); near(actual.utility, expected.utility, 'Independent utility'); near(actual.gain, expected.gain, 'Independent gain');
    for (let g = 0; g < 2; g++) {
      near(actual.labor[g], expected.labor[g], 'Labor'); near(actual.production[g], expected.production[g], 'Production'); near(actual.imports[g], expected.incoming[g], 'Imports');
      near(actual.exports[g], expected.outgoing[g], 'Exports'); near(actual.consumption[g], expected.consumption[g], 'Consumption');
      ok(actual.exports[g] <= actual.production[g] + M.EPS, 'Own-output export limit');
    }
    near(actual.transport + actual.labor[0] + actual.labor[1], 100, 'Full labor use');
  }
  for (let g = 0; g < 2; g++) near(p.rows.reduce((v, row) => v + row.production[g], 0), p.rows.reduce((v, row) => v + row.consumption[g], 0), 'Global conservation');
  near(p.score, r.reduce((v, row) => v + row.gain, 0), 'Total score');
  eq(p.rejected, d.candidates.filter(id => r[M.ids.indexOf(id)].gain <= M.EPS).sort((a, b) => M.ids.indexOf(a) - M.ids.indexOf(b)), 'Admission test');
  eq(p.departed, s.members.filter(id => r[M.ids.indexOf(id)].gain < -M.EPS).sort((a, b) => M.ids.indexOf(a) - M.ids.indexOf(b)), 'Departure test');
  eq(JSON.stringify([s, d]), before, 'Preview immutable'); return p;
}
for (const scenario of Object.keys(M.scenarios)) {
  for (let i = 0; i < 4; i++) {
    const c = scenario === 'equal' ? equalCosts[i] : baseCosts[i], a = M.autarky(scenario, M.ids[i]);
    near(a.utility, 100 / Math.sqrt(c[0] * c[1]), 'Autarky closed form'); near(a.production[0], 50 / c[0], 'Autarky grain'); near(a.production[1], 50 / c[1], 'Autarky cloth');
    for (let step = 0; step <= 10000; step++) {
      const labor = step / 100, u = 2 * Math.sqrt((labor / c[0]) * ((100 - labor) / c[1]));
      ok(u <= a.utility + 1e-10, 'Autarky is global maximum');
    }
  }
  for (const a of M.ids) for (const b of M.ids) if (a !== b) {
    eq(M.route(scenario, a, b), M.route(scenario, b, a), 'Reciprocal transport');
    near(M.route(scenario, a, b).cost, ([a, b].includes('birch') && ![a, b].includes('dune') ? .1 : .4) * (scenario === 'expensive' ? 15 : 1), 'Route cost');
  }
  const s = M.initial(scenario), p = compare(s, M.draft()); near(p.score, 0, 'No-trade zero score', 0); eq(p.departed, [], 'Autarky stays');
}
let f = M.fixture('trade'), p = compare(f.state, f.draft);
near(p.rows[0].utility, 2 * Math.sqrt(2250), 'Worked utility'); near(p.rows[0].transport, 5, 'Worked transport'); eq(p.rows[0].consumption, [45, 50], 'Worked Alder consumption'); eq(p.rows[1].consumption, [50, 45], 'Worked Birch consumption');
eq(p.admitted, ['birch'], 'Worked admission'); ok(p.canExecute, 'Worked executable');
const original = JSON.stringify(f), first = M.execute(f.state, f.draft);
ok(first.ok, 'Worked executes'); eq(first.state.members, ['alder', 'birch'], 'Birch joins'); eq(JSON.stringify(f), original, 'Execute input immutable');
eq(first.draft.candidates, [], 'Candidates cleared'); eq(first.draft.shipments, f.draft.shipments, 'Plan retained');
first.state.history[0].plan.shipments[0].amount = 12; eq(f.draft.shipments[0].amount, 50, 'History independent');
f = M.fixture('trade'); let s = f.state, d = f.draft;
for (let turn = 1; turn <= 6; turn++) {
  const next = M.execute(s, d); ok(next.ok, 'Repeated turn'); s = next.state; d = next.draft;
  eq(s.turn, turn, 'Turn count'); near(s.score, turn * p.score, 'Repeated full gains'); near(s.cumulative[0], turn * p.rows[0].gain, 'Cumulative city gains'); eq(s.history.length, turn, 'History count');
}
ok(!M.preview(s, d).valid && !M.execute(s, d).ok, 'Turn seven blocked');
for (const id of ['transport', 'equal']) { f = M.fixture(id); p = compare(f.state, f.draft); ok(!p.canExecute, 'Refused fixture blocked'); eq(p.rejected, ['birch'], 'Birch refuses'); const next = M.execute(f.state, f.draft); ok(!next.ok && next.state === f.state, 'No partial execution'); }
near(M.preview(M.fixture('transport').state, M.fixture('transport').draft).rows[1].utility, 2 * Math.sqrt(32.5 * 31.25), 'Costly utility');
// A feasible whole-league plan independently checked in planning.
s = M.initial(); d = { candidates: ['birch', 'cedar', 'dune'], shares: [100, 0, 100, 70], shipments: [
  shipment('alder', 'birch', 'grain', 30), shipment('birch', 'alder', 'cloth', 20), shipment('cedar', 'birch', 'grain', 20),
  shipment('birch', 'cedar', 'cloth', 15), shipment('dune', 'birch', 'grain', 20), shipment('birch', 'dune', 'cloth', 30)] };
p = compare(s, d); ok(p.rows.every(r => r.gain > 0), 'All four gain'); eq(p.admitted, ['birch', 'cedar', 'dune'], 'Simultaneous admission'); eq(M.execute(s, d).state.members, M.ids, 'Full league');
// One unacceptable candidate prevents the other acceptable invitation.
f = M.fixture('trade'); f.draft.candidates.push('cedar'); p = compare(f.state, f.draft); eq(p.admitted, ['birch'], 'Proposed acceptable newcomer'); eq(p.rejected, ['cedar'], 'Neutral newcomer refuses'); ok(!M.execute(f.state, f.draft).ok, 'Admission atomic');
// Members can lose and leave; an empty league can recover with simultaneous invitations.
s = M.initial(); d = M.draft(); d.shares[0] = 100; p = compare(s, d); eq(p.departed, ['alder'], 'Founder can depart');
let next = M.execute(s, d); ok(next.ok && next.state.score < 0, 'Loss counted'); eq(next.state.members, [], 'League empty'); eq(next.draft, M.draft(), 'Departure resets draft');
const empty = next.state; f = M.fixture('trade'); f.draft.candidates = ['alder', 'birch']; next = M.execute(empty, f.draft); ok(next.ok, 'Empty league recovery'); eq(next.state.members, ['alder', 'birch'], 'Refounded league');
ok(M.execute(empty, M.draft()).ok, 'Empty league can advance without trades');
// One member departing resets all retained instructions, including shipments.
f = M.fixture('trade'); next = M.execute(f.state, f.draft); s = next.state; d = M.draft(); d.shares[0] = 100;
next = M.execute(s, d); eq(next.state.members, ['birch'], 'One stays'); eq(next.draft, M.draft(), 'All shares and shipments reset after departure');
// Duplicate shipments aggregate identically, including zero rows.
f = M.fixture('trade'); d = clone(f.draft); d.shipments[0].amount = 25; d.shipments.push(shipment('alder', 'birch', 'grain', 25), shipment('alder', 'birch', 'cloth', 0));
eq(compare(f.state, d).rows, M.preview(f.state, f.draft).rows, 'Duplicate/zero aggregation');
for (const bad of ['', ' ', 'abc', NaN, Infinity, -1, 100.01, null, true, {}, []]) {
  d = M.draft(); d.shares[0] = bad; ok(!M.preview(M.initial(), d).valid, 'Invalid share');
}
for (const bad of ['', ' ', 'abc', NaN, Infinity, -1, 200.01, null, true, {}, []]) {
  f = M.fixture('trade'); f.draft.shipments[0].amount = bad; const saved = JSON.stringify(f); ok(!M.preview(f.state, f.draft).valid, 'Invalid amount'); ok(!M.execute(f.state, f.draft).ok, 'Invalid execution'); eq(JSON.stringify(f), saved, 'Invalid immutable');
}
for (const edit of [x => x.shipments[0].from = 'missing', x => x.shipments[0].to = 'cedar', x => x.shipments[0].to = 'alder', x => x.shipments[0].good = 'gold', x => x.candidates.push('birch'), x => x.candidates.push('alder'), x => x.candidates.push('missing'), x => x.shares.pop(), x => x.shipments = null, x => x.shipments.push(null)]) {
  f = M.fixture('trade'); edit(f.draft); ok(!M.preview(f.state, f.draft).valid, 'Malformed draft');
}
f = M.fixture('trade'); f.draft.shipments = Array.from({ length: 24 }, () => shipment('alder', 'birch', 'grain', 0)); ok(M.preview(f.state, f.draft).valid, '24 allowed'); f.draft.shipments.push(f.draft.shipments[0]); ok(!M.preview(f.state, f.draft).valid, '25 rejected');
f = M.fixture('trade'); f.draft.shipments[0].amount = 100; ok(!M.preview(f.state, f.draft).valid, 'Exports cannot exceed output');
f = M.fixture('transport'); f.draft.shipments[0].amount = 100; ok(!M.preview(f.state, f.draft).valid, 'Transport cannot exceed labor');
// Imports do not authorize re-exporting: Birch's own grain output is zero.
f = M.fixture('trade'); f.draft.shipments.push(shipment('birch', 'alder', 'grain', 1)); ok(!M.preview(f.state, f.draft).valid, 'No re-export');
// Export boundary when Alder specializes: q <= 100 / 1.1.
for (const delta of [-1e-8, 0, 1e-11, 1e-8]) {
  f = M.fixture('trade'); f.draft.shipments[0].amount = 100 / 1.1 + delta;
  eq(M.preview(f.state, f.draft).valid, delta < 1e-8, 'Export tolerance');
}
// Perturb a member's 50% share around the departure threshold.
for (const offset of [.00001, .001]) { s = M.initial(); d = M.draft(); d.shares[0] += offset; const r = M.preview(s, d); eq(r.departed.length, offset === .001 ? 1 : 0, 'Membership tolerance'); }
near(M.utility(1e-300, 1e-300), 2e-300, 'Tiny utility avoids product underflow', 1e-310);
for (const badState of [{}, { ...M.initial(), turn: -1 }, { ...M.initial(), turn: .5 }, { ...M.initial(), scenario: 'constructor' }, { ...M.initial(), members: ['alder', 'alder'] }, { ...M.initial(), score: Infinity }, { ...M.initial(), history: [{}] }]) ok(!M.preview(badState, M.draft()).valid, 'Invalid state');
for (const id of Object.keys(M.prompts)) {
  f = M.fixture(id); const answer = M.prompts[id].answer;
  ok(M.checkPrompt(id, f.state, f.draft, true, answer).ok, 'Correct prompt'); ok(!M.checkPrompt(id, f.state, f.draft, false, answer).ok, 'Preview prerequisite');
  ok(!M.checkPrompt(id, f.state, f.draft, true, 'wrong').ok, 'Wrong answer'); f.draft.shares[0] -= .1; ok(!M.checkPrompt(id, f.state, f.draft, true, answer).ok, 'Edited fixture rejected');
}
ok(!M.checkPrompt('constructor', M.initial(), M.draft(), true, '').ok, 'Unknown prompt');
// Generated feasible plans: all cities active, small shipments, independent accounting.
let seed = 20261002;
function draw() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
for (const scenario of Object.keys(M.scenarios)) for (let trial = 0; trial < 1000; trial++) {
  s = M.initial(scenario); s.members = M.ids.slice(); d = M.draft(); d.shares = M.ids.map(() => 20 + draw() * 60);
  for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) if (a !== b) for (const good of M.goods) d.shipments.push(shipment(M.ids[a], M.ids[b], good, draw() * .1));
  p = compare(s, d); next = M.execute(s, d); ok(next.ok, 'Generated turn executable');
  near(next.state.score, p.score, 'Generated score'); near(next.state.cumulative.reduce((v, n) => v + n, 0), next.state.score, 'Score equals city gains');
  eq(next.state.members, M.ids.filter(id => !p.departed.includes(id)), 'Generated membership');
}
console.log(`Hansa model: ${checks.toLocaleString('en-US')} checks, 0 failures.`);
