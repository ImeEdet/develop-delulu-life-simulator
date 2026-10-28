import {
  accrueLoans, allowanceFor, eraFactor, livingCost, netWorth, nominal, payTuition,
  repayLoans, takeLoan, totalDebt,
} from "../../src/game/economy";
import { ageUp } from "../../src/game/simulate";
import { doAction, actionLock } from "../../src/game/actions";
import { freshLife, playYears, assert, assertEqual } from "./util";
import { setSeed } from "../../src/game/rng";

export const tests = [
  {
    name: "era factors scale historical money and never divide by zero",
    fn: () => {
      assert(eraFactor(1955) < eraFactor(1985), "1955 should be cheaper than 1985");
      assert(eraFactor(1985) < eraFactor(2020), "1985 should be cheaper than 2020");
      assert(eraFactor(1930) > 0 && eraFactor(2050) >= 1, "era anchors bounded");
    },
  },
  {
    name: "dependent children cost nothing personally and only get allowances",
    fn: () => {
      const s = freshLife(66);
      const p = s.chars[s.currentId];
      setSeed(66);
      const before = p.money;
      // simulate a young child's year directly via ageUp until age 8
      while (p.age < 8 && !s.over) {
        ageUp(s);
        while (s.pending.length) s.pending.shift();
      }
      assert(p.age >= 8, "did not age");
      assert(p.money >= before, "child lost personal money to living costs");
      assert(p.money > 0, "child received no allowance");
      assertEqual(livingCost(p, s.worldYear), 0, "child should have zero personal living cost");
    },
  },
  {
    name: "loans track principal, compound interest and repayments",
    fn: () => {
      const s = freshLife(77);
      const p = s.chars[s.currentId];
      takeLoan(p, "student", 10000, s.worldYear);
      assertEqual(totalDebt(p), 10000, "loan not recorded");
      accrueLoans(p);
      assert(totalDebt(p) > 10000, "interest did not compound");
      const after = totalDebt(p);
      const paid = repayLoans(p, 5000);
      assert(paid > 0 && totalDebt(p) === after - paid, "repayment bookkeeping wrong");
      assert(p.loans.every((l) => l.balance > 0), "paid-off loans should be pruned only at zero");
    },
  },
  {
    name: "student shortfall becomes a loan instead of an unbounded debt spiral",
    fn: () => {
      const s = freshLife(88);
      const p = s.chars[s.currentId];
      p.uni = { year: 1, major: "cs", gpa: 60 };
      p.money = 0;
      p.examScore = 40; // no scholarship
      const loansBefore = p.loans.length;
      const r = payTuition(s, p);
      assert(r.borrowed > 0, "expected borrowing when skint");
      assert(p.loans.length > loansBefore, "student loan missing");
      assert(p.money >= 0, "cash went negative");
    },
  },
  {
    name: "long lives keep cash non-negative and net worth internally consistent",
    fn: () => {
      const s = freshLife(99);
      playYears(s, 100);
      const p = s.chars[s.currentId];
      if (p.alive) {
        assert(p.money >= 0, `negative cash ${p.money}`);
        const calc = p.money - totalDebt(p) + (p.house?.value ?? 0) + (p.car?.value ?? 0);
        assertEqual(netWorth(p), calc, "net worth mismatch");
        assertEqual(p.debts, totalDebt(p), "debts field out of sync with loans");
      }
    },
  },
  {
    name: "regression: loan books stay whole-dollar and debts always equals the loan sum",
    fn: () => {
      const s = freshLife(131);
      const p = s.chars[s.currentId];
      takeLoan(p, "personal", 10000, s.worldYear);
      for (let i = 0; i < 6; i++) accrueLoans(p);
      repayLoans(p, 333.7); // a fractional budget must never mint cents
      for (const l of p.loans) assert(Number.isInteger(l.balance), `fractional balance ${l.balance}`);
      assertEqual(p.debts, totalDebt(p), "debts desynced from loan sum");
      for (let i = 0; i < 40; i++) {
        accrueLoans(p);
        repayLoans(p, (p.money + 999) * 0.3);
      }
      assertEqual(p.debts, totalDebt(p), "debts desynced after churn");
      assert(p.loans.every((l) => Number.isInteger(l.balance)), "cents leaked into loans");
    },
  },
  {
    name: "regression: family tuition support can never push a parent's cash below zero",
    fn: () => {
      const s = freshLife(141);
      const p = s.chars[s.currentId];
      p.age = 20;
      p.uni = { year: 1, major: "cs", gpa: 60 };
      p.wealthTier = 3;
      p.money = 0;
      p.examScore = 40; // no scholarship, so family support must kick in
      const parents = [p.motherId, p.fatherId]
        .map((id) => (id ? s.chars[id] : undefined))
        .filter((x): x is NonNullable<typeof x> => !!x && x.alive);
      assert(parents.length >= 1, "test needs at least one living parent");
      if (parents.length >= 2) {
        parents[0].money = 100000;
        parents[1].money = 0; // the skint parent must never go negative
      } else {
        parents[0].money = 100000;
      }
      const r = payTuition(s, p);
      assert(r.family > 0, "family support was expected");
      for (const par of parents) assert(par.money >= 0, `parent cash went negative (${par.money})`);
      assert(p.money >= 0, "student cash went negative");
    },
  },
  {
    name: "regression: action costs and locks follow the era instead of flat modern amounts",
    fn: () => {
      const s = freshLife(151);
      const p = s.chars[s.currentId];
      p.age = 25;
      p.birthYear = 1930;
      s.worldYear = 1955; // pin the calendar so era math is deterministic
      assertEqual(p.birthYear + p.age, 1955, "test setup year");
      const historicalCost = nominal(10000, 1955);
      assert(historicalCost < 10000, "1955 prices should be well below modern");
      p.money = historicalCost - 1;
      assert(!!actionLock(s, "invest"), "invest should lock just under the era-adjusted cost");
      p.money = historicalCost + 100;
      assert(!actionLock(s, "invest"), "invest should unlock at the era-adjusted cost");
      const before = p.money;
      doAction(s, "party");
      assertEqual(before - p.money, nominal(150, 1955), "party cost was not era-adjusted");
      assert(p.money >= 0, "action drove cash negative");
    },
  },
  {
    name: "allowances rise with household tier but stay pocket-money scale",
    fn: () => {
      const s = freshLife(101);
      const p = s.chars[s.currentId];
      p.age = 10;
      const amounts = [0, 1, 2, 3, 4].map((tier) => {
        p.wealthTier = tier;
        return allowanceFor(p, 2000);
      });
      for (let i = 1; i < amounts.length; i++) assert(amounts[i] >= amounts[i - 1], "allowance should rise with tier");
      assert(amounts[4] < 5000, "elite child allowance is not a salary");
    },
  },
];
