export const APP_TIME_ZONE = 'America/Sao_Paulo'

const getParts = (date) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const byType = {}
  parts.forEach((p) => {
    if (p.type !== 'literal') byType[p.type] = p.value
  })

  return byType
}

export const toDateInputInAppTZ = (date) => {
  const d = date instanceof Date ? date : new Date(date)
  const parts = getParts(d)
  return `${parts.year}-${parts.month}-${parts.day}`
}

export const getTodayDateInAppTZ = () => toDateInputInAppTZ(new Date())

export const formatDateTimeInAppTZ = (value) => {
  if (!value) return '-'
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return '-'

  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: APP_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d).replace(',', '')
}

export const formatLongDateInAppTZ = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return ''

  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: APP_TIME_ZONE,
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(d)
}
