import type { NextRequest } from "next/server";
import { transitionMarketplaceListing } from "@yinne/marketplace";
import { apiRoute } from "../../../../../../lib/api";
export function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}) { return apiRoute(request,async(context)=>({listing:await transitionMarketplaceListing(context,(await params).id,"archived")})); }
