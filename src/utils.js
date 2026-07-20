export function parseClock(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);

  if (!match) {
    throw new Error(`Invalid clock value "${value}". Expected HH:mm.`);
  }

  return {
    hour: Number(match[1]),
    minute: Number(match[2])
  };
}
