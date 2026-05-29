export function apiMessage(error, fallback = 'Something went wrong.') {
  const message = error?.response?.data?.message
  const errors = error?.response?.data?.errors

  if (errors) {
    const firstError = Object.values(errors).flat().find(Boolean)
    return firstError || message || 'Please check the form values.'
  }

  return message || fallback
}
