import { Router, type Response } from "express";
import { authenticate } from "../middleware/auth";
import type { AuthRequest } from "../utils/types";
import { success } from "zod";
import { createservice, setAvailabilty } from "../utils/validation";
import { prisma } from "../../db";
import type { ServiceType } from "../../generated/prisma/enums";
import { format } from 'date-fns';




export const serviceRouter : Router = Router();

serviceRouter.post("/" , authenticate ,async  (req: AuthRequest ,res: Response) => {
    if(req.user!.role !=="SERVICE_PROVIDER"){
        return res.status(403).json({
            success: false,
            error: "FORBIDDEN",
            data: null
        })
    }

    const {success , data }= createservice.safeParse(req.body);
    if(!success){
        return res.status(400).json({
            success: false,
            error: "INVALID_SCHEMA",
            data: null
        })
    }

    if(data.durationMinutes %30 == 0) {
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

    const availability = await prisma.availabilty.create({
        data:{
            dayOfWeek : day!,
            startTime: data.starttime,
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
    try{
    const Type = req.params.type as ServiceType;
    if(!Type){
        return res.status(400).json({
            success: false,
            data: null,
            error:"INVALID_SERVICE_TYPE"
        })
    }

    const service = await prisma.service.findMany({
        where:{
            type: Type
        },
        select:{
            id: true , 
            name: true ,
            type: true,
            durationMinutes: true , 
            provider:{
                select:{
                    name: true
                }
            }
        }
    })

    return res.status(200).json({
        success: true , 
        data: service,
        error:null

    })
} catch(e){
    return res.status(500).json({
        success: false,
        data: null , 
        error: "INTERNAL_SERVICE_ERROR"
    })
}
})

serviceRouter.get("/:serviceId/slots" , authenticate ,async (req: AuthRequest ,res) => {
    try {
        const date = req.params.date;

        const serviceId = req.params.serviceId;

        if(!serviceId || !date){
            return res.status(400).json({
                success: false , 
                data: null , 
                error: "INVALID_DATE"
            })
        }

        const services = await prisma.service.findMany({
            where:{
                id: serviceId!as string,
                appointment:{
            
               }
            }
        })




    }catch(e){

    }
})  