"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, Eye, EyeOff } from "lucide-react"

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

const DEMO_ACCOUNTS = {
  admin: [
    { name: "Admin User", dept: "Administration", email: "admin@atomberg.com", password: "Admin@123" },
  ],
  manager: [
    { name: "Rahul Singh", dept: "Sales", email: "manager1@atomberg.com", password: "Manager@123" },
    { name: "Neha Joshi", dept: "Operations", email: "manager2@atomberg.com", password: "Manager@123" },
    { name: "Arjun Verma", dept: "Technology", email: "manager3@atomberg.com", password: "Manager@123" },
  ],
  employee: [
    { name: "Priya Patel", dept: "Sales", email: "emp1@atomberg.com", password: "Emp@123" },
    { name: "Amit Kumar", dept: "Sales", email: "emp2@atomberg.com", password: "Emp@123" },
    { name: "Kavya Sharma", dept: "Sales", email: "emp3@atomberg.com", password: "Emp@123" },
    { name: "Rohan Mehta", dept: "Operations", email: "emp4@atomberg.com", password: "Emp@123" },
    { name: "Anita Desai", dept: "Operations", email: "emp5@atomberg.com", password: "Emp@123" },
    { name: "Dev Gupta", dept: "Operations", email: "emp6@atomberg.com", password: "Emp@123" },
    { name: "Sana Khan", dept: "Technology", email: "emp7@atomberg.com", password: "Emp@123" },
    { name: "Raj Iyer", dept: "Technology", email: "emp8@atomberg.com", password: "Emp@123" },
    { name: "Meera Nair", dept: "Technology", email: "emp9@atomberg.com", password: "Emp@123" },
  ],
}

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [authError, setAuthError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [demoOpen, setDemoOpen] = useState(false)

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  const { isSubmitting } = form.formState

  function fillDemo(email: string, password: string) {
    form.setValue("email", email, { shouldValidate: true })
    form.setValue("password", password, { shouldValidate: true })
    setAuthError(null)
    setDemoOpen(false)
  }

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

    const callbackUrl = searchParams.get("callbackUrl")
    router.replace(callbackUrl ?? "/")
    router.refresh()
  }

  return (
    <Card className="w-full max-w-sm shadow-lg border-border/60">
      <CardHeader className="space-y-5 pb-2">
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

      <CardContent className="pt-4 space-y-4">
        {/* Demo accounts accordion */}
        <div className="rounded-lg border border-dashed border-orange-200 bg-orange-50/50 overflow-hidden">
          <button
            type="button"
            onClick={() => setDemoOpen((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-orange-700 hover:bg-orange-100/60 transition-colors"
          >
            <span>Demo credentials</span>
            <span className="text-orange-400">{demoOpen ? "▲" : "▼"}</span>
          </button>

          {demoOpen && (
            <div className="px-3 pb-3 space-y-3">
              {/* Admin */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Admin</p>
                {DEMO_ACCOUNTS.admin.map((a) => (
                  <button
                    key={a.email}
                    type="button"
                    onClick={() => fillDemo(a.email, a.password)}
                    className="w-full text-left rounded-md px-2.5 py-1.5 text-xs hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-orange-100 flex items-center justify-between gap-2"
                  >
                    <span className="font-medium text-gray-800">{a.name}</span>
                    <span className="text-gray-400 truncate">{a.dept}</span>
                  </button>
                ))}
              </div>

              {/* Managers */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Managers</p>
                {DEMO_ACCOUNTS.manager.map((a) => (
                  <button
                    key={a.email}
                    type="button"
                    onClick={() => fillDemo(a.email, a.password)}
                    className="w-full text-left rounded-md px-2.5 py-1.5 text-xs hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-blue-100 flex items-center justify-between gap-2"
                  >
                    <span className="font-medium text-gray-800">{a.name}</span>
                    <span className="text-gray-400 truncate">{a.dept}</span>
                  </button>
                ))}
              </div>

              {/* Employees */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Employees</p>
                {DEMO_ACCOUNTS.employee.map((a) => (
                  <button
                    key={a.email}
                    type="button"
                    onClick={() => fillDemo(a.email, a.password)}
                    className="w-full text-left rounded-md px-2.5 py-1.5 text-xs hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-green-100 flex items-center justify-between gap-2"
                  >
                    <span className="font-medium text-gray-800">{a.name}</span>
                    <span className="text-gray-400 truncate">{a.dept}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

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
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        disabled={isSubmitting}
                        className="pr-10"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
