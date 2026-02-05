import { format } from "date-fns";
import { startsWith, z } from "zod";
import { _isoDuration } from "zod/v4/core";

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

export const createservice = z.object({
  name : z.string().min(1),
  type:z.enum(["MEDICAL" , "HOUSE_HELP" , "BEAUTY" , "FITNESS" , "EDUCATION" , "OTHER"]),
  durationMinutes: z.number()
}).refine((data) => data.durationMinutes>=30 && data.durationMinutes <=120 )

export const setAvailabilty =z.object({
  dayOfWeek : z.number(),
  startTime: z.string(),
  endTime: z.string()
}).refine((data) => {
  data.startTime = format(data.startTime , "HH:mm");
  data.endTime = format(data.endTime , "HH:mm")
})

