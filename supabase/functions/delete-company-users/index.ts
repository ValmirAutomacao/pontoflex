import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { userIds } = await req.json()

        if (!userIds || !Array.isArray(userIds)) {
            throw new Error('userIds must be an array')
        }

        console.log(`Attempting to delete ${userIds.length} users...`)

        const results = []
        for (const uid of userIds) {
            const { data, error } = await supabaseClient.auth.admin.deleteUser(uid)
            if (error) {
                console.error(`Error deleting user ${uid}:`, error.message)
                results.push({ uid, success: false, error: error.message })
            } else {
                results.push({ uid, success: true })
            }
        }

        return new Response(
            JSON.stringify({ results }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            }
        )
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
            }
        )
    }
})
