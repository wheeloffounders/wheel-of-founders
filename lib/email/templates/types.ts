export type EmailTemplateUser = {
  name?: string | null
  email?: string | null
}

export type TemplateData = Record<string, unknown>

export type EmailTemplate = {
  getSubject: (user: EmailTemplateUser, data?: TemplateData) => string
  getHtml: (user: EmailTemplateUser, data?: TemplateData) => string
  getText: (user: EmailTemplateUser, data?: TemplateData) => string
}

