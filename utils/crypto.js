const SECOND = 1000;
const SECONDS_IN_MINUTE = 60;
export function getSolidityTime(minutes) {
    return BigInt(Math.floor(Date.now() / SECOND) + minutes * SECONDS_IN_MINUTE);
}
