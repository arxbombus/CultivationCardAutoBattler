# 🧭 CultivationBattleSimulator — Final Handoff Document (v3.0)

> **Purpose**: This document transfers full context, decisions, and working direction to the next agent.
>
> The next agent is assumed to be a world-class game designer and engineer. Their role is to **advise only**, propose **2–3 options for each decision**, and guide the creator through a structured, high-quality development journey.

---

## 1) Instructions for the Next Agent (ROLE & BEHAVIOR)

You are assisting a **solo developer** building a cultivation RPG prototype with long-term ambitions.

Your responsibilities:

* Act as a **senior game designer + systems architect + senior programmer**.
* Always provide **2–3 options or approaches** for decisions.
* Explain tradeoffs clearly.
* Ask questions **one at a time**.
* Avoid overengineering and unnecessary abstraction.
* Optimize for:

  * clarity
  * extensibility
  * solo-dev feasibility
  * correctness

Your role is to **advise and guide**, not dictate.

Tone:

* collaborative
* technically rigorous
* grounded
* respectful of constraints

---

## 2) Overall Plan (Project Direction)

The project is currently focused on validating whether the **battle system is fun and viable** before expanding into story, progression, or multiplayer.

High-level roadmap:

1. **Battle Engine / Simulator (current focus)**

   * Build a playable 1v1 combat simulator
   * Confirm combat feel
   * Validate mechanics, pacing, clarity

2. Story & Progression (later)

3. Cultivation systems (later)

4. Forging / Economy (later)

5. Multiplayer systems (much later)

Prototype name:

> **CultivationBattleSimulator**

Platform assumptions:

* Unity client (UI Toolkit)
* Battle engine written server-style (authoritative logic), may run locally for now
* Content intended to be JSON-driven (client + server share same data)

---

## 3) Prototype Scope (Locked)

### Archetypes in prototype

Only three playable archetypes exist for testing:

| Archetype           | Type     | Core Mechanic      |
| ------------------- | -------- | ------------------ |
| Fire Cultivator     | Magic    | DOT / fire effects |
| Palm Cultivator     | Physical | raw damage         |
| Sword Qi Cultivator | Hybrid   | SwordQi stacks     |

### Cultivation realms (prototype only)

* Foundation Establishment
* Nascent Soul

Nascent Soul should:

* feel clearly stronger
* unlock at least one new mechanic
* demonstrate realm power gap

NPC rules:

* NPC always same realm as player
* NPC always different archetype

---

## 4) Battle Structure (Locked)

### Temporal hierarchy

* **Rounds**

  * Players can reorder slots
* **Turns**

  * One player's opportunity to act
  * A turn may contain:

    * 0 actions (stunned)
    * 1 action
    * 2 actions (Momentum)
* **Actions**

  * Atomic executions (hit, heal, consume stacks, gain qi, etc.)

### Flow

1. Player sets slot order
2. Round starts
3. Players alternate turns
4. Each turn:

   * TurnStart phase
   * Action(s) resolve
   * TurnEnd phase
5. RoundEnd → reorder allowed

---

## 5) Stats Model (Current Direction)

Stats currently used:

* HP / Max HP
* Attack { magic, physical, spiritual }
* Defense { magic, physical, spiritual }
* Speed (accuracy calculation)
* Luck (crit chance)
* Qi

Design goal:

* Foundation should barely scratch Nascent Soul
* Higher realms should feel ontologically superior
* Damage must always have a minimum floor (>=1)

Damage model currently uses **Defense as a vertical scaling gate**.
Resistance was discussed but currently not finalized; defense-based suppression is the core requirement.

This area is explicitly open for refinement by the next agent.

---

## 6) Status & Stacks Model (Locked)

Critical design decision:

> There is **no separation between statuses and stacks**.
> All statuses are stackable.
> Each stack has its **own independent duration**.

Example:

* Apply Shield: +2 stacks, each lasting 2 turns
* Apply Shield again: +1 stack, lasting 3 turns
* Result: three independent stacks, each expiring on their own schedule

Stacks do not merge, refresh, or replace.

This rule applies universally (Shield, SwordQi, HealingAura, Stun, etc.).

---

## 7) Status Semantics

Different statuses may behave differently even though they share the same stack model.

Examples:

| Status      | Behavior                                                                         |
| ----------- | -------------------------------------------------------------------------------- |
| Shield      | Consume 1 stack to mitigate incoming damage                                      |
| SwordQi     | Grants buffs if at least one stack exists (buff does not scale with stack count) |
| HealingAura | Heal per stack per turn                                                          |
| Stun        | Consume 1 stack to skip next turn                                                |

All of these are implemented via rules, not hardcoded behavior.

---

## 8) Mechanic Rule Architecture (Core System)

### Design principle

Statuses do nothing inherently. Instead:

> Status = data
> Rules = behavior

Each status defines **rules** that trigger during specific phases.

### Phases currently defined

* TurnStart
* PreAction
* PreHit
* Mitigation
* PostHit
* TurnEnd
* RoundEnd

Examples:

* HealingAura heals during TurnStart
* Shield mitigates during Mitigation
* SwordQi modifies damage during PreHit
* Poison might tick during TurnEnd

### Direction for rules (JSON-first)

The system is moving toward:

* Few generic rule kinds
* Composable **conditions**
* Rules that contribute to a small, known set of outputs (modifiers, flags, etc.)

Example rule shape being explored:

```json
{
  "kind": "Modifier",
  "phase": "PreHit",
  "scope": "DamageMul",
  "modifier": 1.25,
  "requiresTags": ["sword"],
  "when": {
    "all": [
      { "kind": "HasStatus", "statusId": "SwordQi", "target": "self", "atLeast": 1 }
    ]
  }
}
```

This is preferred over an explosion of specific kinds like:

* DamageMulIfHasStatusAndTechniqueTag
* DefenseMulIfHasStatus
* etc.

This system is still under refinement.

---

## 9) Techniques & Effects

Techniques are also data-driven (JSON intended) and consist of ordered Effects.

Effects support:

* Hit
* MultiHit
* ApplyStatus
* ConsumeStatus
* Conditional behavior
* Qi gain/loss
* Momentum grant

Effects are executed in order and later effects may depend on outputs of earlier effects.

---

## 10) Data-Driven Requirement (Critical Constraint)

All content must eventually be:

* JSON-serializable
* Shared between client and server
* Interpretable by engine

This implies:

* No functions in content
* No logic embedded in data
* All behavior expressed via structured definitions

The engine should provide:

* Effect interpreter
* Rule interpreter
* Scalar/expression evaluator

---

## 11) Handling Inter-effect Data (Outputs, not arbitrary variables)

We explicitly rejected arbitrary global variables like:

```json
"storeAs": "sq"
```

Because this does not scale.

Preferred direction:

Effects have IDs and produce structured outputs, referenced explicitly:

```json
{
  "id": "consume_sq",
  "type": "ConsumeStatus",
  "out": "consumedStacks"
}
```

Later effects reference those outputs:

```json
{
  "kind": "Ref",
  "effectId": "consume_sq",
  "out": "consumedStacks"
}
```

This keeps everything:

* namespaced
* deterministic
* safe with thousands of techniques

---

## 12) Current Technical Direction for Engine

The engine architecture is trending toward:

* Content (JSON):

  * StatusDefs
  * RuleDefs
  * TechniqueDefs
  * EffectDefs

* Runtime:

  * Load content
  * Compile rules into evaluators (registry pattern)
  * Evaluate effects sequentially
  * Emit BattleEvents for UI

Pattern used:

```ts
kind → compiler → runtime evaluator
```

This allows new content to be added without rewriting engine logic.

---

## 13) Battle Events

UI does not inspect engine state directly. It reacts only to emitted events.

Event examples:

* HpDelta
* QiDelta
* StatusApplied
* StatusConsumed
* TurnSkipped
* MomentumTriggered
* AccuracyRolled
* CritRolled

These events drive animation, logs, and UI feedback.

---

## 14) What Has Been Achieved So Far

### Conceptually stable:

* Battle structure (round/turn/action)
* Status = stackable with independent durations
* Rule-based behavior model
* Data-driven architecture direction
* Output-based effect communication
* Prototype archetypes and goals

### Partially implemented / sketched:

* TypeScript-style typings
* JSON schema experiments
* Rule compiler pattern
* Effect interpreter idea

---

## 15) Open Issues / Tasks for Next Agent

These are explicit TODOs.

### Engine architecture

* Finalize Rule schema (generic Modifier + Condition approach)
* Finalize Condition language (HasStatus, TechniqueHasTag, etc.)
* Define valid modifier scopes (DamageMul, DefenseMul, SkipTurn, etc.)

### Effects

* Finalize Effect schema
* Implement interpreter skeleton for:

  * Hit
  * MultiHit
  * ApplyStatus
  * ConsumeStatus
  * Conditional effects

### Scalar math

* Define minimal expression system for numbers:

  * Const
  * Stat
  * Ref
  * Add
  * Mul

### Combat math

* Revisit Attack vs Defense vs potential Resistance model
* Ensure realm scaling works from Foundation → Nascent Soul and beyond

### UX prototype

* Define minimal Unity UI needed to test fun:

  * Slots
  * HP/Qi display
  * Action log
  * Simple animations

---

## 16) Immediate Next Step Recommendation

The next agent should not expand scope.

They should help the creator:

1. Finalize JSON schema for:

   * Status
   * Rule
   * Technique
   * Effect
2. Implement a minimal interpreter that can:

   * Load content
   * Simulate a single 1v1 battle
   * Produce BattleEvents
3. Validate combat feel

Only after combat feels good should any new systems be added.

---

## 17) Core Design Philosophy to Preserve

* Prefer simple systems that compose well
* Favor data-driven design over hardcoding
* Avoid premature abstraction
* Every new mechanic should be implementable without modifying engine code
* The battle engine should be deterministic and testable

---

## Final Note to Next Agent

This project is ambitious but being built by a single developer. The architecture must remain:

* understandable
* evolvable
* testable
* not overbuilt

Your job is to help them build the *right amount* of structure — not maximal structure.
