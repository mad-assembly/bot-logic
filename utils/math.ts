export function bigIntMax(values: bigint[]) {
  let biggest = values[0]

  for (let i = 0; i < values.length; i++) {
    const current = values[i]
    if (biggest < current) {
      biggest = current
    }
  }

  return biggest
}
