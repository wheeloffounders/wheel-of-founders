import MailerLite from '@mailerlite/mailerlite-nodejs'

const mailerlite = new MailerLite({
  api_key: process.env.MAILERLITE_API_KEY ?? '',
})

export interface SubscriberData {
  email: string
  name?: string
  fields?: {
    user_id?: string
    tier?: string
    joined_date?: string
    challenge_day?: number
    [key: string]: string | number | undefined
  }
}

/**
 * Create or update a subscriber and add them to specified groups.
 * MailerLite createOrUpdate is non-destructive - omitting fields/groups won't remove them.
 */
export async function addOrUpdateSubscriber(
  data: SubscriberData,
  groupIds: string[]
): Promise<{ id: string; email: string }> {
  if (!process.env.MAILERLITE_API_KEY) {
    console.warn('MAILERLITE_API_KEY not set, skipping MailerLite sync')
    return { id: '', email: data.email }
  }

  try {
    const response = await mailerlite.subscribers.createOrUpdate({
      email: data.email,
      fields: {
        ...(data.name && { name: data.name }),
        ...data.fields,
      },
      groups: groupIds,
    })

    const subscriber = response.data?.data
    if (!subscriber) {
      throw new Error('No subscriber data in MailerLite response')
    }

    return { id: subscriber.id, email: subscriber.email }
  } catch (error) {
    console.error('MailerLite addOrUpdateSubscriber error:', error)
    throw error
  }
}

/**
 * @deprecated Use sendTransactionalEmail from @/lib/email/transactional instead.
 * This stub remains for backward compatibility; it now delegates to the transactional module.
 */
export async function sendTransactionalEmail(
  templateId: string,
  email: string,
  variables?: Record<string, unknown>
): Promise<void> {
  const mod = await import('@/lib/email/transactional')
  const { subject, html, text } = buildStubTemplate(templateId, email, variables ?? {})
  await mod.sendTransactionalEmail({ to: email, subject, html, text })
}

function buildStubTemplate(
  templateId: string,
  email: string,
  vars: Record<string, unknown>
): { subject: string; html: string; text: string } {
  const name = (vars.name as string) || email.split('@')[0]
  const subject = templateId === 'welcome' ? 'Welcome to Wheel of Founders!' : 'Wheel of Founders'
  const html = `<p>Hi ${name},</p><p>Message from Wheel of Founders.</p>`
  const text = `Hi ${name}, Message from Wheel of Founders.`
  return { subject, html, text }
}

/**
 * Remove a subscriber from a group by email.
 * Uses MailerLite API's support for email as subscriber identifier.
 */
export async function removeFromGroup(
  email: string,
  groupId: string
): Promise<void> {
  if (!process.env.MAILERLITE_API_KEY) {
    console.warn('MAILERLITE_API_KEY not set, skipping MailerLite removeFromGroup')
    return
  }

  try {
    // MailerLite API accepts email as identifier: GET /api/subscribers/:id_or_email
    const subscriberRes = await mailerlite.subscribers.find(email)
    const subscriber = subscriberRes.data?.data

    if (subscriber) {
      await mailerlite.groups.unAssignSubscriber(subscriber.id, groupId)
    }
  } catch (error) {
    console.error('MailerLite removeFromGroup error:', error)
    throw error
  }
}
