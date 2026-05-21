function normalizeRounds(rounds?: number | string) {
  const parsed = Number(rounds);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 10;
}

export async function hash(value: string, rounds?: number | string) {
  return `mock-bcrypt$${normalizeRounds(rounds)}$${String(value ?? "")}`;
}

export async function compare(value: string, hashed: string) {
  if (typeof hashed !== "string") {
    return false;
  }
  const parts = hashed.split("$");
  if (parts.length !== 3 || parts[0] !== "mock-bcrypt") {
    return hashed === String(value ?? "");
  }
  return parts[2] === String(value ?? "");
}

export function hashSync(value: string, rounds?: number | string) {
  return `mock-bcrypt$${normalizeRounds(rounds)}$${String(value ?? "")}`;
}

export function compareSync(value: string, hashed: string) {
  if (typeof hashed !== "string") {
    return false;
  }
  const parts = hashed.split("$");
  if (parts.length !== 3 || parts[0] !== "mock-bcrypt") {
    return hashed === String(value ?? "");
  }
  return parts[2] === String(value ?? "");
}

export async function genSalt(rounds?: number | string) {
  return `mock-salt-${normalizeRounds(rounds)}`;
}

export function genSaltSync(rounds?: number | string) {
  return `mock-salt-${normalizeRounds(rounds)}`;
}

