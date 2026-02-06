import { Router, type Response } from "express";
import { authenticate } from "../middleware/auth";
import type { AuthRequest } from "../utils/types";

import { createService, setAvailabilty } from "../utils/validation";
import { prisma } from "../../db";
import { ServiceType } from "../../generated/prisma/enums";
import { getMinutes, getTime } from "../utils/slotHelpers";




export const serviceRouter : Router = Router();

serviceRouter.post("/" , authenticate ,async  (req: AuthRequest ,res: Response) => {
    if(req.user!.role !=="SERVICE_PROVIDER"){
        return res.status(403).json({
            success: false,
            error: "FORBIDDEN",
            data: null
        })
    }

    const {success , data }= createService.safeParse(req.body);
    if(!success){
        return res.status(400).json({
            success: false,
            error: "INVALID_SCHEMA",
            data: null
        })
    }

    if(data.durationMinutes %30 !== 0) {
        return res.status(400).json({
            success: false,
            error: "INVALID_SCHEMA",
            data: null
        })
    }

    const service = await prisma.service.create({
        data:{
            name:data.name,
            type:data.type,
            durationMinutes:data.durationMinutes,
            providerId: req.user?.id!,
        }

    })

    return res.status(201).json({
        success: true ,
        data: service
    })

})

serviceRouter.post("/:serviceId/availability" ,authenticate , async (req: AuthRequest , res) => {

    if(req.user!.role !=="SERVICE_PROVIDER"){
        return res.status(403).json({
            success: false,
            error: "FORBIDDEN",
            data: null
        })
    }

    const {success , data }= setAvailabilty.safeParse(req.body);
    if(!success){
        return res.status(400).json({
            success: false,
            error: "INVALID_SCHEMA",
            data: null
        })
    }
    let day
    if(data.dayOfWeek == 0) {
        day = "sunday"
    }
    if(data.dayOfWeek == 1){
        day = "monday"
    }
    if(data.dayOfWeek == 2) {
        day = "tuesday"
    }
    if(data.dayOfWeek == 3) {
        day = "wednesday"
    }
    if(data.dayOfWeek == 4) {
        day = "thursday"
    }
    if(data.dayOfWeek == 5) {
        day ="friday"
    }
    if(data.dayOfWeek == 6) {
        day = "saturday"
    }

    const checkServiceExists = await prisma.service.findUnique({
        where:{
            id: req.params.serviceId! as string,
            
        }
    })

    if(!checkServiceExists){
        return res.status(404).json({
            success: false ,
            data: null,
            error:"SERVICE_NOT_FOUND"
        })
    }



    if(checkServiceExists.providerId !== req.user?.id){
        return res.status(403).json({
            success: false ,
            data: null,
            error:"SERVICE_DOES_NOT_BELONG"
        })
    }

    const overlapping = await prisma.availabilty.findFirst({
        where:{
            serviceId: req.params.serviceId! as string,
            dayOfWeek: day,
            AND:[
                {
                    startTime: {lt : data.endTime}
                },{
                    endTime: {gt : data.startTime}
                }
            ]

        }
    })

    if(overlapping){
        return res.status(409).json({
            success: false,
            error: "OVERLAPPING_AVAILABILITY",
            data: null,
        });
    }

    const availability = await prisma.availabilty.create({
        data:{
            dayOfWeek : day!,
            startTime: data.startTime,
            endTime :data.endTime,
            serviceId: req.params.serviceId! as string
        }
    })

    return res.status(201).json({
        success: true,
        data: availability,
        error: null
    })

})

serviceRouter.get("/" , authenticate , async (req: AuthRequest , res) => {
    try {

        const type = req.query.type as ServiceType | undefined;
    
        
        if (type && !Object.values(ServiceType).includes(type)) {
            return res.status(400).json({
            success: false,
            data: null,
            error: "INVALID_SERVICE_TYPE",
        });
        }
    
        const services = await prisma.service.findMany({
        where: type
            ? {
                type: type,
            }
            : undefined,
        select: {
            id: true,
            name: true,
            type: true,
            durationMinutes: true,
            provider: {
                select: {
                    name: true,
                },
            },
        },
        });
    
    
        const response = services.map((s) => ({
            id: s.id,
            name: s.name,
            type: s.type,
            durationMinutes: s.durationMinutes,
            providerName: s.provider.name,
        }));
    
        return res.status(200).json(response);
    
    } catch (e) {
        return res.status(500).json({
            success: false,
            data: null,
            error: "INTERNAL_SERVER_ERROR",
        });
    }
})

serviceRouter.get("/:serviceId/slots" , authenticate ,async (req: AuthRequest ,res) => {
    try {
        const { serviceId } = req.params;
        const { date } = req.query as { date?: string };

        if (!date) {
            return res.status(400).json({
                success: false,
                data: null,
                error: "INVALID_DATE",
            });
        }

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/

        if (!dateRegex.test(date)) {
            return res.status(400).json({
                success: false,
                data: null,
                error: "INVALID_DATE",
            });
        }
    
        const service = await prisma.service.findUnique({
            where:{
                id: serviceId!as string,
            
            },select:{
                id: true,
                durationMinutes: true
            }
        })
        if (!service) {
            return res.status(404).json({
                success: false,
                data: null,
                error: "SERVICE_NOT_FOUND",
            });
        }
    
        // deriving day from date

        const jsDate = new Date(date + "T00:00:00");
        if (isNaN(jsDate.getTime())) {
            return res.status(400).json({
                success: false,
                data: null,
                error: "INVALID_DATE",
            });
        }

        
        const days = [
            "sunday",
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
        ] as const;

        const day = days[jsDate.getDay()];

        // checking the avilabilty
        const availability = await prisma.availabilty.findMany({
            where: {
                serviceId: serviceId as string ,
                dayOfWeek: day,
            },
        });
    
            if (availability.length === 0) {
                return res.status(200).json({
                serviceId,
                date,
                slots: [],
                });
            }

        // checking the appointment 

        const appointments = await prisma.appointment.findMany({
            where: {
                serviceId :serviceId as string,
                date,
                },
                select: {
                startTime: true,
                endTime: true,
                },
        });

        const slotLength = service.durationMinutes;

        const slots: {
            slotId: string;
            startTime: string;
            endTime: string;
        }[] = [];
        
        for ( const a of availability){
            let cursor = getMinutes(a.startTime);
            const end = getMinutes(a.endTime)


            while( cursor + slotLength <= end) {
                const slotStart = cursor;
                const slotEnd = cursor + slotLength;

                const hasOverlap = appointments.some((appt) => {
                    const apptStart = getMinutes(appt.startTime);
                    const apptEnd = getMinutes(appt.endTime);
        
                    return apptStart < slotEnd && apptEnd > slotStart;
                    });
                    
                    if (!hasOverlap) {
                        const startTime = getTime(slotStart);
                        const endTime = getTime(slotEnd);
            
                        slots.push({
                        slotId: `${serviceId}_${date}_${startTime}`,
                        startTime,
                        endTime,
                        });
                    }
            
                    cursor += slotLength;
            }
        }

        return res.status(200).json({
            serviceId,
            date,
            slots,
        });



    }catch(e){

        return res.status(500).json({
            success: false,
            data: null,
            error: "INTERNAL_SERVER_ERROR",
        });

    }
})  