// return simple response in deno

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(() => new Response("Hello World!"));
