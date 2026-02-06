
import { Router } from "express";
import { authenticate } from "../middleware/auth"
import type { AuthRequest } from "../utils/types";
import { prisma } from "../../db";

export const providerRouter : Router = Router()

providerRouter.get("/me/schedule",authenticate,async (req: AuthRequest, res) => {
    try {
      // 1. Role check
        if (req.user!.role !== "SERVICE_PROVIDER") {
            return res.status(403).json({
            success: false,
            error: "FORBIDDEN",
            data: null,
            });
        }

        const providerId = req.user!.id;
        const date = req.query.date as string;

        // 2. Validate date format
        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({
            success: false,
            error: "INVALID_DATE_FORMAT",
            data: null,
            });
        }

      // 3. Fetch all services owned by provider
        const services = await prisma.service.findMany({
            where: {
            providerId,
            },
            select: {
            id: true,
            name: true,
            },
        });

        if (services.length === 0) {
            return res.status(200).json({
            success: true,
            error: null,
            data: {
                date,
                services: [],
            },
            });
        }

        const serviceIds = services.map((s) => s.id);

        // 4. Fetch all appointments for those services on that date
        const appointments = await prisma.appointment.findMany({
            where: {
            serviceId: {
                in: serviceIds,
            },
            date,
            },
            select: {
            id: true,
            serviceId: true,
            startTime: true,
            endTime: true,
            status: true,
            user: {
                select: {
                name: true,
                },
            },
            },
            // 5. Sort by startTime
            orderBy: {
            startTime: "asc",
            },
        });

        // 6. Group by service
        const grouped = services.map((service) => {
            const serviceAppointments = appointments
            .filter((a) => a.serviceId === service.id)
            .map((a) => ({
                appointmentId: a.id,
                userName: a.user.name,
                startTime: a.startTime,
                endTime: a.endTime,
                status: a.status,
            }));

            return {
            serviceId: service.id,
            serviceName: service.name,
            appointments: serviceAppointments,
            };
        });

        return res.status(200).json({
            success: true,
            error: null,
            data: {
            date,
            services: grouped,
            },
        });
        } catch (err) {
        console.error(err);

        return res.status(500).json({
            success: false,
            error: "INTERNAL_SERVER_ERROR",
            data: null,
        });
        }
    }
);
