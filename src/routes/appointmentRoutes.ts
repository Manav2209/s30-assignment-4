import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { bookApp } from "../utils/validation";
import type { AuthRequest } from "../utils/types";
import { prisma } from "../../db";
import { success } from "zod";


const appointmentRouter : Router = Router();

appointmentRouter.post("/" , authenticate ,async (req : AuthRequest,res) => {
    try {
        // Only USER can book
        if (req.user!.role !== "USER") {
          return res.status(403).json({
            success: false,
            error: "FORBIDDEN",
            data: null,
          });
        }
    
        const parsed = bookApp.safeParse(req.body);
    
        if (!parsed.success) {
          return res.status(400).json({
            success: false,
            error: "INVALID_SCHEMA",
            data: null,
          });
        }
    
        const { slotId } = parsed.data;
    
        /**
         * slotId format:
         * serviceId_YYYY-MM-DD_HH:mm
         */
        const parts = slotId.split("_");
    
        if (parts.length !== 3) {
            return res.status(400).json({
                success: false,
                error: "INVALID_SLOT_ID",
                data: null,
            });
        }
    
        const [serviceId, datePart, timePart] = parts;
    
        // Validate HH:mm
        if (!/^\d{2}:\d{2}$/.test(timePart!)) {
            return res.status(400).json({
                success: false,
                error: "INVALID_SLOT_TIME",
                data: null,
            });
        }
    
        const startTime = timePart;
    
        // Only used for validation & end-time calculation
        const startAt = new Date(`${datePart}T${startTime}:00`);
    
        if (isNaN(startAt.getTime())) {
            return res.status(400).json({
                success: false,
                error: "INVALID_SLOT_TIME",
                data: null,
            });
        }
    
        const appointment = await prisma.$transaction(async (tx) => {
          // 1. Re-derive slot → service
            const service = await tx.service.findUnique({
                where: { id: serviceId },
                select: {
                id: true,
                providerId: true,
                durationMinutes: true,
                },
            });
    
            if (!service) {
                throw new Error("SERVICE_NOT_FOUND");
            }
        
            // 2. Service provider can't book own service
            if (service.providerId === req.user!.id) {
                throw new Error("SELF_BOOKING");
            }
    
          // 3. Validate availability (basic: future slot)
            const now = new Date();
            if (startAt <= now) {
                throw new Error("PAST_SLOT");
            }
    
          // 4. Ensure slot not booked
            const already = await tx.appointment.findUnique({
                where: { slotId },
                select: { id: true },
            });
    
            if (already) {
                throw new Error("ALREADY_BOOKED");
            }
    
          // 5. Compute endTime (HH:mm)
            const endDate = new Date(
                startAt.getTime() + service.durationMinutes * 60 * 1000
            );
    
            const endTime = endDate.toTimeString().slice(0, 5);
    
          // 6. Create appointment
            return tx.appointment.create({
                data: {
                slotId,
                serviceId: service.id,
                userId: req.user!.id,
                date: datePart!,     // "YYYY-MM-DD"
                startTime: startTime as string,          // "HH:mm"
                endTime,            // "HH:mm"
                status: "BOOKED",
                },
            });
        });
    
        return res.status(201).json({
            success: true,
            error: null,
            data: {
                id: appointment.id,
                slotId: appointment.slotId,
                status: appointment.status,
            },
        });
        } catch (err: any) {
        if (err.message === "SERVICE_NOT_FOUND") {
            return res.status(400).json({
                success: false,
                error: "INVALID_SLOT_ID",
                data: null,
            });
            }
    
        if (err.message === "SELF_BOOKING") {
            return res.status(403).json({
                success: false,
                error: "FORBIDDEN",
                data: null,
            });
        }
    
        if (err.message === "PAST_SLOT") {
            return res.status(400).json({
                success: false,
                error: "INVALID_SLOT_TIME",
                data: null,
            });
        }
    
        if (err.message === "ALREADY_BOOKED" || err.code === "P2002") {
            return res.status(409).json({
                success: false,
                error: "SLOT_ALREADY_BOOKED",
                data: null,
            });
        }
    
        console.error(err);
    
        return res.status(500).json({
            success: false,
            error: "INTERNAL_SERVER_ERROR",
            data: null,
        });
        }
})

appointmentRouter.get("/me" , authenticate , async (req: AuthRequest , res) => {
    try{
    const userId = req.user?.id;

    const appointment = await prisma.appointment.findMany({
        where:{
            userId: userId
        },
        select:{
            startTime:true ,
            endTime: true,
            date:true,
            status:true,
            service:{
                select:{
                    name: true,
                    type:true
                }
            }
        }
    })

    return res.status(200).json({
        success:true,
        data:appointment,
        error: null
    })
    }catch(e){
        return res.status(500).json({
            success:false,
            data:null,
            error: "INTERNAL_SERVER_ERROR"
        })

    }
})