// Optional self-chosen names are labels, never authentication or online presence.
export const cleanNickname = (value) =>
  typeof value === "string"
    ? value
        .replace(/[\u0000-\u001f\u007f<>]/g, "")
        .trim()
        .slice(0, 16)
    : "";
export const itemKey = (id, style) => `${id}|${style || ""}`;
export function contributorsFor(operations) {
  const stacks = new Map();
  const sorted = [...operations].sort(
    (a, b) => a.storedAt - b.storedAt || a.id.localeCompare(b.id),
  );
  for (const op of sorted) {
    if (op.kind !== "delta") continue;
    const key = itemKey(op.dishId, op.style),
      stack = stacks.get(key) || [];
    if (op.delta > 0)
      stack.push({
        deviceId: op.deviceId,
        name: cleanNickname(op.actorName),
        qty: op.delta,
      });
    else {
      let remaining = -op.delta;
      while (remaining && stack.length) {
        const latest = stack.at(-1),
          take = Math.min(latest.qty, remaining);
        remaining -= take;
        latest.qty -= take;
        if (!latest.qty) stack.pop();
      }
    }
    stacks.set(key, stack);
  }
  return Object.fromEntries(
    [...stacks]
      .filter(([, v]) => v.length)
      .map(([key, stack]) => {
        const people = new Map();
        for (const contribution of stack) {
          const person = people.get(contribution.deviceId) || {
            ...contribution,
            qty: 0,
          };
          person.qty += contribution.qty;
          person.name = contribution.name;
          people.set(person.deviceId, person);
        }
        return [key, [...people.values()]];
      }),
  );
}
