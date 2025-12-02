import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
  try {
    const { twitter, telegram, designation } = await request.json()

    if (!twitter || !telegram || !designation) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error("Supabase credentials not configured")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { error } = await supabase
      .from("waitlist")
      .insert([{ twitter, telegram, designation }])

    if (error) {
      console.error("Supabase error:", error)
      throw new Error("Failed to save to database")
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Waitlist submission error:", error)
    return NextResponse.json({ error: "Failed to join waitlist" }, { status: 500 })
  }
}
