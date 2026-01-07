export type DamageProfile = {
	magic: number;
	physical: number;
	spiritual: number;
};
type BaseStats = {
	hp: number;
	maxHp: number;
	magicAtk: number;
	physicalAtk: number;
	spiritualAtk: number;
	magicDef: number;
	physicalDef: number;
	spiritualDef: number;
	speed: number;
	luck: number;
};
type BattlePhase =
	| "roundStart"
	| "roundEnd"
	| "turnStart"
	| "turnEnd"
	| "preAction"
	| "postAction";
type StatusType = string; // expand later
type StatusStatModifier = {
	hpAdd: number;
	hpMult: number;
	magicAtkAdd: number;
	magicAtkMult: number;
	physicalAtkAdd: number;
	physicalAtkMult: number;
	spiritualAtkAdd: number;
	spiritualAtkMult: number;
	magicDefAdd: number;
	magicDefMult: number;
	physicalDefAdd: number;
	physicalDefMult: number;
	spiritualDefAdd: number;
	spiritualDefMult: number;
	speedAdd: number;
	speedMult: number;
	luckAdd: number;
	luckMult: number;
};
const SwordQiStack = {
	type: "SwordQi",
	amount: 2,
	turnsRemaining: 3,
	modifierFunc: () => {},
};
// type StatusStack = {
// 	type: StatusType;
// 	amount: number;
// };
