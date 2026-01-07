Below is a **clean, handoff-ready summary document** you can give directly to the **next agent**.

It is written as if they are **starting fresh**, with **no prior context**, but with **all key decisions locked**, **current architecture clarified**, and **open issues explicitly listed**.

---

# 🧭 Cultivation Battle System — Guided Handoff Document (v2.0)

**Audience:** Next design / systems agent
**Role:** Systems architect + implementation guide
**Current Focus:** Battle system prototype (Unity client + server-simulated logic)
**Primary Goal:** Validate whether the **combat system is fun**, extensible, and technically viable

---

## 1️⃣ ORIGINAL WORKING RULES (DO NOT CHANGE)

You are assisting a **solo developer** building a **lean but deep cultivation RPG** prototype.

### Process rules

1. Work **one system at a time**
2. Present **2–3 options** for design decisions
3. Ask **one question at a time**
4. Prefer **simple, extensible architectures**
5. Avoid MMO-scale complexity

### Priorities (in order)

1. **Battle system** (current focus)
2. Story & progression (later)
3. Cultivation systems
4. Forging & economy
5. Multiplayer / sects

Tone:

* Collaborative
* Technical but grounded
* No over-engineering

---

## 2️⃣ PROTOTYPE SCOPE (LOCKED)

This prototype is called:

> **CultivationBattleSimulator**

### Goals

* Test **combat feel**, not full progression
* No monetization
* No full multiplayer
* Server logic simulated locally if needed

### Prototype constraints

* **Unity client**
* **UI Toolkit (UXML + USS)** for UI
* **Battle engine is server-style logic**, but may run locally
* Shared **data-driven JSON architecture** (important)

---

## 3️⃣ BATTLE STRUCTURE (LOCKED)

### Temporal structure

* **Rounds**

  * Players can reorder technique slots
* **Turns**

  * One player’s opportunity to act
  * A turn may:

    * have **0 actions** (stunned)
    * have **1 action**
    * have **2 actions** (Momentum)
* **Actions**

  * Individual executions (hit, heal, gain qi, consume stacks)

### Flow

1. Players confirm slot order
2. Round begins
3. Players alternate **turns**
4. Each turn:

   * Pre-turn status checks
   * Action(s) resolve
5. End of round → reorder allowed

---

## 4️⃣ ARCHETYPES (PROTOTYPE ONLY)

Only **three archetypes** exist in the prototype:

| Archetype           | Type     | Core Mechanic  |
| ------------------- | -------- | -------------- |
| Fire Cultivator     | Magic    | Fire / DOT     |
| Palm Cultivator     | Physical | Raw damage     |
| Sword Qi Cultivator | Hybrid   | SwordQi stacks |

### Cultivation realms (prototype)

* **Foundation Establishment**
* **Nascent Soul**

  * Unlocks **1 additional mechanic**
  * Higher stats & defense scaling

NPCs:

* Always same realm as player
* Different archetype

---

## 5️⃣ STATS MODEL (LOCKED)

There is **no resistance stat** anymore.

Only **Defense**, which scales strongly by realm.

```ts
HP
Attack { magic, physical, spiritual }   // spiritual unused for now
Defense { magic, physical, spiritual }
Speed      // hit chance calculation
Luck       // crit chance
Qi
```

### Design intent

* Foundation barely scratches Nascent Soul
* Higher realms dramatically suppress damage
* Damage always has a **minimum floor (≥1)**

---

## 6️⃣ STATUS SYSTEM (VERY IMPORTANT – LOCKED CONCEPTUALLY)

### Key realization

There is **NO separation between “status” and “stack”**.

➡️ **Everything is a Status**
➡️ **All statuses are stackable**
➡️ **Each stack has its own expiration**

### Example

* Apply Shield:

  * +2 stacks, each lasts 2 turns
* Apply another Shield:

  * +1 stack, lasts 3 turns
* Result:

  * 3 stacks
  * Each stack tracks its own remaining turns

Stacks **do not merge durations**.

---

## 7️⃣ STATUS SEMANTICS (LOCKED)

A status may:

* Have **per-stack effects**
* Have **binary effects** (exists / not exists)
* Trigger at different **phases**

### Examples

| Status      | Behavior                                                  |
| ----------- | --------------------------------------------------------- |
| Shield      | Consume 1 stack to mitigate damage                        |
| SwordQi     | Grants buffs if ≥1 stack (buff does NOT scale with count) |
| HealingAura | Heals per stack per turn                                  |
| Stun        | Consumes 1 stack to skip turn                             |

---

## 8️⃣ MECHANIC RULE SYSTEM (CORE ARCHITECTURE)

### Why this exists

* Future mechanics will explode in number
* We must **avoid bespoke logic per status**
* Everything must be:

  * extensible
  * composable
  * JSON-driven

### Concept

Statuses do **nothing by themselves**.

Instead, each status has **MechanicRules** attached to it.

> Status = data
> MechanicRule = behavior

### MechanicRule

* Triggered at a **Phase**
* Reads status stacks
* Modifies battle context

### Example rule types

* Damage multiplier if status present
* Heal per stack at turn start
* Consume stacks to skip turn
* Consume stacks to mitigate damage

---

## 9️⃣ PHASE MODEL (LOCKED)

Rules can trigger during specific phases:

```
TurnStart
PreAction
PreHit
Mitigation
PostHit
TurnEnd
RoundEnd
```

Example:

* Poison → TurnEnd
* Healing Aura → TurnStart
* Shield → Mitigation
* SwordQi buffs → PreHit

---

## 🔟 TECHNIQUES (LOCKED STRUCTURE)

### Techniques are data-driven

Techniques contain **Effects**, not logic.

Effects are:

* Serializable (JSON)
* Interpreted by engine

### Techniques can:

* Deal damage
* Heal
* Apply status
* Consume status stacks
* Be multi-hit
* Have conditional behavior
* Grant Momentum

### Effects are ordered

Later effects may depend on earlier ones.

---

## 1️⃣1️⃣ DATA-DRIVEN REQUIREMENT (CRITICAL)

This system must support:

* Server-side execution
* Client-side preview
* Shared JSON data

### Therefore:

❌ No functions in data
❌ No hard-coded TS logic in content
✅ All behaviors expressed as **RuleDef + EffectDef**

---

## 1️⃣2️⃣ BATTLE EVENTS (RENAMED)

Old name: `ActionEvent` ❌
Correct name: **`BattleEvent`** ✅

BattleEvents describe:

* HP changes
* Qi changes
* Status application / consumption
* Accuracy / crit rolls
* Turn skipped
* Momentum triggered

UI reacts to BattleEvents only.

---

## 1️⃣3️⃣ WHAT IS DONE

### Conceptually complete

* Battle flow
* Status + stack model
* Mechanic rule architecture
* JSON-first philosophy
* Defense-only scaling
* Archetypes
* Event stream model

### Partially implemented / sketched

* TypeScript typings
* Rule registry pattern
* Effect interpreter concept
* Scalar expression trees (for damage formulas)

---

## 1️⃣4️⃣ OPEN ISSUES (FOR NEXT AGENT)

These are **explicit TODOs**.

### 🔧 Architecture

1. Finalize **Scalar expression evaluator**

   * Const / Stat / Var / Add / Mul
2. Finalize **Effect interpreter**

   * Hit
   * MultiHit
   * ApplyStatus
   * ConsumeStatus
   * Conditional effect

### ⚔️ Combat math

3. Finalize **Defense → Damage curve**

   * Needs to scale across realms
4. Decide:

   * single unified defense value
   * or per-channel defense retained

### 🧠 Design clarity

5. Clarify **Momentum timing**

   * Does Momentum trigger immediately or queue?
6. Decide **accuracy floor / ceiling**
7. Decide crit scaling beyond 1.5x

### 🧪 Prototype UX

8. Simplify UI for early prototype
9. Decide what client predicts vs server authoritative

---

## 1️⃣5️⃣ NEXT RECOMMENDED STEP

The **next agent should NOT add new systems**.

They should:

👉 **Finish the runtime engine skeleton**

* Effect interpreter
* Rule interpreter
* Scalar math
* Minimal battle loop

Only **after combat feels good** do we expand.

---

## ✅ FINAL STATUS

This handoff represents a **stable architectural checkpoint**.

The design is:

* extensible
* data-driven
* future-proof
* suitable for client/server split
* appropriate for a solo dev

The next agent should treat this document as **authoritative** and proceed incrementally.

---

If you want, after this handoff we can:

* freeze this as a **Living Design v2**
* or switch to **pure implementation mode** (Unity + TS/Python server)
