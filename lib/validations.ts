import { z } from "zod"

export const GoalCreateSchema = z
  .object({
    thrustArea: z.string().min(1, "Thrust area is required"),
    title: z
      .string()
      .min(3, "Title must be at least 3 characters")
      .max(100, "Title must be at most 100 characters"),
    description: z
      .string()
      .max(500, "Description must be at most 500 characters")
      .optional(),
    uomType: z.enum(
      ["min_numeric", "max_numeric", "min_percent", "max_percent", "timeline", "zero"] as const
    ),
    targetValue: z.number().positive("Target value must be positive").optional(),
    targetDate: z.coerce.date().optional(),
    weightage: z
      .number()
      .min(10, "Minimum weightage is 10%")
      .max(90, "Maximum weightage is 90%")
      .refine((n) => n % 5 === 0, "Weightage must be a multiple of 5%"),
    cycleId: z.string().uuid("Invalid cycle ID"),
  })
  .refine(
    (data) => {
      if (data.uomType === "timeline") return !!data.targetDate
      if (data.uomType === "zero") return true
      return data.targetValue !== undefined
    },
    {
      message: "Target value or date required for the selected unit of measurement",
      path: ["targetValue"],
    }
  )

export type GoalCreateInput = z.infer<typeof GoalCreateSchema>

export const GoalFormSchema = z
  .object({
    thrustArea: z.string().min(1, "Thrust area is required"),
    title: z
      .string()
      .min(3, "Title must be at least 3 characters")
      .max(100, "Title must be at most 100 characters"),
    description: z
      .string()
      .max(500, "Description must be at most 500 characters")
      .optional(),
    uomType: z.enum(
      ["min_numeric", "max_numeric", "min_percent", "max_percent", "timeline", "zero"] as const
    ),
    targetValue: z.number().positive("Target value must be positive").optional(),
    targetDate: z.date().optional(),
    unitLabel: z.string().max(20).optional(),
    weightage: z
      .number()
      .min(10, "Minimum weightage is 10%")
      .max(90, "Maximum weightage is 90%")
      .refine((n) => n % 5 === 0, "Weightage must be a multiple of 5%"),
  })
  .refine(
    (data) => {
      if (data.uomType === "timeline") return !!data.targetDate
      if (data.uomType === "zero") return true
      return data.targetValue !== undefined
    },
    {
      message: "Target value or date required for the selected unit of measurement",
      path: ["targetValue"],
    }
  )

export type GoalFormValues = z.infer<typeof GoalFormSchema>
