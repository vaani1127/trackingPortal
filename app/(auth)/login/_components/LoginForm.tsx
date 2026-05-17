"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

type LoginValues = z.infer<typeof loginSchema>

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [authError, setAuthError] = useState<string | null>(null)

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  const { isSubmitting } = form.formState

  async function onSubmit(values: LoginValues) {
    setAuthError(null)

    const result = await signIn("credentials", {
      redirect: false,
      email: values.email,
      password: values.password,
    })

    if (!result?.ok || result.error) {
      setAuthError("Invalid email or password")
      return
    }

    // Let middleware redirect to the role-appropriate dashboard.
    // Fall back to callbackUrl if it was preserved from a protected-route attempt.
    const callbackUrl = searchParams.get("callbackUrl")
    router.replace(callbackUrl ?? "/")
    router.refresh()
  }

  return (
    <Card className="w-full max-w-sm shadow-lg border-border/60">
      <CardHeader className="space-y-5 pb-2">
        {/* Orange brand wordmark */}
        <div className="flex justify-center pt-2">
          <span className="text-[1.75rem] font-extrabold tracking-[0.2em] text-orange-500 select-none">
            ATOMBERG
          </span>
        </div>
        <div className="space-y-1 text-center">
          <CardTitle className="text-xl font-semibold">Welcome back</CardTitle>
          <CardDescription className="text-sm">
            Sign in to access your portal
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email address</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@atomberg.com"
                      autoComplete="email"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Credential error banner */}
            {authError && (
              <p
                role="alert"
                className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
              >
                {authError}
              </p>
            )}

            <Button
              type="submit"
              className="w-full mt-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
