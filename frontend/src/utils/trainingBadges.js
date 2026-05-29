export function severityClass(severity) {
  if (severity === 'high') {
    return 'border-danger bg-danger text-danger-text'
  }

  if (severity === 'medium' || severity === 'moderate') {
    return 'border-border-strong bg-action text-action-text'
  }

  return 'border-lens bg-lens-soft text-heading'
}

export function recommendationClass(type) {
  if (type === 'modify_session') {
    return 'border-danger bg-danger text-danger-text'
  }

  if (type === 'train_but_control_extras' || type === 'prioritize_recovery') {
    return 'border-border-strong bg-action text-action-text'
  }

  return 'border-lens bg-lens-soft text-heading'
}

export function warningLabel(code) {
  if (code?.includes('MILEAGE') || code?.includes('TARGET')) {
    return 'Load caution'
  }

  if (code?.includes('READINESS') || code?.includes('REST')) {
    return 'Recovery note'
  }

  return 'Planning note'
}
