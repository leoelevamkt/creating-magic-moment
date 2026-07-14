import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { AuthForm } from '@/components/auth-form'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { user } from '@/lib/db/schema'
import { count } from 'drizzle-orm'

export default async function SignInPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect('/')
  const [{ value }] = await db.select({ value: count() }).from(user)
  return <AuthForm allowRegistration={value === 0} />
}
