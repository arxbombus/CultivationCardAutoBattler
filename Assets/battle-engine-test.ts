export type DamageChannelType = "magic" | "physical" | "spiritual";
type DamageChannelProfile = {
	magic: number;
	physical: number;
	spiritual: number;
};
type BaseStats = {
	maxHealth: number;
	health: number;
	attack: DamageChannelProfile;
	defense: DamageChannelProfile;
	resistances: DamageChannelProfile;
	speed: number;
	luck: number;
	qi: number;
};
type SpecialStatusType = "swordQi";
type BaseStatusType =
	| "attackModifier"
	| "defenseModifier"
	| "resistanceModifier"
	| "speedModifier"
	| "healthOverTime"
	| "qiOverTime"
	| "stun"
	| "shield";
type StatusType = BaseStatusType | SpecialStatusType;
type BaseStatus<T extends StatusType> = {
	type: T;
	remainingTurns: number;
	isPreAction?: boolean;
	isDefaultConsume?: boolean;
};
type AttackModifierStatus = BaseStatus<"attackModifier"> & {
	attackDelta: DamageChannelProfile;
	isMultiplicative: boolean;
};
type DefenseModifierStatus = BaseStatus<"defenseModifier"> & {
	defenseDelta: DamageChannelProfile;
	isMultiplicative: boolean;
};
type ResistanceModifierStatus = BaseStatus<"resistanceModifier"> & {
	resistanceDelta: DamageChannelProfile;
	isMultiplicative: boolean;
};
type SpeedModifierStatus = BaseStatus<"speedModifier"> & {
	delta: number;
	isMultiplicative: boolean;
};
type HealthOverTimeStatus = BaseStatus<"healthOverTime"> & {
	deltaPerTurn: number;
	profile: DamageChannelProfile;
};
type QiOverTimeStatus = BaseStatus<"qiOverTime"> & {
	deltaPerTurn: number;
};
type StunStatus = BaseStatus<"stun">;
type ShieldStatus = BaseStatus<"shield"> & {
	multiplier: number;
};
type BaseStatusInstance =
	| AttackModifierStatus
	| DefenseModifierStatus
	| ResistanceModifierStatus
	| SpeedModifierStatus
	| HealthOverTimeStatus
	| QiOverTimeStatus
	| StunStatus
	| ShieldStatus;

type SpecialStatusBase<
	T extends SpecialStatusType,
	S extends Partial<Record<StatusType, BaseStatusInstance>>,
> = BaseStatus<T> & {
	type: T;
	attackType?: string;
	statuses: S;
};
// Sword Qi applies an attack modifier for sword techniques and adds a defense modifier
type SwordQiStatus = SpecialStatusBase<
	"swordQi",
	{
		attackModifier: AttackModifierStatus;
		defenseModifier: DefenseModifierStatus;
	}
> & {
	attackType: "sword";
};
type SpecialStatusInstance = SwordQiStatus;
type StatusInstance = BaseStatusInstance | SpecialStatusInstance;
type CharacterState = {
	name: string;
	stats: BaseStats;
	statuses: Record<string, StatusInstance>;
};
type Effect =
	| {
			type: "applyHealthDelta";
			base: number;
			multiplier: number;
			profile: DamageChannelProfile;
			target: "self" | "enemy";
	  }
	| {
			type: "applyQiDelta";
			delta: number;
			target: "self" | "enemy";
	  }
	| {
			type: "applyStatusDelta";
			status: StatusInstance;
			target: "self" | "enemy";
			delta: number | "all";
			chance?: number; // 0..1
	  };
type ActionGrade = "common" | "uncommon" | "rare" | "unique";
type Technique = {
	name: string;
	actionGrade: ActionGrade;
	qiCost: number;
	effects: Effect[];
	grantsMomentum?: boolean;
};
type ActionEvent =
	| { type: "actionStart"; actor: string; target: string; technique: Technique }
	| { type: "qiStarvation"; actor: string }
	| {
			type: "qiDelta";
			actor: string;
			delta: number;
			qiBefore: number;
			qiAfter: number;
	  }
	| {
			type: "healthDelta";
			actor: string;
			raw: number;
			delta: number;
			breakdown?: Record<string, number>;
			healthBefore: number;
			healthAfter: number;
	  }
	| {
			type: "statusApplied";
			actor: string;
			target: string;
			status: StatusInstance;
	  }
	| {
			type: "statusDelta";
			actor: string;
			status: StatusInstance;
			delta: number;
			remainingTurnsBefore: number;
			remainingTurnsAfter: number;
	  }
	| {
			type: "accuracyRoll";
			actor: string;
			target: string;
			accuracy: number;
			isHit: boolean;
	  }
	| { type: "critRoll"; actor: string; critChance: number; isCrit: boolean }
	| { type: "statusExpired"; actor: string; status: StatusInstance }
	| { type: "stunned"; actor: string }
	| { type: "momentumTriggered"; actor: string };
type ActionExecutionContext = {
	events: ActionEvent[];
	rng: () => number;
};
function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}
const ACCURACY_MIN = 0.1;
const ACCURACY_MAX = 0.95;
function calculateAccuracy(actorSpeed: number, targetSpeed: number): number {
	return clamp(
		actorSpeed / (actorSpeed + targetSpeed),
		ACCURACY_MIN,
		ACCURACY_MAX,
	);
}
const BASE_CRIT_CHANCE = 0.05;
function calculateCritChance(actorLuck: number, modifiers: number[]): number {
	let critChance = BASE_CRIT_CHANCE + clamp(actorLuck, 0, 100) / 100;
	for (const mod of modifiers) {
		critChance += mod;
	}
	return clamp(critChance, 0, 1);
}
const RESISTANCE_MIN = 0;
const RESISTANCE_MAX = 0.9;
function normalizeResistanceProfile(
	profile: DamageChannelProfile,
): DamageChannelProfile {
	// if not normalized to 1, then we default to adding rest to magic
	// We need to clamp everything first and make sure profiles sum to 1
	const physicalResistance = clamp(
		profile.magic,
		RESISTANCE_MIN,
		RESISTANCE_MAX,
	);
	const spiritualResistance = clamp(
		profile.spiritual,
		RESISTANCE_MIN,
		RESISTANCE_MAX,
	);
	const magicResistance =
		clamp(profile.physical, RESISTANCE_MIN, RESISTANCE_MAX) +
		(1 - (physicalResistance + spiritualResistance + profile.magic));
	return physicalResistance + spiritualResistance + magicResistance === 1
		? {
				physical: physicalResistance,
				spiritual: spiritualResistance,
				magic: magicResistance,
			}
		: {
				physical: 0,
				spiritual: 0,
				magic: 1,
			};
}
function calculateDamage(
	attackRaw: number,
	attackProfile: DamageChannelProfile,
	resistanceProfile: DamageChannelProfile,
) {
	const normalizedAttackWeights = normalizeResistanceProfile(attackProfile);
	const normalizedResistanceWeights =
		normalizeResistanceProfile(resistanceProfile);
	const damageBreakdown = {
		magic:
			attackRaw *
			normalizedAttackWeights.magic *
			(1 - normalizedResistanceWeights.magic),
		physical:
			attackRaw *
			normalizedAttackWeights.physical *
			(1 - normalizedResistanceWeights.physical),
		spiritual:
			attackRaw *
			normalizedAttackWeights.spiritual *
			(1 - normalizedResistanceWeights.spiritual),
	};
	const totalDamage =
		damageBreakdown.magic +
		damageBreakdown.physical +
		damageBreakdown.spiritual;
	return { totalDamage, damageBreakdown };
}
function deepCopyCharacterState(state: CharacterState): CharacterState {
	return {
		name: state.name,
		stats: { ...state.stats },
		statuses: { ...state.statuses }, // This doesn't do full deep copy, we need to fix it. Likely doesn't matter as we'll be working with C# in our actual game code
	};
}
function applyActorStatusEvents(
	actorState: CharacterState,
	statusType: StatusType,
	consumeStatus?: { delta: number },
): { events: ActionEvent[]; newState: CharacterState } {
	const newState = deepCopyCharacterState(actorState);
	const events: ActionEvent[] = [];
	const status = newState.statuses[statusType];
	if (!status)
		throw new Error(
			`Status ${statusType} not found on actor ${actorState.name}`,
		);
	switch (status.type) {
		case "healthOverTime": {
			const healthBefore = newState.stats.health;
			const healthAfter = clamp(
				newState.stats.health + status.deltaPerTurn,
				0,
				newState.stats.maxHealth,
			);
			const delta = healthAfter - healthBefore;
			newState.stats.health = healthAfter;
			events.push({
				type: "healthDelta",
				actor: newState.name,
				raw: status.deltaPerTurn,
				delta,
				healthBefore,
				healthAfter,
			});
			break;
		}
		case "qiOverTime": {
			const qiBefore = newState.stats.qi;
			const qiAfter = qiBefore + status.deltaPerTurn;
			const delta = qiAfter - qiBefore;
			newState.stats.qi = qiAfter;
			events.push({
				type: "qiDelta",
				actor: newState.name,
				delta,
				qiBefore,
				qiAfter,
			});
			break;
		}
	}
	if (consumeStatus) {
		status.remainingTurns -= consumeStatus.delta;
		events.push({
			type: "statusDelta",
			actor: newState.name,
			status,
			delta: -consumeStatus.delta,
			remainingTurnsBefore: status.remainingTurns + consumeStatus.delta,
			remainingTurnsAfter: status.remainingTurns,
		});
		if (status.remainingTurns <= 0) {
			delete newState.statuses[statusType];
			events.push({ type: "statusExpired", actor: newState.name, status });
		}
	}
	return { events, newState };
}
function applyActorConsumeStatusEvents(
	actorState: CharacterState,
	statusType: StatusType,
	delta: number,
): { events: ActionEvent[]; newState: CharacterState } {
	const newState = deepCopyCharacterState(actorState);
	const events: ActionEvent[] = [];
	const status = newState.statuses[statusType];
	if (!status)
		throw new Error(
			`Status ${statusType} not found on actor ${actorState.name}`,
		);
	status.remainingTurns -= delta;
	events.push({
		type: "statusDelta",
		actor: newState.name,
		status,
		delta: -delta,
		remainingTurnsBefore: status.remainingTurns + delta,
		remainingTurnsAfter: status.remainingTurns,
	});
	if (status.remainingTurns <= 0) {
		delete newState.statuses[statusType];
		events.push({ type: "statusExpired", actor: newState.name, status });
	}
	return { events, newState };
}
function applyActorConsumeAllStatusesEvents(actorState: CharacterState): {
	events: ActionEvent[];
	newState: CharacterState;
} {
	const newState = deepCopyCharacterState(actorState);
	const events: ActionEvent[] = [];
	for (const statusType in newState.statuses) {
		const status = newState.statuses[statusType];
		const { events: consumeEvents, newState: updatedState } =
			applyActorConsumeStatusEvents(
				newState,
				status.type,
				status.remainingTurns,
			);
		events.push(...consumeEvents);
		Object.assign(newState, updatedState);
	}
	return { events, newState };
}
function applyPreActionEvents(actorState: CharacterState): {
	events: ActionEvent[];
	newState: CharacterState;
	shouldEndTurn: boolean;
} {
	const newState = deepCopyCharacterState(actorState);
	const events: ActionEvent[] = [];
	const isStunned = "stun" in newState.statuses;
	if (isStunned) {
		events.push({ type: "stunned", actor: newState.name });
		const { events: stunEvents, newState: newStunState } =
			applyActorStatusEvents(newState, "stun", { delta: 1 });
		events.push(...stunEvents);
		Object.assign(newState, newStunState);
	}
	for (const statusType in newState.statuses) {
		const status = newState.statuses[statusType];
		if (status.isPreAction) {
			const { events: statusEvents, newState: updatedState } =
				applyActorStatusEvents(newState, status.type, { delta: 1 });
			events.push(...statusEvents);
			Object.assign(newState, updatedState);
		}
	}
	return { events, newState, shouldEndTurn: isStunned };
}
const DEFAULT_QI_STARVATION_QI_GAIN = 1; // skip 1 turn to gain 1 qi by default
function applyQiCostEvent(
	actorState: CharacterState,
	qiCost: number,
): { events: ActionEvent[]; newState: CharacterState; shouldEndTurn: boolean } {
	const newState = deepCopyCharacterState(actorState);
	const events: ActionEvent[] = [];
	if (newState.stats.qi < qiCost) {
		// Not enough qi, apply qi starvation
		const qiBefore = newState.stats.qi;
		newState.stats.qi += DEFAULT_QI_STARVATION_QI_GAIN;
		events.push({ type: "qiStarvation", actor: newState.name });
		events.push({
			type: "qiDelta",
			actor: newState.name,
			delta: DEFAULT_QI_STARVATION_QI_GAIN,
			qiBefore,
			qiAfter: newState.stats.qi,
		});
		return { events, newState, shouldEndTurn: true };
	} else {
		const qiBefore = newState.stats.qi;
		newState.stats.qi -= qiCost;
		events.push({
			type: "qiDelta",
			actor: newState.name,
			delta: -qiCost,
			qiBefore,
			qiAfter: newState.stats.qi,
		});
		return { events, newState, shouldEndTurn: false };
	}
}
const DEFAULT_SHIELD_PENETRATION = 0.2; // 20% of damage bypasses shield by default
const CRIT_MULTIPLIER = 1.5; // Critical hits do 1.5x damage
function applyTechniqueEffectEvents(
	actorState: CharacterState,
	targetState: CharacterState,
	technique: Technique,
	rng: () => number,
): {
	events: ActionEvent[];
	newActorState: CharacterState;
	newTargetState: CharacterState;
} {
	const newActorState = deepCopyCharacterState(actorState);
	const newTargetState = deepCopyCharacterState(targetState);
	const events: ActionEvent[] = [];
	for (const effect of technique.effects) {
		switch (effect.type) {
			case "applyQiDelta": {
				const qiDeltaTargetState =
					effect.target === "self" ? newActorState : newTargetState;
				const qiBefore = qiDeltaTargetState.stats.qi;
				const qiDelta = effect.delta;
				const qiAfter = Math.min(qiBefore + qiDelta, 0);
				qiDeltaTargetState.stats.qi = qiAfter;
				events.push({
					type: "qiDelta",
					actor: qiDeltaTargetState.name,
					delta: qiDelta,
					qiBefore,
					qiAfter,
				});
				break;
			}
			// When dealing damage, and if it's a technique that consumes stacks of something, like sword qi, how do we modify damage?
			case "applyHealthDelta": {
				const targetIsSelf = effect.target === "self";
				const healthDeltaActorState = targetIsSelf
					? newActorState
					: newTargetState;
				const healthDeltaTargetState = targetIsSelf
					? newActorState
					: newTargetState;
				// depending on the delta, we do different things
				// if delta is positive, it's healing and we don't need to calculate resists
				// if delta is negative, we need to factor in resists and hit chance
				const isHeal = effect.base * effect.multiplier >= 0;
				if (isHeal) {
					const healthBefore = targetState.stats.health;
					const healAmount = effect.base * effect.multiplier;
					const healthAfter = clamp(
						healthBefore + healAmount,
						0,
						targetState.stats.maxHealth,
					);
					healthDeltaTargetState.stats.health = healthAfter;
					const delta = healthAfter - healthBefore;
					events.push({
						type: "healthDelta",
						actor: healthDeltaTargetState.name,
						raw: healAmount,
						delta,
						healthBefore,
						healthAfter,
					});
				} else {
					const accuracy = calculateAccuracy(
						healthDeltaActorState.stats.speed,
						healthDeltaTargetState.stats.speed,
					);
					const isHit = rng() <= accuracy;
					events.push({
						type: "accuracyRoll",
						actor: healthDeltaActorState.name,
						target: healthDeltaTargetState.name,
						accuracy,
						isHit,
					});
					const critChance = calculateCritChance(
						healthDeltaActorState.stats.luck,
						[],
					);
					const isCrit = rng() <= critChance;
					events.push({
						type: "critRoll",
						actor: healthDeltaActorState.name,
						critChance,
						isCrit,
					});
					const { totalDamage, damageBreakdown } = calculateDamage(
						Math.abs(effect.base * effect.multiplier) *
							(isCrit ? CRIT_MULTIPLIER : 1),
						effect.profile,
						healthDeltaTargetState.stats.resistances,
					);
					let damageAfterShield = totalDamage;
					if ("shield" in healthDeltaTargetState.statuses) {
						const shieldStatus = healthDeltaTargetState.statuses
							.shield as ShieldStatus;
						const shieldValue = totalDamage * shieldStatus.multiplier;
						damageAfterShield =
							totalDamage - shieldValue * (1 - DEFAULT_SHIELD_PENETRATION);
						// subtract shield status stack by 1 turn
						const {
							events: shieldConsumeEvents,
							newState: shieldUpdatedState,
						} = applyActorConsumeStatusEvents(
							healthDeltaTargetState,
							"shield",
							1,
						);
						events.push(...shieldConsumeEvents);
						Object.assign(healthDeltaTargetState, shieldUpdatedState);
					}
					const healthBefore = healthDeltaTargetState.stats.health;
					const healthAfter = clamp(
						healthBefore - damageAfterShield,
						0,
						healthDeltaTargetState.stats.maxHealth,
					);
					healthDeltaTargetState.stats.health = healthAfter;
					const delta = healthAfter - healthBefore;
					events.push({
						type: "healthDelta",
						actor: healthDeltaTargetState.name,
						raw: -totalDamage,
						delta,
						breakdown: damageBreakdown,
						healthBefore,
						healthAfter,
					});
				}
				break;
			}
			case "applyStatusDelta": {
				break;
			}
		}
	}
	return { events, newActorState, newTargetState };
}
