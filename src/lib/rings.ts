/** Generate ring boundaries with adaptive step sizes */
export function generateRingBoundaries(radiusKm: number): number[] {
  const boundaries: number[] = [0];
  let current = 0;

  while (current < radiusKm) {
    let step: number;
    if (current < 10) {
      step = 1;
    } else if (current < 25) {
      step = 2;
    } else {
      step = 5;
    }
    current = Math.min(current + step, radiusKm);
    boundaries.push(current);
  }

  // Ensure the final boundary matches the radius exactly
  if (boundaries[boundaries.length - 1] !== radiusKm) {
    boundaries.push(radiusKm);
  }

  return boundaries;
}
