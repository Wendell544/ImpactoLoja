import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_BYTES = 5 * 1024 * 1024;

Deno.serve(async (req) => {
  // Garante que o navegador consiga fazer o OPTIONS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    if (req.method !== 'POST') {
      return json({ error: 'Método não permitido.' }, 405);
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: 'Token ausente.' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Faltam variáveis de ambiente do Supabase.' }, 500);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: userData, error: userError } = await adminClient.auth.getUser(token);
    
    if (userError || !userData?.user) return json({ error: 'Sessão expirada. Faça login novamente.' }, 401);
    if (userData.user.app_metadata?.role !== 'admin') return json({ error: 'Acesso negado.' }, 403);

    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File) || file.type !== 'image/webp') return json({ error: 'Envie apenas arquivos WebP.' }, 415);
    if (file.size > MAX_BYTES) return json({ error: 'Arquivo muito grande (limite 5MB).' }, 413);

    const bytes = new Uint8Array(await file.arrayBuffer());
    const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
    const hashHex = Array.from(new Uint8Array(hashBuffer).slice(0, 8)).map((b) => b.toString(16).padStart(2, '0')).join('');
    const fileName = `i_${hashHex}.webp`;
    const path = `img/${fileName}`;

    const ghToken = Deno.env.get('GITHUB_TOKEN');
    const owner = Deno.env.get('GITHUB_OWNER') ?? 'wendell544';
    const repo = Deno.env.get('GITHUB_REPO') ?? 'ImpactoLoja';
    const branch = Deno.env.get('GITHUB_BRANCH') ?? 'main';

    // SE O TOKEN DO GITHUB ESTIVER FALTANDO, ELE RETORNA ERRO LIMPO (SEM QUEBRAR CORS)
    if (!ghToken) return json({ error: 'GITHUB_TOKEN não configurado nos secrets do Supabase.' }, 500);

    const ghHeaders = {
      Authorization: `Bearer ${ghToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Impacto-Upload',
    };

    const publicUrl = `https://${owner}.github.io/${repo}/img/${fileName}`;

    const checkRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`, { headers: ghHeaders });
    if (checkRes.ok) return json({ url: publicUrl, dup: true });

    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000) as any);
    }
    const base64 = btoa(bin);

    const putRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: { ...ghHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `upload: ${fileName}`, content: base64, branch }),
    });

    if (!putRes.ok) {
      const errText = await putRes.text();
      return json({ error: `Erro no GitHub: ${putRes.status} - ${errText}` }, 502);
    }

    return json({ url: publicUrl, dup: false });
  } catch (e: any) {
    return json({ error: `Erro inesperado: ${e.message}` }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { 
    status, 
    headers: { ...CORS, 'Content-Type': 'application/json' } 
  });
}
