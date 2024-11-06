'use server'

import { revalidateTag } from "next/cache";

export async function revalidate() {
    try {
        console.log("revalidating");
        revalidateTag('collection');
    } catch {
        console.log("Erorr")
    }
    
}