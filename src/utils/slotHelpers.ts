
// HH:MM -- > minutes
export function getMinutes( t: string) {
    const [h,m] = t.split(":").map(Number);
    return h!*60 + m! ;

}

// minutes(number) --> HH:MM(string)
export function getTime(min: number) {
    const h = Math.floor(min/60).toString().padStart(2,"0");
    const m = (min % 60).toString().padStart(2, "0");
    return `${h}:${m}`
}