
import {  z } from "zod"

export const registerSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  password: z.string().min(6),
  role: z.enum(["USER", "SERVICE_PROVIDER"]),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string(),
});

export const createService = z.object({
  name : z.string().min(1),
  type:z.enum(["MEDICAL" , "HOUSE_HELP" , "BEAUTY" , "FITNESS" , "EDUCATION" , "OTHER"]),
  durationMinutes: z.number()
}).refine((data) => data.durationMinutes>=30 && data.durationMinutes <=120 )

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const setAvailabilty =z.object({
  dayOfWeek : z.number(),
  startTime: z.string().regex(timeRegex),
  endTime: z.string().regex(timeRegex)
}).refine((data) => {
  data.startTime < data.endTime,
  data.dayOfWeek>=0 && data.dayOfWeek <7
})



export const bookApp = z.object({
  slotId : z.string().min(1)
})

