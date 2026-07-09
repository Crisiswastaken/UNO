import { nanoid } from "nanoid";
import { Card, Color, COLORS, NumberValue, Value } from "./types";

const NUMBERS: NumberValue[] = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
const ACTIONS: Value[] = ["skip", "reverse", "draw2"];

/** Build a standard 108-card deck with unique runtime uids. */
export function buildDeck(): Card[] {
  const cards: Card[] = [];
  const add = (color: Color | null, value: Value) =>
    cards.push({ uid: nanoid(10), color, value });

  for (const color of COLORS) {
    // one 0, two each of 1-9
    add(color, "0");
    for (const n of NUMBERS.slice(1)) {
      add(color, n);
      add(color, n);
    }
    // two each of skip / reverse / draw2
    for (const a of ACTIONS) {
      add(color, a);
      add(color, a);
    }
  }
  // four wild, four wild_draw4
  for (let i = 0; i < 4; i++) {
    add(null, "wild");
    add(null, "wild_draw4");
  }

  return cards;
}

export type Rng = () => number;

/** Fisher–Yates shuffle returning a new array. */
export function shuffle<T>(items: T[], rng: Rng = Math.random): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Standard UNO point value of a card, used for targetScore scoring. */
export function cardPoints(card: Card): number {
  switch (card.value) {
    case "skip":
    case "reverse":
    case "draw2":
      return 20;
    case "wild":
    case "wild_draw4":
      return 50;
    default:
      return Number(card.value);
  }
}
