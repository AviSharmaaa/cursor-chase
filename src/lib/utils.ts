export const dist2 = (a: Vec, b: Vec) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
};

export const rand = (min: number, max: number) =>
  Math.random() * (max - min) + min;
