export const sample = `Synthetic Form 1040 • demonstration
Taxpayer: Avery Finch
Street address: 412 Fiction Lane
Social security number: 000-12-3456

1z  Total wages                  $48,000
2b  Taxable interest                $600
3b  Ordinary dividends              $800
4b  Taxable IRA distributions         $0
5b  Taxable pensions                   $0
6b  Taxable Social Security            $0
7   Capital gain or loss               $0
8   Additional income              $1,600
9   Total income                  $53,400`;

export function verifySample(source, contextual, redacted) {
  for (const [type, value] of [['NAME', 'Avery Finch'], ['ADDRESS', '412 Fiction Lane']]) {
    if (!contextual.some(span => span.type === type && span.value === value)) {
      throw new Error('Contextual detection missed a sample identifier');
    }
  }
  if (!source.includes('000-12-3456') || redacted.includes('000-12-3456')
      || redacted.includes('Avery Finch') || redacted.includes('412 Fiction Lane')
      || !redacted.includes('9   Total income                  $53,400')) {
    throw new Error('Sample redaction check failed');
  }
}
