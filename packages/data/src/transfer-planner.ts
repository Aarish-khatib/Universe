/** Ideal circular, coplanar two-body Hohmann transfer estimates (not ephemerides). */
export const SOLAR_GRAVITATIONAL_PARAMETER = 1.32712440018e20; // m³/s²
export const ASTRONOMICAL_UNIT_METERS = 149597870700;

export interface TransferEstimate {
  departureDeltaV: number; // m/s, circular orbit to transfer ellipse
  arrivalDeltaV: number; // m/s, transfer ellipse to circular orbit
  totalDeltaV: number; // m/s; excludes launch, capture, inclination and losses
  flightSeconds: number;
  departurePhaseRadians: number; // target longitude - origin longitude, [0, 2π)
  synodicPeriodSeconds: number | null; // null for equal mean motions
}

/** Compute an ideal impulsive transfer between circular orbits around the same primary. */
export function estimateHohmannTransfer(
  originRadiusMeters: number,
  targetRadiusMeters: number,
  gravitationalParameter = SOLAR_GRAVITATIONAL_PARAMETER,
): TransferEstimate {
  for (const value of [originRadiusMeters, targetRadiusMeters, gravitationalParameter]) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError("Orbital radii and gravitational parameter must be finite and positive");
    }
  }

  const semimajor = (originRadiusMeters + targetRadiusMeters) / 2;
  const originSpeed = Math.sqrt(gravitationalParameter / originRadiusMeters);
  const targetSpeed = Math.sqrt(gravitationalParameter / targetRadiusMeters);
  const transferSpeedAtOrigin = Math.sqrt(
    gravitationalParameter * (2 / originRadiusMeters - 1 / semimajor),
  );
  const transferSpeedAtTarget = Math.sqrt(
    gravitationalParameter * (2 / targetRadiusMeters - 1 / semimajor),
  );
  const departureDeltaV = Math.abs(transferSpeedAtOrigin - originSpeed);
  const arrivalDeltaV = Math.abs(targetSpeed - transferSpeedAtTarget);
  const flightSeconds = Math.PI * Math.sqrt(semimajor ** 3 / gravitationalParameter);
  const originMeanMotion = Math.sqrt(gravitationalParameter / originRadiusMeters ** 3);
  const targetMeanMotion = Math.sqrt(gravitationalParameter / targetRadiusMeters ** 3);
  const tau = 2 * Math.PI;
  const departurePhaseRadians = ((Math.PI - targetMeanMotion * flightSeconds) % tau + tau) % tau;
  const difference = Math.abs(originMeanMotion - targetMeanMotion);

  return {
    departureDeltaV,
    arrivalDeltaV,
    totalDeltaV: departureDeltaV + arrivalDeltaV,
    flightSeconds,
    departurePhaseRadians,
    synodicPeriodSeconds: difference < 1e-15 ? null : tau / difference,
  };
}
